# ADR-0021 — Email transaccional como canal complementario al push

## Contexto

Hasta acá, todas las notificaciones de QueueLess salen por push (FCM, ver
ADR-0016). Para el día a día del producto está bien: el cliente abre la app,
recibe "tu pedido fue aceptado", "tu pedido está listo", y listo. La push es la
mejor experiencia en mobile y la principal vía de comunicación tanto con
clientes como con repartidores.

Pero hay dos momentos donde la push se queda corta:

- **Confirmación de registro.** El usuario se acaba de dar de alta. La push de
  bienvenida le llega al instante, sí, pero no le queda nada en el buzón. Si
  mañana quiere recuperar el correo con el que se registró, o probar que la
  cuenta existe, no tiene dónde mirar. Es una comunicación formal que se
  espera que viva en el mail.
- **Recibo del pedido entregado.** El cliente acaba de retirar la comida (o el
  repartidor se la dejó). La push de "Entregado" le sirve para enterarse en el
  momento, pero el comprobante con los items, el total y la fecha tiene
  utilidad de archivo: para reclamar después al local, para reembolsar el gasto
  en el trabajo, para revisar el historial fuera de la app. Eso vive en el
  buzón.

La pregunta de diseño es: **¿cómo sumamos correo a estos dos casos sin volverlo
una dependencia dura del flujo de negocio?** Si el registro de un usuario se
cayera porque Gmail rechazó la conexión SMTP, sería un absurdo. Lo mismo si la
transición de un pedido a `ENTREGADO` se rollbackeara porque AWS SES tuvo un hipo.

Este ADR fija cómo agregamos el canal correo manteniéndolo complementario al
push: misma infraestructura asíncrona, mismo manejo best-effort, sin tocar la
ruta caliente del negocio.

## Decisión

Sumamos un servicio de email para dos correos transaccionales — bienvenida y
recibo de pedido entregado — usando `spring-boot-starter-mail` sobre el mismo
`ThreadPoolTaskExecutor` que ya usan los listeners de push y queuepoints.

Concretamente:

### Dos eventos, dos listeners, un servicio

- `UsuarioRegistradoEvent` es nuevo: lo publica `AuthService.register` al final
  del alta, con el id del usuario. `UsuarioRegistradoEmailListener` lo
  consume, carga el usuario y llama a `EmailService.sendBienvenida(usuario)`.
- `PedidoEstadoCambiadoEvent` ya existe (ver ADR-0009).
  `PedidoEntregadoEmailListener` lo consume, filtra por `estadoNuevo ==
  ENTREGADO`, carga el pedido (con sus items, dentro de una transacción
  read-only para que las relaciones lazy carguen sin
  `LazyInitializationException`) y llama a `EmailService.sendRecibo(pedido)`.

Los dos listeners siguen el mismo patrón que el resto del proyecto
(ADR-0009): `@Async("queuelessTaskExecutor")` + `@TransactionalEventListener`
en fase `AFTER_COMMIT` (default). Eso garantiza que el correo solo se intenta
mandar si la transacción del negocio ya se commiteó, y que el thread que
atiende el request HTTP no se queda esperando al SMTP.

### `EmailService` como fachada tolerante

`EmailService` resuelve el `JavaMailSender` con un
`ObjectProvider<JavaMailSender>`, igual que `NotificationService` resuelve el
adapter de Firebase (ADR-0016). La lógica:

```java
JavaMailSender sender = mailSenderProvider.getIfAvailable();
if (sender == null) {
    log.info("[EMAIL DEV] {} -> {}", destinatario, asunto);
    return;
}
try {
    MimeMessage mensaje = sender.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(
        mensaje, false, StandardCharsets.UTF_8.name());
    helper.setFrom(from, fromName);
    helper.setTo(destinatario);
    helper.setSubject(asunto);
    helper.setText(cuerpoHtml, true);
    sender.send(mensaje);
} catch (MailException | MessagingException | UnsupportedEncodingException ex) {
    log.warn("No se pudo enviar el correo a {}: {}", destinatario, ex.getMessage());
}
```

Si la propiedad `spring.mail.host` está vacía (caso default en dev y test),
Spring no crea el bean `JavaMailSender` y el `ObjectProvider` devuelve
`null`. El servicio loguea en `INFO` con prefijo `[EMAIL DEV]` y termina. Si
el bean está pero el envío falla (smtp caído, credenciales mal, lo que sea),
la excepción se atrapa, queda un `WARN` en el log con la causa, y el método
retorna normal. Ni el flujo de registro ni el de entrega del pedido se ven
afectados.

### Plantillas HTML con `String.format`

Los correos son HTML simples vivos en `PlantillasCorreo`, como constantes
multilínea (text blocks de Java), con placeholders `%s` rellenados por
`String.format`. **No agregamos Thymeleaf** ni ningún motor de templates: para
dos correos cortos es una dependencia que no se justifica.

Los valores que vienen del usuario (nombre completo, nombre del producto,
código del pedido) se pasan por `HtmlUtils.htmlEscape` antes de inyectarse en
el template. Eso elimina la posibilidad de inyección de HTML/JS si alguien se
registra con un `nombreCompleto` malicioso del estilo
`<script>alert(1)</script>`: en el cuerpo del correo aparece como texto
inofensivo escapado.

### SMTP configurado por variables de entorno

`application.yml` declara el bloque `spring.mail.*` enteramente sobre variables
de entorno:

```yaml
spring:
  mail:
    host: ${MAIL_HOST:}
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true
          connectiontimeout: 5000
          timeout: 5000
          writetimeout: 5000
queueless:
  email:
    from: ${MAIL_FROM:no-reply@queueless.local}
    from-name: ${MAIL_FROM_NAME:QueueLess}
```

En **dev** dejamos las variables sin definir; el servicio queda en modo `[EMAIL
DEV]`. Si alguien quiere probar el flujo real en local, configura
`MAIL_HOST=smtp.gmail.com` + un *App Password* de Gmail, o apunta a un buzón
de pruebas tipo Mailtrap. En **prod** usamos AWS SES (o el SMTP que provea el
hosting); las credenciales viven en Secrets Manager y se inyectan a la task
de ECS por variables de entorno (ADR-0010).

Los *timeouts* (5 segundos cada uno) están fijos para que un SMTP lento no
deje threads del executor colgados. El thread pool tiene 16 threads máximo
(ADR-0009, `AsyncConfig`): si el SMTP queda colgado 5 minutos por mensaje, un
lote de pedidos entregados consume todos los threads y se traba todo el
canal asíncrono. Cinco segundos es agresivo pero seguro.

### Asimetría buscada con el push

A diferencia de FCM, **el email no corta el arranque** cuando falta la
configuración. La razón es la asimetría de criticidad:

- El push es la vía principal de comunicación con clientes y repartidores. Si
  en producción está mal configurado, el producto se vuelve inusable. Por eso
  ADR-0016 corta el arranque (fail-fast).
- El email es un complemento. Si no está configurado, el cliente igual se
  registra y igual recibe la push de "Entregado". Lo que pierde es el
  comprobante en el buzón, que es nice-to-have. No vale la pena romper el
  arranque por eso.

Por eso `EmailService` se autodeshabilita en silencio (con un `INFO`, que
sigue siendo visible en cualquier dashboard de logs), en lugar de gritar
durante el `@PostConstruct` como hace `FirebaseMessagingAdapter`.

### Sin idempotencia explícita, igual que el push

Una reentrega del evento mandaría el correo dos veces. No agregamos
deduplicación, por el mismo razonamiento que en ADR-0016: un correo de
bienvenida o un recibo duplicado son una molestia menor, no un problema de
consistencia de datos. Si la reentrega resulta frecuente y los usuarios se
quejan, evaluamos una tabla `correo_enviado` con `(usuario_id, tipo)` única.

## Por qué email complementario y no email reemplazando push

Es la pregunta natural: si vamos a sumar email, ¿por qué no usarlo para todo y
sacarse FCM de encima?

- **Latencia.** Una push llega en milisegundos. Un correo llega en segundos o
  minutos, depende del proveedor y de los filtros del cliente. Para "tu pedido
  está listo, pasá a retirar", la diferencia es entre que el cliente vaya o no
  vaya. No es lo mismo "buscando repartidor, tenés 4 minutos" si el aviso le
  llega cuando ya se cumplieron.
- **Frecuencia tolerada.** Un pedido típico genera 5 a 8 transiciones de
  estado. Cinco a ocho correos por pedido entrando al buzón del cliente serían
  spam. Las push están pensadas para esa frecuencia; el correo no.
- **Comportamiento del usuario.** El cliente mira la app cuando hizo un
  pedido. No mira el mail en tiempo real. La pantalla de seguimiento del
  pedido (que se actualiza con push) es la UX correcta. El correo solo
  agrega valor para las dos comunicaciones formales que pide este ADR.

Por eso elegimos sumar y no reemplazar. El email cubre lo que la push no
puede dar (archivo, formalidad, búsqueda en el buzón); la push sigue cubriendo
lo que el email no puede dar (inmediatez, integración con la app, cero
fricción).

## Por qué `String.format` y no Thymeleaf

Thymeleaf es lo estándar para templates HTML en Spring. Lo evaluamos y
descartamos para este caso:

- Tenemos **dos** templates. Thymeleaf agrega una dependencia, una
  configuración, un mecanismo de resolución de recursos, y un lenguaje propio
  (`th:text`, `th:each`) para resolver dos archivos. La razón de costo/beneficio
  no cierra.
- Las plantillas son estáticas: un poco de texto, un saludo, una tabla. No
  necesitan if/else condicionales, no necesitan iteración compleja: la única
  iteración es la lista de items del pedido, que armamos con un `for` corto en
  Java.
- `String.format` con text blocks de Java 21 es legible. El que escriba un
  template nuevo no necesita aprender otra cosa.

Si en el futuro QueueLess suma 5 o 10 correos transaccionales más
(promociones, alertas administrativas, recordatorios), el cálculo cambia y
Thymeleaf vuelve a ser razonable. Hoy no.

## Por qué dos listeners separados y no uno que cubra ambos

Podríamos tener un único `EmailListener` con dos métodos, uno por evento. Lo
descartamos por dos motivos:

- Cada listener tiene precondiciones distintas (uno necesita una transacción
  read-only para los items lazy, el otro no) y filtros distintos. Mezclarlos
  esconde esas diferencias.
- Los listeners siguen el patrón "una clase, una reacción" que ya usa el resto
  del proyecto (`PedidoNotificationListener`, `EntregaCompletadaListener`,
  `PagoListener`, `CrearSolicitudDeliveryListener`). Romper esa convención
  solo para ahorrar un archivo no compensa.

## Alternativas consideradas

### Alternativa 1 — Reemplazar push por email

Mandar todo por correo y eliminar FCM. Descartada por las razones de latencia,
frecuencia y comportamiento del usuario explicadas arriba. Para QueueLess, la
push es central.

### Alternativa 2 — Cortar el arranque si SMTP no está configurado en prod

Aplicar la misma política de `fail-fast` que con FCM. Descartada porque el
email es complementario, no central: la asimetría de criticidad justifica una
política más laxa. Un usuario sin recibo de pedido entregado igual tiene el
historial dentro de la app.

### Alternativa 3 — Sincrónico dentro de la transacción del registro/entrega

Mandar el correo en el mismo `register()` o `cambiarEstado()` sin async, sin
listener. Descartada porque mete latencia de red en la ruta caliente del
negocio (el `register` espera al SMTP antes de devolver 201) y porque
acopla el módulo `auth`/`pedido` con `email`. El patrón eventos + async ya
está y resuelve los dos problemas.

### Alternativa 4 — Cola persistente externa (RabbitMQ, SQS) para el correo

Encolar el envío en un broker externo para tener reintentos automáticos si el
SMTP falla. Descartada al MVP, por las mismas razones que ADR-0009 descartó un
broker para los eventos de pedido: infraestructura extra que no se justifica
todavía. Si los warns de fallo de SMTP empiezan a aparecer seguido, lo
reconsideramos.

### Alternativa 5 — Thymeleaf para los templates

Ya cubierto arriba: dos templates estáticos no justifican la dependencia.

## Consecuencias

### Positivas

- **Comprobantes formales en el buzón del cliente.** Cuenta de usuario y
  recibo del pedido entregado quedan en el correo, útiles para reclamos,
  reembolsos y archivo personal.
- **Cero impacto en la ruta caliente.** El registro y la transición a
  `ENTREGADO` no esperan al SMTP. Si el correo nunca sale, el flujo del
  negocio igual completa.
- **Dev y test sin fricción.** Sin `MAIL_HOST`, el servicio se autodeshabilita
  y deja un log. Nadie necesita un buzón de pruebas para arrancar el proyecto.
- **Patrón reutilizado.** Misma fachada con `ObjectProvider`, mismo executor,
  mismo `@TransactionalEventListener`. El que ya entiende el push entiende el
  email.
- **Sin nuevas dependencias pesadas.** Solo `spring-boot-starter-mail`, que
  ya viene con Spring Boot. No agregamos Thymeleaf ni motor de templates.

### Negativas

- **Posibles correos duplicados.** Sin idempotencia, una reentrega del evento
  manda el correo dos veces. Mitigación: documentado, bajo impacto, fácil de
  resolver si molesta.
- **Dependencia adicional de un proveedor SMTP en prod.** Hay que mantener
  configuradas las credenciales y rotarlas si se filtran. Mitigación: viven
  en Secrets Manager (ADR-0010), no en el código.
- **Latencia desconocida y variable del correo.** A diferencia de FCM, no
  controlamos cuándo el correo llega al buzón (depende de SES, del MTA del
  destinatario, de filtros antispam). No es problema porque los dos casos no
  son sensibles al tiempo, pero hay que asumirlo.

### Riesgos

- **Credenciales SMTP filtradas.** Permitirían a un tercero mandar correos en
  nombre de QueueLess (phishing). Mitigación: viven solo en variables de
  entorno del servidor, nunca en el código ni en `.env.example`; se rotan
  desde la consola del proveedor si se filtran.
- **Threads del executor colgados por un SMTP lento.** Si los timeouts no
  alcanzan o el SMTP responde lento sin cerrar, los threads del executor se
  consumen y se atrasan también las push y otros listeners. Mitigación:
  timeouts de 5s configurados en las properties de `mail.smtp`.
- **Correo va a spam del destinatario.** Sin SPF/DKIM/DMARC configurados en
  el dominio del `from`, los proveedores grandes (Gmail, Outlook) marcan el
  correo como spam. Mitigación: configurar los registros DNS cuando se
  apunte a un dominio real; en producción, el equipo de infra los agrega
  junto con el dominio.
- **Inyección de HTML en el cuerpo del correo.** Si el nombre del usuario o
  del producto se inyectara sin escapar, alguien podría meter código en el
  correo que reciben otros (vector de phishing convincente con dominio
  legítimo). Mitigación: `HtmlUtils.htmlEscape` sobre todo valor del usuario
  antes de inyectarlo en el template; el `EmailServiceTest` valida el
  escape con un caso `<script>alert(1)</script>`.

## Anexo — Glosario de términos técnicos

**SMTP (Simple Mail Transfer Protocol).** Protocolo estándar para mandar
correos electrónicos entre servidores. El backend no entrega los correos
directamente al destinatario: se los entrega a un servidor SMTP (Gmail, AWS
SES, Mailtrap, etc.) y ese servidor se encarga de hacérselos llegar.

Ejemplo concreto: el `EmailService` de QueueLess se conecta al SMTP de SES
en `email-smtp.us-east-1.amazonaws.com:587`, autenticándose con las
credenciales de la variable `MAIL_USERNAME` / `MAIL_PASSWORD`. SES después le
entrega el correo al servidor del destinatario (`gmail.com`, por ejemplo).

**App Password (de Gmail).** Contraseña de un solo uso que Google genera para
permitir que aplicaciones de terceros (no navegador) se autentiquen en una
cuenta de Gmail con verificación en dos pasos activada. No es la contraseña
real del usuario; se puede revocar individualmente sin tocar la principal.

Ejemplo concreto: en dev, para probar el envío con una cuenta de Gmail
personal, se genera una *App Password* en
[https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
y se usa en `MAIL_PASSWORD`. Es lo recomendado en lugar de habilitar "less
secure apps".

**AWS SES (Simple Email Service).** Servicio de Amazon para envío de correos
en producción. Más barato que SMTP comercial, con buena reputación de IP
(menos chance de caer en spam), y configurable con SPF/DKIM. La interfaz que
el backend usa es la misma de cualquier SMTP, así que el código no cambia
entre Gmail (dev) y SES (prod): solo cambian las variables de entorno.

**MIME (Multipurpose Internet Mail Extensions).** Estándar para correos que
soporten algo más que texto plano: HTML, imágenes, adjuntos, encoding de
caracteres no-ASCII. `MimeMessage` y `MimeMessageHelper` de Spring son la
forma estándar de armar un correo HTML; sin MIME, los caracteres acentuados
(`ñ`, `é`) y el formato HTML quedarían rotos.

**Best-effort.** Garantía de "se intenta lo mejor posible, pero si no se
logra, no es un error fatal". Lo opuesto a una operación que debe completarse
sí o sí. Ya está definido en el glosario de ADR-0016; lo citamos para que
quede claro que es el mismo criterio.

Ejemplo concreto: si SES devuelve `554 Message rejected`, el `EmailService`
loguea el warn, descarta el correo y devuelve normalmente. El pedido del
cliente igual quedó entregado; perder un recibo es molestia, no un error que
deba revertir la transacción del pedido.

**`HtmlUtils.htmlEscape`.** Utilidad de Spring que reemplaza los caracteres
con significado en HTML (`<`, `>`, `&`, `"`, `'`) por sus entidades
escapadas (`&lt;`, `&gt;`, etc.). Es la defensa estándar contra inyección de
HTML en un cliente de correo o un navegador.

Ejemplo concreto: si un atacante se registra con
`nombreCompleto = "Ana <script>alert(1)</script>"`, el correo de bienvenida
muestra literalmente `Ana &lt;script&gt;alert(1)&lt;/script&gt;` como texto,
sin que el cliente de correo del destinatario lo interprete como código.

## Referencias

- ADR-0009 — Eventos de dominio (patrón `@TransactionalEventListener` + `@Async`
  que reusamos para los listeners de correo).
- ADR-0010 — Postgres puerto y env (convención de variables de entorno,
  origen de `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD`).
- ADR-0016 — Notificaciones push con Firebase (canal complementario al
  correo; este ADR lo cita varias veces para contraste).
- `backend/pom.xml` — dependencia `spring-boot-starter-mail`.
- `backend/src/main/resources/application.yml` — bloque `spring.mail` y
  `queueless.email`.
- `backend/src/main/java/pe/edu/utec/queueless/notification/email/EmailService.java`
  — fachada con `ObjectProvider<JavaMailSender>`.
- `backend/src/main/java/pe/edu/utec/queueless/notification/email/PlantillasCorreo.java`
  — plantillas HTML.
- `backend/src/main/java/pe/edu/utec/queueless/notification/email/UsuarioRegistradoEmailListener.java`
  — listener del correo de bienvenida.
- `backend/src/main/java/pe/edu/utec/queueless/notification/email/PedidoEntregadoEmailListener.java`
  — listener del recibo de pedido entregado.
- `backend/src/main/java/pe/edu/utec/queueless/usuario/event/UsuarioRegistradoEvent.java`
  — evento del alta de usuario.
- `backend/src/test/java/pe/edu/utec/queueless/notification/email/EmailServiceTest.java`
  — tests de los tres escenarios (enviado, deshabilitado, error de SMTP).
