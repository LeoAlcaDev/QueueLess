# ADR-0018 — Hardening del perfil de producción

## Contexto

Lo que es cómodo en desarrollo es peligroso en producción. En dev queremos Swagger
UI abierto para probar endpoints, mensajes de error detallados para depurar, y un
secret de JWT por defecto para no tener que configurar nada. En producción cada una
de esas comodidades es una grieta: Swagger expone el mapa completo de la API, los
mensajes de error detallados le filtran al atacante cómo está hecho el sistema, y un
secret por defecto deja la puerta abierta a que cualquiera firme tokens válidos.

El "hardening" (ver glosario) es el conjunto de ajustes que cierran esas grietas en
el perfil de producción. Buena parte ya estaba puesta en `application-prod.yml` de
fases anteriores (mensajes de error ocultos, Actuator restringido, logging acotado,
headers de proxy). Lo que faltaba era desactivar Swagger en producción (un `TODO`
que arrastraba el ADR-0004) y agregar una validación que impida arrancar en
producción con un secret de JWT inseguro.

Este ADR reúne todas las decisiones de endurecimiento del perfil de producción en
un solo lugar: las que ya estaban (para documentarlas como conscientes) y las dos
nuevas de esta fase. La convención de variables de entorno está en el ADR-0010 y no
la redocumentamos.

## Decisión

### Swagger UI y el documento OpenAPI se desactivan en producción

La documentación interactiva no debe estar disponible en producción: cuanto menos
expongamos, menor es la superficie de ataque, y el contrato de la API se publica
por fuera del backend cuando hace falta. La configuración es este bloque en
`application-prod.yml`:

```yaml
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

Esto reemplaza el `TODO` que tenía el ADR-0004 (que se actualiza para quitarlo y
apuntar acá). El bloque se aplica como parte de la implementación de la Fase 6.

**No hace falta tocar la configuración de seguridad.** Las reglas que dejan
públicas las rutas `/v3/api-docs/**`, `/swagger-ui/**` y `/swagger-ui.html` en
`SecurityConfig` pueden quedarse como están: con springdoc desactivado, no hay
ningún handler que sirva la documentación en esas rutas, así que las reglas quedan
inertes y no exponen nada. Un pedido a esas rutas cae en el manejo de rutas no
encontradas del backend, que ahora responde 404: el manejo global de errores mapea la
`NoResourceFoundException` de Spring a 404 (antes caía en el manejador por defecto y
salía como 500). El detalle de esa taxonomía de códigos está en el ADR-0019. Lo que
importa para el endurecimiento es que el contrato de la API deja de estar accesible.

### Validación de `JWT_SECRET` al arrancar

Agregamos una clase nueva, `config/JwtSecretValidator`, que implementa
`ApplicationRunner` (ver glosario): un hook que Spring ejecuta una vez, después de
que el contexto está completamente armado. La lógica:

1. Lee `queueless.jwt.secret` (la misma propiedad que usa `JwtService`).
2. Lee el perfil activo con `Environment.getActiveProfiles()`.
3. **Si el perfil activo incluye `prod` y se cumple alguna de estas condiciones**:
   - el secret está vacío;
   - el secret es exactamente el valor por defecto que trae `application.yml`
     (`dev-secret-change-me-in-prod-this-must-be-32-bytes-or-more`);
   - el secret tiene menos de 32 bytes en UTF-8
     (`secret.getBytes(StandardCharsets.UTF_8).length < 32`),
   
   entonces lanza una `IllegalStateException` con un mensaje accionable: el nombre
   de la variable a configurar (`JWT_SECRET`), el mínimo de longitud requerido (32
   bytes), y un ejemplo de cómo generar uno (`openssl rand -base64 48`). Esa
   excepción corta el arranque del backend.
4. **En perfiles distintos de `prod`**, si el secret es el valor por defecto, solo
   deja un aviso (`warn`) en el log; no corta el arranque.

Las tres condiciones de la regla 3 reflejan la realidad de cómo se usa el secret:
`JwtService.getSigningKey()` toma `secret.getBytes(StandardCharsets.UTF_8)` y arma
con esos bytes una clave para firmar con HMAC-SHA256 (ver glosario). Ese algoritmo
exige una clave de al menos 32 bytes; con menos, la propia librería de JWT
rechazaría la clave al arrancar a usarla. La validación se adelanta a ese fallo con
un mensaje claro. El chequeo contra el valor por defecto es necesario aparte del de
longitud, porque ese valor por defecto sí tiene más de 32 bytes (funcionaría
técnicamente) pero es público: está en el repositorio, así que usarlo en producción
sería equivalente a no tener secret.

**Por qué `ApplicationRunner` y no `@PostConstruct`.** Las dos opciones funcionan,
y de hecho el validador de firma del webhook de pagos usa `@PostConstruct` sin
problema (ver `MercadoPagoSignatureValidator`). La diferencia es de alcance:
`@PostConstruct` es el hook natural para validar la configuración de **un bean
puntual** apenas se construye. Para una validación **global de arranque**, que no
pertenece a ningún bean de negocio en particular, `ApplicationRunner` encaja mejor:
corre una sola vez después de que todo el contexto está levantado y el perfil
activo ya está resuelto, y si falla, corta el arranque de forma limpia al final del
proceso de inicio, no en medio del cableado de un bean. Es la diferencia entre "este
bean valida lo suyo" y "la aplicación valida una precondición global antes de
considerarse lista".

### Logging de producción

`application-prod.yml` ya tiene el nivel de log en `root: WARN` y
`pe.edu.utec.queueless: INFO`. Lo documentamos como suficiente. Los logs salen por
la salida estándar (stdout) y los captura la plataforma de hosting (CloudWatch de
AWS, el contenedor administrado, lo que aplique). No agregamos appenders
personalizados en esta fase: configurar archivos rotados con Logback, o un
pipeline con Logstash o ELK, sería desproporcionado para el alcance académico del
proyecto. Si en el futuro hace falta retención o búsqueda de logs, se agrega
entonces.

### Los errores 500 no exponen detalles al cliente

`application-prod.yml` ya tiene `server.error.include-message: never` e
`include-binding-errors: never`. Lo documentamos: en producción, un error interno
(500) no le devuelve al cliente el detalle de la excepción (el mensaje, la clase,
el binding que falló). Esos detalles van solo a los logs del servidor, donde el
equipo los ve. Mostrárselos al cliente sería filtrarle información útil a un
atacante (nombres de clases, estructura interna, a veces fragmentos de consultas).
En dev, en cambio, esos detalles sí se muestran, porque ahí ayudan a depurar.

### Endpoints de Actuator restringidos

`application-prod.yml` ya limita la exposición de Actuator (ver glosario) a
`health` e `info`, con `show-details: never`. Lo documentamos como decisión
consciente: no exponemos `/actuator/metrics` ni `/actuator/env` para no filtrar
información del sistema (métricas internas, variables de configuración). El
endpoint `health` con los detalles ocultos devuelve solo `UP` o `DOWN`, sin revelar
la versión de Postgres, de Java, ni el estado de los componentes internos. En
`SecurityConfig`, `/actuator/health` y `/actuator/info` son públicos; el resto
queda detrás de autenticación.

### CORS y HTTPS detrás de un reverse proxy

En producción se asume que el backend corre detrás de un reverse proxy (ver
glosario) —nginx, un balanceador de AWS, Cloudflare— que termina el TLS (ver
glosario, TLS termination). El backend no maneja HTTPS directamente; recibe tráfico
HTTP del proxy. Para que Spring sepa que está detrás de un proxy y respete las
cabeceras `X-Forwarded-*` (ver glosario) que el proxy agrega (el protocolo y el
host originales del cliente), `application-prod.yml` ya tiene
`server.forward-headers-strategy: framework`. Sin eso, Spring construiría URLs con
el esquema y el host internos (HTTP, la IP del contenedor) en vez de los públicos
(HTTPS, el dominio real). Lo documentamos como contexto operacional.

### Variables de entorno requeridas para arrancar en producción

Esta es la lista completa de variables que el backend necesita en producción.
Sirve como checklist de despliegue:

| Variable | Para qué |
|---|---|
| `SPRING_PROFILES_ACTIVE=prod` | Activa el perfil de producción (carga `application-prod.yml`). |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexión a Postgres. |
| `JWT_SECRET` | Secret para firmar JWTs. Al menos 32 bytes en UTF-8, distinto del valor por defecto. |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | Pasarela de pagos real (ver ADR-0013). |
| `AWS_S3_BUCKET`, `AWS_REGION` | Bucket y región de S3 (`AWS_REGION` por defecto `us-east-1`; ver ADR-0017). |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credenciales de escritura de S3 (las toma el SDK de AWS del entorno). |
| `FIREBASE_CREDENTIALS_JSON` | Credenciales de FCM en base64 (ver ADR-0016). |

Algunas elecciones de comportamiento de producción están fijadas directamente en el
perfil (`storage.impl: s3`, `firebase.enabled: true`, `pago.gateway` con valor por
defecto `mercadopago`), así que no necesitan variable propia. Las que están arriba
son las que sí hay que setear, porque no tienen un valor por defecto seguro.

## Por qué validamos solo `JWT_SECRET` al arrancar y no todas las variables

Podríamos validar al arranque que estén todas las variables de la lista. Decidimos
validar explícitamente solo el secret de JWT. La razón es la naturaleza de cada
fallo:

Las demás variables se validan solas cuando se usan, y cuando fallan, fallan con
claridad: si `DB_URL` está mal, el pool de conexiones (Hikari) no levanta y el
backend no arranca; si las credenciales de S3 están mal, el cliente de AWS falla
con un error explícito; si las de Firebase están mal, el adapter corta el arranque
(ADR-0016). En todos esos casos, "mal configurado" se traduce en "algo se rompe de
forma visible".

`JWT_SECRET` es el único caso distinto: un secret por defecto **funciona
técnicamente**. El backend arranca, firma tokens, valida logins, todo anda. Pero la
seguridad del sistema entero está comprometida, porque ese secret es público.
Nada se rompe, nada avisa, y el agujero queda abierto en silencio. Ese "funciona
pero está mal, sin síntoma" es exactamente lo que justifica una validación
explícita: es el único lugar donde no validar deja un problema invisible.

Sobre extender la validación al secret del webhook de MercadoPago
(`MERCADOPAGO_WEBHOOK_SECRET`): no hace falta, porque ya existe. El validador de
firma del webhook (`MercadoPagoSignatureValidator`) tiene un bloqueo de arranque en
producción si ese secret está vacío (documentado en el ADR-0013). La verificación
ya está, solo que vive en el módulo de pagos. No la duplicamos acá.

## Tests del validador

Se agrega un test unitario de `JwtSecretValidator` que cubre los cuatro casos de la
regla, sin base de datos ni contexto de Spring (se le pasa un `Environment`
simulado y el secret directo):

1. Perfil `prod` con el secret por defecto → lanza `IllegalStateException`.
2. Perfil `prod` con un secret de menos de 32 bytes → lanza `IllegalStateException`.
3. Perfil `prod` con un secret válido (32 bytes o más, distinto del default) → no
   lanza y no deja aviso.
4. Perfil `dev` con el secret por defecto → deja un aviso (`warn`) pero no lanza.

Es el mismo enfoque que ya usa el test del validador de firma del webhook, que le
pasa un `Environment` simulado para verificar el corte de arranque en producción.

## Alternativas consideradas

### Alternativa 1 — Validar todas las variables de entorno al arrancar

Un validador que verifique que estén `DB_URL`, las credenciales de S3, el token de
MercadoPago, etc. Descartada porque esas variables ya fallan con claridad cuando se
usan, y duplicar su verificación agrega código que repite lo que el propio
componente (Hikari, el SDK de AWS) ya hace bien. La única que necesita validación
adelantada es la que "funciona pero está mal" en silencio: el secret de JWT.

### Alternativa 2 — Validar el secret con `@PostConstruct` en una clase de configuración

Funcionaría, pero `ApplicationRunner` encaja mejor para una validación global de
arranque: corre después de que el contexto entero está armado y el perfil resuelto,
y su fallo corta el arranque de forma limpia al final del inicio. `@PostConstruct`
es el hook adecuado para validar lo de un bean puntual (como hace el validador del
webhook), no una precondición global.

### Alternativa 3 — Desactivar Swagger quitando la dependencia o agregando reglas de seguridad

Para sacar Swagger de producción podríamos quitar `springdoc` del classpath en el
build de producción, o bloquear sus rutas en `SecurityConfig`. Descartada: apagarlo
por configuración (`enabled: false`) es más simple y reversible que tocar el build,
y no hace falta bloquear las rutas en seguridad porque, sin handler que sirva la
documentación, esas rutas ya no exponen nada.

### Alternativa 4 — Appenders de logging dedicados (archivos rotados, ELK) en esta fase

Configurar retención y búsqueda de logs con Logback o un pipeline externo.
Descartada por desproporcionada para el alcance académico: stdout capturado por la
plataforma de hosting alcanza. Se reconsidera si el proyecto crece.

## Consecuencias

### Positivas

- **Menor superficie de ataque en producción.** Sin Swagger, el contrato de la API
  no está expuesto; sin detalles de error, el atacante no recibe pistas; con
  Actuator restringido, no se filtra información del sistema.
- **Imposible arrancar en producción con un secret inseguro.** El validador corta
  el arranque con un mensaje accionable si el secret está vacío, es el default, o es
  demasiado corto.
- **Checklist de despliegue claro.** La lista de variables de entorno requeridas
  está en un solo lugar.
- **Coherencia con dev.** Los ajustes solo aplican en producción; en dev se conserva
  Swagger, los errores detallados y el secret por defecto (con aviso), para no
  estorbar el desarrollo.

### Negativas

- **Una clase nueva que mantener** (`JwtSecretValidator`). Es chica y está cubierta
  por test, pero es código que antes no existía. Mitigación: el costo es mínimo
  frente al riesgo que cubre.
- **El equipo debe recordar el valor del secret por defecto.** La validación
  compara contra esa cadena exacta; si alguien cambia el default en `application.yml`
  sin actualizar el validador, el chequeo de "es el default" deja de servir.
  Mitigación: ambos valores viven en el repo y un test lo verifica.

### Riesgos

- **Falsos negativos en la detección del default.** Si el secret de producción se
  pareciera al default pero no fuera idéntico, el chequeo de igualdad no lo
  agarraría; lo salvaría el chequeo de longitud solo si además fuera corto.
  Mitigación: la combinación de las tres condiciones (vacío, igual al default,
  corto) cubre los casos realistas de mala configuración.
- **Dependencia del reverse proxy para HTTPS.** Si el proxy no estuviera bien
  configurado, el backend recibiría tráfico sin cifrar o construiría URLs con el
  host interno. Mitigación: la configuración del proxy es parte del despliegue;
  `forward-headers-strategy: framework` ya está puesto para cuando el proxy manda
  las cabeceras correctas.
- **Un cambio futuro de la cadena por defecto del secret** desincronizaría el
  validador. Mitigación: el test del validador y la cercanía de ambos valores en el
  repo lo hacen fácil de mantener sincronizado.

## Anexo — Glosario de términos técnicos

**Hardening.** Endurecer un sistema para producción: cerrar o restringir todo lo
que en desarrollo está abierto por comodidad y en producción sería un riesgo.

Ejemplo concreto del proyecto: desactivar Swagger, ocultar los detalles de los
errores, restringir Actuator y exigir un secret de JWT fuerte son medidas de
hardening del perfil de producción de QueueLess.

**fail-fast.** Estrategia de fallar lo antes posible, con un mensaje claro, en vez
de seguir funcionando en un estado inválido que después dé problemas difíciles de
rastrear.

Ejemplo concreto: si el secret de JWT es inseguro en producción, el backend no
arranca y dice qué variable revisar, en lugar de levantar y dejar el sistema
vulnerable en silencio.

**`ApplicationRunner` vs. `@PostConstruct`.** Dos formas de correr código al
arrancar. `@PostConstruct` corre apenas se construye un bean específico, y es ideal
para inicializar o validar lo de ese bean. `ApplicationRunner` corre una sola vez,
después de que todo el contexto de Spring está armado y listo, y es ideal para
tareas o validaciones globales de arranque.

Ejemplo concreto: `JwtSecretValidator` usa `ApplicationRunner` porque valida una
precondición global (el secret) que no pertenece a ningún bean de negocio; el
validador del webhook de pagos usa `@PostConstruct` porque valida la configuración
de su propio bean.

**Reverse proxy.** Servidor que se pone delante del backend y recibe las peticiones
de los clientes en su lugar, para después reenviárselas. Suele encargarse del
cifrado (HTTPS), del balanceo de carga y de servir contenido estático.

Ejemplo concreto: en producción, QueueLess corre detrás de un reverse proxy (nginx,
un balanceador de AWS o Cloudflare) que recibe el HTTPS del cliente y le pasa HTTP
al backend.

**TLS termination.** El punto donde se descifra el HTTPS. Cuando el reverse proxy
hace la "terminación de TLS", el cliente habla HTTPS con el proxy, y el proxy habla
HTTP (sin cifrar, dentro de la red privada) con el backend.

Ejemplo concreto: el backend de QueueLess no maneja certificados ni HTTPS; confía
en que el proxy ya terminó el TLS y le manda tráfico HTTP por dentro.

**`X-Forwarded-*`.** Cabeceras HTTP que un reverse proxy agrega para contarle al
backend datos del cliente original que, de otro modo, se perderían al pasar por el
proxy: `X-Forwarded-Proto` (el protocolo original, `https`), `X-Forwarded-Host` (el
host original), `X-Forwarded-For` (la IP del cliente).

Ejemplo concreto: con `forward-headers-strategy: framework`, Spring lee
`X-Forwarded-Proto: https` y construye las URLs públicas con `https`, aunque por
dentro le haya llegado una petición HTTP del proxy.

**Spring profile (perfil de Spring).** Configuración específica por ambiente. Al
activar un perfil (por ejemplo, `prod`), Spring carga `application.yml` y encima
`application-prod.yml`, que sobreescribe lo que haga falta. Se activa con
`spring.profiles.active` o la variable `SPRING_PROFILES_ACTIVE`.

Ejemplo concreto: con `SPRING_PROFILES_ACTIVE=prod`, QueueLess usa S3, MercadoPago,
FCM y los ajustes de hardening, en vez de los valores de dev.

**Actuator endpoint.** Endpoints que expone Spring Boot Actuator para monitorear la
aplicación: `/actuator/health` (estado), `/actuator/info` (información), y otros más
sensibles como `/actuator/metrics` o `/actuator/env`.

Ejemplo concreto: en producción, QueueLess solo expone `health` e `info`, y `health`
con detalles ocultos, para no filtrar información del sistema por
`/actuator/env` o `/actuator/metrics`.

**HMAC-SHA256.** Algoritmo para firmar datos con una clave secreta, de modo que
cualquiera con la clave pueda verificar que los datos no fueron alterados y que los
firmó quien dice. Requiere una clave de al menos 256 bits (32 bytes).

Ejemplo concreto: QueueLess firma los tokens JWT con HMAC-SHA256 usando el
`JWT_SECRET`. Por eso el secret tiene que tener al menos 32 bytes: con menos, el
algoritmo no acepta la clave.

**byte vs. carácter (en strings UTF-8).** Un carácter no siempre ocupa un byte. En
la codificación UTF-8, las letras y números comunes ocupan un byte, pero las
tildes, la ñ o los emojis ocupan dos o más. Por eso "longitud en caracteres" y
"longitud en bytes" pueden diferir.

Ejemplo concreto: el validador mide el secret con
`secret.getBytes(StandardCharsets.UTF_8).length`, no con la cantidad de caracteres,
porque lo que HMAC-SHA256 necesita son 32 *bytes*. Un secret de 30 caracteres con
varias tildes podría llegar a los 32 bytes; uno de 31 caracteres sin tildes, no.

## Referencias

- ADR-0004 — Swagger UI / OpenAPI (se actualiza: el `TODO` de desactivación en producción se reemplaza por una referencia a este ADR).
- ADR-0006 — GitHub Flow y CI (el test del validador de secret corre en el pipeline con `mvn verify`; el arranque con perfil de producción se verifica en el despliegue, no en CI).
- ADR-0010 — Postgres puerto y env (convención de variables de entorno y de `.env.example`).
- ADR-0013 — Integración con pasarela de pagos (bloqueo de arranque del validador de firma del webhook).
- ADR-0016 — Notificaciones push (fallo de arranque del adapter de Firebase ante credenciales mal configuradas).
- ADR-0017 — Almacenamiento de archivos (variables de S3 y credenciales tomadas del entorno).
- ADR-0019 — Taxonomía de excepciones y códigos HTTP (el 404 de las rutas no mapeadas vive ahí).
- `backend/src/main/java/pe/edu/utec/queueless/config/JwtSecretValidator.java` — el validador (clase nueva de esta fase).
- `backend/src/main/java/pe/edu/utec/queueless/auth/service/JwtService.java` — cómo se inyecta y se usa el secret.
- `backend/src/main/java/pe/edu/utec/queueless/pago/gateway/MercadoPagoSignatureValidator.java` — el bloqueo de arranque ya existente para el secret del webhook.
- `backend/src/main/java/pe/edu/utec/queueless/config/SecurityConfig.java` — reglas públicas de `/swagger-ui`, `/v3/api-docs` y Actuator.
- `backend/src/main/resources/application-prod.yml` — perfil de producción (logging, errores, Actuator, headers de proxy, y el bloque de springdoc que cierra esta fase).
- `backend/src/main/resources/application.yml` — valor por defecto de `queueless.jwt.secret`.
