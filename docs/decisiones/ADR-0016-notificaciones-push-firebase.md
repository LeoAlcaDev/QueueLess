# ADR-0016 — Notificaciones push con Firebase Cloud Messaging

## Contexto

QueueLess promete avisarle al cliente cada vez que su pedido cambia de estado:
"tu pedido fue aceptado", "tu pedido está listo", "no encontramos repartidor".
Esos avisos llegan como notificaciones push al celular. Para mandarlas usamos
Firebase Cloud Messaging (FCM), el servicio de Google para enviar push a apps
Android e iOS.

Al arrancar la Fase 6, el módulo `notification/` ya tenía la estructura puesta de
fases anteriores:

- `NotificationService` es la fachada por la que todo el sistema manda push. Ya
  está funcional: resuelve el adapter de FCM como opcional y, si no está, deja un
  mensaje en el log con el prefijo `[NOTIF DEV]`.
- `FirebaseMessagingAdapter` es el cliente de FCM. Hoy su método `send` solo
  loggea; la inicialización real de Firebase es el `TODO` que cierra esta fase.
- `PedidoNotificationListener` escucha los cambios de estado del pedido. Hoy
  manda un mensaje genérico; el `TODO` es armar el mensaje específico según el
  estado nuevo.
- `PushNotification` es el objeto que viaja con el `topic`, el título, el cuerpo
  y un mapa de datos extra.

Otros componentes del sistema ya mandan push a través de esta fachada: el job de
timeout de búsqueda de repartidor avisa al cliente, y el matcher de repartidores
avisa a los repartidores disponibles. O sea, la fachada y el patrón ya se usan;
lo que falta es prender FCM de verdad y darle al listener del pedido su catálogo
de mensajes.

Este ADR fija cómo se inicializa FCM, cómo se comporta el sistema cuando las push
no están activadas o están mal configuradas, qué mensaje corresponde a cada
estado del pedido, y qué garantías damos (y cuáles no) sobre la entrega. El patrón
de listeners (`@TransactionalEventListener` después del commit + `@Async`) está en
el ADR-0009 y no lo redocumentamos: acá lo aplicamos y lo citamos.

## Decisión

### El adapter de FCM solo existe si las push están activadas

`FirebaseMessagingAdapter` está anotado con
`@ConditionalOnProperty(name = "queueless.firebase.enabled", havingValue = "true")`.
Eso significa que el bean solo se crea si esa propiedad vale `true`. En dev y en
los tests, donde `queueless.firebase.enabled` es `false`, el bean ni siquiera
existe en el contexto de Spring. En producción, donde vale `true`, el bean se
crea y se conecta con FCM al arrancar.

### `NotificationService` como fachada tolerante

`NotificationService` no depende del adapter de forma directa, sino a través de un
`ObjectProvider<FirebaseMessagingAdapter>` (ver glosario). El `ObjectProvider` es
un envoltorio de Spring que permite pedir un bean "si existe", sin fallar cuando
no está. La lógica es:

```java
FirebaseMessagingAdapter fcm = firebaseProvider.getIfAvailable();
if (fcm == null) {
    log.info("[NOTIF DEV] {} -> {} ({})", ...);
    return;
}
fcm.send(notification);
```

Si el adapter no está (dev/test), la fachada deja el aviso en el log con el
prefijo `[NOTIF DEV]` y termina. Si está (producción), delega el envío. Esto ya
está implementado; lo documentamos como decisión consciente, no como código
nuevo. La ventaja es que todo el resto del sistema llama a
`notificationService.notificar(...)` sin enterarse de si hay FCM detrás o no: el
flujo de negocio es idéntico en dev y en prod, solo cambia si el push sale de
verdad o queda en el log.

### Inicialización de Firebase al arrancar el adapter

Cuando el adapter se carga (solo en producción), inicializa Firebase una sola vez
en un método anotado con `@PostConstruct` (ver glosario), que Spring ejecuta
apenas termina de armar el bean:

1. Lee las credenciales del *service account* de Google Cloud (ver glosario), que
   vienen en formato base64 (ver glosario) en la propiedad
   `queueless.firebase.credentials-base64`. En producción esa propiedad se llena
   con la variable de entorno `FIREBASE_CREDENTIALS_JSON` (la convención de
   variables de entorno está en el ADR-0010).
2. Decodifica el base64 para recuperar el JSON original del service account.
3. Llama a `FirebaseApp.initializeApp(FirebaseOptions.builder().setCredentials(...).build())`
   con esas credenciales.

Guardar las credenciales como base64 en una sola variable de entorno evita tener
que manejar un archivo de credenciales en el servidor (que habría que montar,
versionar con cuidado y proteger). Una variable de entorno es más simple de
inyectar en cualquier plataforma de hosting.

### Qué pasa si faltan o no parsean las credenciales

Si la variable está vacía o el contenido no es un base64 válido / no es un JSON de
service account que Firebase acepte, el `@PostConstruct` lanza una
`IllegalStateException` con un mensaje accionable: dice qué variable de entorno
revisar (`FIREBASE_CREDENTIALS_JSON`) y qué formato se espera (el JSON del service
account, codificado en base64). Esa excepción corta el arranque del backend.

Esto es a propósito. En producción, donde las push son funcionalidad visible del
producto, preferimos que el backend **falle al arrancar** (lo que en la jerga se
llama *fail-fast*; ver glosario) antes que levantar como si todo estuviera bien y
después no mandar ninguna notificación sin que nadie se entere. El detalle de por
qué elegimos cortar el arranque está en la sección siguiente.

### Convención de nombres de topics

FCM entrega los mensajes a *topics* (ver glosario): canales a los que la app del
cliente se suscribe. QueueLess usa tres:

| Topic | A quién | Para qué |
|---|---|---|
| `cliente-{usuarioId}` | El cliente dueño del pedido | Todas las notificaciones del pedido. Es el canal principal y al que la app móvil se suscribe siempre que el cliente está logueado. |
| `pedido-{pedidoId}` | Quien esté mirando ese pedido | Pantalla de seguimiento en vivo. La app puede suscribirse de forma puntual mientras el cliente tiene el pedido abierto, y desuscribirse al salir. |
| `solicitud-delivery-{usuarioId}` | Los repartidores disponibles | Avisos de solicitudes de entrega nuevas. Lo usa el matcher de repartidores desde la Fase 5. |

Los dos primeros (`cliente-` y `pedido-`) tienen un solapamiento potencial: una
misma novedad del pedido podría salir por ambos. Lo dejamos así a propósito.
`cliente-` cubre el caso del cliente que no tiene la pantalla del pedido abierta
(igual recibe el aviso), y `pedido-` cubre el caso de la pantalla de seguimiento
en vivo, donde la app se limita a una suscripción puntual a ese pedido. Si en el
futuro vemos que un mismo dispositivo recibe la notificación duplicada, evaluamos
consolidar en uno solo. El catálogo de mensajes del pedido (más abajo) usa el
canal `cliente-{usuarioId}`.

### El listener traduce el estado del pedido a un mensaje concreto

`PedidoNotificationListener` reacciona al evento `PedidoEstadoCambiadoEvent` y, por
cada cambio relevante, manda una push al cliente con el texto que corresponde al
estado nuevo. Carga el pedido para obtener el id de su cliente y armar el topic
`cliente-{usuarioId}`. Los textos van en castellano natural, voseando como el
resto del producto:

| Estado nuevo | Título | Cuerpo |
|---|---|---|
| `PAGADO_BUSCANDO_REPARTIDOR` | Buscando repartidor | Te avisamos en cuanto alguien tome tu pedido. Tenés 4 minutos. |
| `PAGADO_ESPERANDO_COMERCIO` | Pago confirmado | El local ya puede aceptar tu pedido. |
| `ACEPTADO` | Tu pedido fue aceptado | El local empezó a preparar lo que pediste. |
| `EN_PREPARACION` | En preparación | Estamos preparando tu pedido. |
| `LISTO_PARA_RECOGER` | Tu pedido está listo | Pasá a recoger por el local cuando puedas. |
| `LISTO_PARA_DELIVERY` | Listo para entregar | El repartidor lo va a recoger en breve. |
| `ENTREGADO` | Entregado | Gracias por usar QueueLess. ¿Querés dejar una reseña? |
| `CANCELADO_POR_CLIENTE` (salvo desde `PENDIENTE_PAGO`) | Pedido cancelado | Cancelamos tu pedido. Si pagaste, recibís el reembolso pronto. |
| `CANCELADO_POR_COMERCIO` | Cancelado por el local | Lamentamos los inconvenientes. Si pagaste, recibís el reembolso pronto. |
| `EXPIRADO` | Pedido expirado | No se recogió a tiempo. Hablá con el local si necesitás algo. |

### Estados que no generan notificación

Dos transiciones no mandan push, y el listener las filtra al principio y termina
sin hacer nada:

- **`PENDIENTE_PAGO`**: el cliente está en la app, en la pantalla de pago.
  Mandarle una push de "estás pagando" no aporta nada.
- **`CANCELADO_POR_CLIENTE` que viene desde `PENDIENTE_PAGO`**: el cliente acaba
  de cancelar él mismo, manualmente, antes de pagar. Ya lo sabe; avisarle de algo
  que acaba de hacer es ruido.

El segundo caso es la razón por la que la fila de `CANCELADO_POR_CLIENTE` en la
tabla dice "salvo desde `PENDIENTE_PAGO`". Para distinguirlo, el listener mira el
estado anterior del evento: si el pedido venía de `PENDIENTE_PAGO`, no notifica;
si venía de un estado pagado (`PAGADO_BUSCANDO_REPARTIDOR` o
`PAGADO_ESPERANDO_COMERCIO`), sí, porque ahí el cliente tenía plata comprometida y
le importa enterarse del reembolso. El evento `PedidoEstadoCambiadoEvent` trae el
estado anterior además del nuevo, así que el filtro es directo.

### Por qué un catálogo y no textos sueltos en el listener

Los pares título/cuerpo viven centralizados en un mapa
`Map<EstadoPedido, PlantillaMensaje>` (puede ser un enum o una clase de
constantes), no escritos a mano dentro del listener. Las ventajas:

- Cambiar un texto es tocar el catálogo, no la lógica del listener.
- Habilita un test futuro que recorra los estados que sí notifican y verifique que
  cada uno tiene su plantilla, de modo que si alguien agrega un estado a la
  máquina y se olvida del mensaje, el test lo agarra.

### Errores de envío: el push es best-effort

Si `FirebaseMessaging.send()` lanza una excepción (FCM caído, token vencido, lo que
sea), el listener la atrapa, la deja en el log en nivel `warn`, y termina sin
volver a lanzarla. El push es *best-effort* (ver glosario): es deseable que llegue,
pero el flujo del pedido no se rompe si una notificación falla. Un pedido que se
marcó como `ENTREGADO` queda entregado aunque la push de "gracias por usar
QueueLess" no haya salido. Como el listener corre después del commit y en otro hilo
(patrón del ADR-0009), una excepción suya tampoco revierte el cambio de estado del
pedido.

### Reentrega del evento: sin idempotencia explícita

Con `@TransactionalEventListener` es posible, aunque raro, que el listener se
ejecute dos veces para un mismo cambio de estado. Si eso pasa, el cliente recibe la
misma push dos veces. No agregamos idempotencia explícita (una tabla
`push_enviado` ni un caché de los últimos N envíos) porque el costo supera al
beneficio para esta fase: una notificación duplicada ocasional es una molestia
menor, no una inconsistencia de datos como sí lo sería un doble cobro o un doble
movimiento de puntos. Lo dejamos anotado como hallazgo no bloqueante; si los datos
mostraran que las reentregas son frecuentes y molestan, se agrega la deduplicación.

### Costo y cuotas de FCM

FCM no cobra por el envío de notificaciones: la mensajería push es gratuita y sin
tope por mensaje en cualquier plan de Firebase. Para el volumen esperado de
QueueLess (los pedidos de un campus universitario), no es una preocupación
financiera. Lo dejamos documentado como contexto para que nadie asuma que hay que
presupuestar el envío de push.

## Por qué cortar el arranque (fail-fast) y no caer en silencio a modo dev

La alternativa a fallar al arrancar cuando las credenciales están mal sería
loguear el problema y caer al modo `[NOTIF DEV]`, igual que en desarrollo. La
descartamos.

El problema de caer en silencio es que es invisible. Un operador que deployó con la
variable `FIREBASE_CREDENTIALS_JSON` mal puesta vería el backend levantar normal,
respondiendo requests, sin ningún síntoma evidente. Recién se enteraría cuando un
cliente reclame que nunca le llegan las notificaciones, quizás días después.

Las notificaciones son funcionalidad visible del producto, no un componente
opcional que esté bien que se apague solo. Por eso, en producción, preferimos que
el backend no arranque y muestre un mensaje claro que diga exactamente qué
variable revisar. Es la misma lógica de "mejor que falle ahora con un mensaje
claro que un agujero silencioso" que ya aplicamos para el secret del webhook de
pagos (ver ADR-0013): cuando algo de seguridad o de funcionalidad central está mal
configurado en producción, fallar al arrancar es lo correcto.

La asimetría con dev es deliberada: en dev no hay credenciales y el modo
`[NOTIF DEV]` es lo esperado, así que ahí no se corta nada. El corte solo aplica
cuando las push están activadas (producción).

## Alternativas consideradas

### Alternativa 1 — Caer a modo `[NOTIF DEV]` si las credenciales fallan en prod

Loguear y seguir sin push. Descartada por invisible, según la sección anterior. Un
fallo de configuración de funcionalidad visible debe gritar, no susurrar.

### Alternativa 2 — Idempotencia explícita contra reentregas

Una tabla `push_enviado` o un caché de los últimos envíos para no mandar la misma
push dos veces. Descartada para esta fase: una push duplicada ocasional es molestia
menor, no daño de datos, y la infraestructura para deduplicar no se justifica
todavía. Reconsiderable si las reentregas resultan frecuentes.

### Alternativa 3 — Textos de notificación escritos a mano en el listener

Poner cada título y cuerpo como literal dentro del `if` de cada estado. Descartada
porque mezcla la copia del producto con la lógica de despacho, dificulta cambiar
textos y no permite el test de cobertura de estados. El catálogo centralizado es
más limpio.

### Alternativa 4 — Un archivo de credenciales en el servidor en vez de base64 en una variable

Montar el JSON del service account como archivo y pasarle la ruta a Firebase.
Descartada porque manejar un archivo secreto en el servidor (montarlo, protegerlo,
no versionarlo por error) es más frágil que una variable de entorno. El base64 en
una variable es más simple y portable entre plataformas de hosting.

## Consecuencias

### Positivas

- **Push reales en producción.** El cliente se entera de cada paso de su pedido sin
  tener la app abierta.
- **Dev y test sin fricción.** Como el adapter no existe cuando las push están
  apagadas, nadie necesita credenciales de Firebase para levantar el proyecto en
  local ni para correr los tests; los avisos quedan en el log.
- **Fallo visible en producción.** Una mala configuración de credenciales corta el
  arranque con un mensaje accionable, en lugar de dejar el producto a medias en
  silencio.
- **Catálogo mantenible.** Los textos se cambian en un solo lugar y se pueden
  cubrir con un test de "un mensaje por estado notificable".
- **El flujo del pedido nunca se rompe por una notificación.** El push es
  best-effort y corre fuera de la transacción del pedido.

### Negativas

- **Posibles notificaciones duplicadas.** Sin idempotencia, una reentrega del
  evento manda la push dos veces. Mitigación: es raro y de bajo impacto; queda
  documentado y es fácil de resolver si molesta.
- **Dependencia de un servicio externo.** Si FCM tiene problemas, no salen push.
  Mitigación: el flujo del pedido no depende de la push; los errores quedan en el
  log para revisarlos.
- **Solapamiento de topics `cliente-` y `pedido-`.** Puede generar avisos por dos
  canales. Mitigación: documentado; se consolida si aparece duplicación real.

### Riesgos

- **Credenciales del service account filtradas.** Son la llave para mandar push en
  nombre de QueueLess. Mitigación: viven solo en la variable de entorno del
  servidor, nunca en el código ni en `.env.example` (que solo lista la variable,
  no su valor); se rotan desde la consola de Firebase si se filtran.
- **Un cambio en la máquina de estados deja un estado sin mensaje.** Si se agrega
  un estado notificable y nadie le pone plantilla, el cliente no recibe aviso de
  esa transición. Mitigación: el test de cobertura de estados sobre el catálogo
  agarra el hueco.
- **Errores de FCM que pasan desapercibidos.** Como el envío es best-effort y solo
  se loggea, una tasa alta de fallos podría no notarse. Mitigación: los `warn`
  quedan en el log; si el volumen lo amerita, se enganchan a alertas más adelante.

## Anexo — Glosario de términos técnicos

**Firebase Cloud Messaging (FCM).** Servicio de Google para enviar notificaciones
push a aplicaciones móviles (Android, iOS) y web. El backend le pide a FCM "mandá
este mensaje a este destino" y FCM se encarga de hacerlo llegar al dispositivo.

Ejemplo concreto del proyecto: cuando un pedido pasa a `LISTO_PARA_RECOGER`,
QueueLess le pide a FCM que envíe "Tu pedido está listo" al cliente.

**Topic (en FCM).** Canal con nombre al que los dispositivos se suscriben para
recibir los mensajes que se publican en él. En vez de mandarle a un dispositivo
puntual, el backend publica en un topic y FCM reparte a todos los suscriptos.

Ejemplo concreto: la app del cliente con id 42 se suscribe al topic `cliente-42`.
Cuando su pedido cambia de estado, el backend publica en `cliente-42` y la push le
llega.

**base64.** Forma de representar datos binarios (o texto con caracteres
especiales) usando solo letras, números y unos pocos símbolos, para que viajen sin
problemas por canales pensados para texto, como una variable de entorno.

Ejemplo concreto: el JSON de credenciales de Firebase se codifica en base64 para
guardarlo en la variable `FIREBASE_CREDENTIALS_JSON`; el adapter lo decodifica al
arrancar para recuperar el JSON original.

**`@ConditionalOnProperty`.** Anotación de Spring Boot que hace que una clase (un
"bean") se cargue solo si una propiedad de configuración tiene cierto valor.

Ejemplo concreto: `FirebaseMessagingAdapter` lleva
`@ConditionalOnProperty(name = "queueless.firebase.enabled", havingValue = "true")`,
así que solo existe cuando las push están activadas (producción) y ni se crea en
dev/test.

**`ObjectProvider`.** Envoltorio de Spring para pedir un bean de forma diferida y
tolerante: permite preguntar "¿existe este bean? si sí, dámelo" sin que falte el
bean rompa nada.

Ejemplo concreto: `NotificationService` recibe un
`ObjectProvider<FirebaseMessagingAdapter>` y llama `getIfAvailable()`. En
producción devuelve el adapter; en dev devuelve `null` y la fachada cae al modo
`[NOTIF DEV]`.

**`@PostConstruct`.** Anotación que marca un método para que Spring lo ejecute
apenas termina de construir el bean, antes de que esté listo para usarse. Sirve
para inicializar cosas o validar configuración al arranque.

Ejemplo concreto: el adapter inicializa Firebase en un método `@PostConstruct`, así
la conexión queda lista (o falla con un error claro) antes de que llegue la primera
notificación.

**best-effort.** Garantía de "se intenta lo mejor posible, pero si no se logra, no
es un error fatal". Lo opuesto a una operación que debe completarse sí o sí.

Ejemplo concreto: enviar una push es best-effort. Si FCM falla, se loggea y se
sigue; el pedido igual avanza. No vale la pena romper el flujo del cliente por una
notificación que no salió.

**fail-fast.** Estrategia de fallar lo antes posible, con un error claro, en vez de
seguir funcionando en un estado inválido que después dé problemas difíciles de
rastrear.

Ejemplo concreto: si las credenciales de Firebase están mal en producción, el
backend no arranca y dice qué variable revisar, en lugar de levantar y dejar de
mandar push en silencio.

**Service account de Google Cloud.** Una "cuenta de máquina" (no de persona) que
representa al backend ante los servicios de Google. Tiene sus propias credenciales
en un JSON que prueba que el backend tiene permiso para usar FCM en nombre del
proyecto de Firebase de QueueLess.

Ejemplo concreto: el JSON del service account, codificado en base64, es lo que va
en `FIREBASE_CREDENTIALS_JSON`; con él, Firebase confía en que los pedidos de envío
vienen del backend legítimo de QueueLess y no de un tercero.

## Referencias

- ADR-0009 — Eventos de dominio (patrón `@TransactionalEventListener` después del commit + `@Async` que usa el listener de notificaciones).
- ADR-0010 — Postgres puerto y env (de dónde sale `FIREBASE_CREDENTIALS_JSON` y la convención de variables de entorno).
- ADR-0013 — Integración con pasarela de pagos (mismo criterio de fallar al arrancar ante un secret mal configurado en producción).
- `backend/src/main/java/pe/edu/utec/queueless/notification/adapter/FirebaseMessagingAdapter.java` — adapter de FCM e inicialización.
- `backend/src/main/java/pe/edu/utec/queueless/notification/service/NotificationService.java` — fachada con `ObjectProvider`.
- `backend/src/main/java/pe/edu/utec/queueless/notification/listener/PedidoNotificationListener.java` — listener y catálogo de mensajes por estado.
- `backend/src/main/java/pe/edu/utec/queueless/notification/dto/PushNotification.java` — objeto de notificación (topic, título, cuerpo, data).
- `backend/src/main/java/pe/edu/utec/queueless/pedido/event/PedidoEstadoCambiadoEvent.java` — evento con estado anterior y nuevo.
- `backend/src/main/resources/application.yml` — sección `queueless.firebase` (`enabled`, `credentials-base64`).
