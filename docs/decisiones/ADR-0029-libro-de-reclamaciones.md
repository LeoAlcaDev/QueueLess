# ADR-0029 — Libro de reclamaciones

## Contexto

QueueLess es una plataforma que intermedia ventas entre comercios y clientes, y por
eso le alcanza una obligación legal concreta. En el Perú, la **Ley 32495** y los
criterios de INDECOPI exigen que un proveedor ofrezca un **libro de reclamaciones**
accesible y operativo, que al recibir un reclamo entregue de inmediato un **acuse de
recibo** con un código de constancia, y que responda dentro de un **plazo de 15 días
hábiles**. Hasta ahora no teníamos nada de esto: el reclamo es una funcionalidad nueva
desde cero. Este ADR fija cómo la sumamos sin pretender ser asesoría legal, mapeando la
obligación a lo que el backend hace.

Damos por sentadas, y solo referenciamos, varias decisiones ya tomadas: el envío de
correo transaccional best-effort por fachada y listeners async (ADR-0021); el patrón de
eventos de dominio `@TransactionalEventListener` + `@Async` (ADR-0009); la taxonomía de
excepciones y el 422 de una regla de negocio (ADR-0019); la autorización por rol con la
identidad tomada del usuario autenticado y el 404 ante un acceso cruzado por id (ADR-0022,
ADR-0013); la zona fija de Lima para fechas (ADR-0011); y la generación de un código corto
y único con `SecureRandom` (ADR-0027).

## Decisión

### Una entidad `Reclamo` con su acuse inmediato

Modelamos el reclamo como una entidad nueva, `Reclamo`, que registra quién reclama, de
qué tipo es, contra quién va, el detalle, y opcionalmente el pedido relacionado. Al
registrarse, el sistema entrega de inmediato un **acuse** con un **código de constancia**
único (formato `LR-AAMMDD-XXXXX`, "Libro de Reclamaciones") y la fecha límite de respuesta.
El acuse viaja en la respuesta HTTP de la creación (201) y, además, por correo.

Los campos centrales:

- `usuario`: quién presenta el reclamo (cualquier usuario autenticado).
- `tipo` (`TipoReclamo`): **RECLAMO**, cuando la disconformidad es por el producto o el
  servicio; **QUEJA**, cuando es por el trato o la atención. Es la misma distinción que
  usa INDECOPI.
- `contra` (`DestinatarioReclamo`): **COMERCIO** o **PLATAFORMA**, según a quién apunta.
- `puntoDeVenta`: el local contra el que va, **obligatorio** cuando `contra` es COMERCIO y
  **nulo** cuando es PLATAFORMA (más abajo, "Sin caminos a medias").
- `pedido`: el pedido relacionado, **opcional** en cualquier caso.
- `detalle`: el texto del reclamo.
- `codigoConstancia`: el código del acuse, único.
- `estado` (`EstadoReclamo`): **PENDIENTE** o **RESPONDIDO**.
- `respuesta` y `respondidoAt`: lo que se respondió y cuándo, nulos hasta que se responde.
- `plazoRespuestaAt`: la fecha límite de respuesta, calculada al registrar.

### El plazo es de 15 días hábiles, configurable, con su default anclado en la ley

El plazo de respuesta por defecto es de **15 días hábiles**, el que fija la Ley 32495.
Lo dejamos **configurable** (`queueless.reclamo.plazo-respuesta-dias-habiles`), como los
demás números del proyecto, pero su valor por defecto y su razón de ser son legales: el
default no es un número elegido a ojo, es el plazo de la ley. Decir "cumplimos la Ley
32495 con su plazo de 15 días hábiles" defiende mejor que "el plazo es configurable".

### Días hábiles por aproximación, dicho con honestidad

Quince días hábiles no son quince corridos: la ley excluye fines de semana y feriados.
Para el alcance del curso usamos una **aproximación** que salta solo los fines de semana,
sin construir un calendario de feriados peruanos. Lo dejamos escrito como lo que es, y con
su dirección: al ignorar feriados, la cuenta puede **acortar levemente** el plazo frente
al cálculo legal exacto —si cae un feriado en medio, llegamos a quince días hábiles un día
antes que la cuenta correcta—, pero **nunca alargarlo**. Es el lado seguro: prometemos
responder antes, no después, lo que juega a favor del consumidor.

### El plazo legal es del reclamo de consumidor, no del reporte interno

Conviene separar dos cosas que se parecen. El **reclamo de consumidor** —el que un cliente
presenta contra un comercio o contra la plataforma— es lo que el libro de reclamaciones
regula y lo que INDECOPI fiscaliza, y es a lo que aplica el plazo de 15 días hábiles. Un
**reporte interno** —por ejemplo, un comercio o un repartidor que reporta un problema
operativo— es un concepto distinto, no sujeto a ese plazo legal. En esta fase
**implementamos el reclamo de consumidor**; el reporte interno, con su propio marco, queda
fuera de alcance y solo lo dejamos aclarado acá para no aplicarle por error el plazo de la
ley.

### Enrutamiento sin rol de administrador

Una decisión consciente: **no abrimos un panel ni un rol de administrador** en esta fase.
El reclamo se enruta según contra quién va.

- Contra un **comercio**: le llega a ese comercio, al correo de la cuenta del gestor del
  local. El comercio puede ver sus reclamos y marcarlos como respondidos.
- Contra la **plataforma**: va a un **correo de operadores configurado**
  (`queueless.reclamo.operadores-email`), que el equipo atiende por fuera de la aplicación.

La respuesta al usuario se gestiona por correo en los dos casos. El "marcar como
respondido" dentro de la app lo hace el comercio sobre los reclamos contra él; los reclamos
contra la plataforma los cierra el equipo de operadores por correo, y dejarlos cerrables
dentro de la app queda para cuando exista un rol operador. Evitamos así abrir un frente de
panel admin que esta fase no necesita.

### Sin caminos a medias

El endpoint de registro acepta a cualquier usuario autenticado y solo ofrece dos
destinatarios, COMERCIO y PLATAFORMA, los dos siempre enrutables: un reclamo contra un
comercio **exige** un local válido (si falta, se rechaza), de modo que siempre hay a quién
notificar; uno contra la plataforma va al correo de operadores. No existe un tipo "reporte
interno" suelto, así que nadie puede crear un reclamo que el sistema no sepa a dónde
mandar. La base lo respalda con una restricción: COMERCIO obliga a tener local, PLATAFORMA
obliga a no tenerlo.

### El acuse y las notificaciones reusan el correo y los eventos que ya existen

No inventamos infraestructura de correo: reusamos `EmailService` y sus plantillas
(ADR-0021), agregando los correos del acuse, de la notificación al destinatario y de la
respuesta. El envío sale de la ruta caliente con el patrón de eventos de siempre (ADR-0009):
registrar un reclamo publica `ReclamoRegistradoEvent` y responderlo publica
`ReclamoRespondidoEvent`; un listener `@Async` + `@TransactionalEventListener` los consume
después del commit y manda los correos best-effort. Como el listener navega asociaciones
lazy del reclamo (quién reclama, el local y su gestor), corre en una transacción propia
`REQUIRES_NEW` de solo lectura, igual que el recibo del pedido entregado (ADR-0021).

### Una migración nueva y el target de test al día

`Reclamo` extiende `BaseEntity`, así que su tabla `reclamo` necesita una migración Flyway
(`V8__reclamos.sql`) con sus columnas, las restricciones de los enums, el `created_at` y
`updated_at` y el trigger de `updated_at` que ya usa el resto del esquema. Como Hibernate
corre con `ddl-auto: validate` (ADR-0002), subimos el `flyway.target` de
`application-test.yml` de 7 a 8 para que el Postgres de los tests de integración aplique la
migración nueva y la validación no falle.

## Por qué enrutamos sin rol de administrador

La forma "completa" sería un panel de administración con un rol propio que reciba, asigne y
responda todos los reclamos. Lo descartamos para esta fase porque abre un frente grande
—un rol nuevo, sus permisos, sus pantallas— para un valor que el correo ya cubre: el
reclamo contra un comercio le llega al comercio, y el reclamo contra la plataforma le llega
a quien la opera. La ley pide que el libro sea operativo y que haya respuesta dentro del
plazo, no un panel. Cuando el volumen lo justifique, el rol operador y su panel son la
evolución natural, y la entidad ya guarda todo lo necesario para alimentarlos.

## Por qué el código de constancia reusa `SecureRandom`

El código de constancia tiene el mismo modelo que el código del pedido (ADR-0027): un
identificador corto, legible y único, que la persona puede citar para seguir su reclamo. No
necesita ser secreto —no prueba nada ni abre nada, solo identifica—, así que reusamos el
mismo enfoque de prefijo más fecha en hora de Lima más un sufijo aleatorio de `SecureRandom`,
con reintento si el candidato ya existe y una restricción `UNIQUE` en la columna. No
agregamos un mecanismo nuevo para algo que ya resolvimos bien.

## Alternativas consideradas

### Alternativa 1 — Un panel y un rol de administrador

Un rol ADMIN que gestione todos los reclamos desde un panel. Lo descartamos por alcance:
es un frente grande que el correo ya cubre para lo que la ley exige. Queda como evolución
cuando el volumen lo pida.

### Alternativa 2 — Plazo de respuesta incrustado en el código

Hardcodear los 15 días. Lo descartamos por la misma razón que los demás números del
proyecto son configuración: poder ajustarlo sin recompilar. La diferencia con otros valores
es que su default tiene origen legal, y eso queda documentado.

### Alternativa 3 — Contar días corridos en vez de hábiles

Sumar 15 días de calendario. Lo descartamos porque la ley habla de días hábiles; contar
corridos daría un plazo más corto y menos fiel. La aproximación que salta fines de semana
es más cercana, y su desvío conocido (ignorar feriados) juega a favor del consumidor.

### Alternativa 4 — Un código de constancia secuencial

Un contador 1, 2, 3… Lo descartamos: filtra cuántos reclamos hay y es menos robusto que un
sufijo aleatorio. El patrón de `SecureRandom` ya probado es mejor y no cuesta más.

### Alternativa 5 — Modelar ya el reporte interno

Sumar en esta fase el reporte interno de comercios y repartidores como variante de la
entidad. Lo descartamos por foco: es otro marco, sin el plazo legal del consumidor, y
mezclarlo ahora arriesga aplicarle reglas que no le tocan. Lo dejamos aclarado como futuro.

## Consecuencias

### Positivas

- **Cumplimos la obligación legal** del libro de reclamaciones: canal accesible, acuse
  inmediato con código de constancia y un plazo de respuesta con base en la Ley 32495.
- **Sin panel ni rol nuevo.** El enrutamiento por correo resuelve la operación con lo que
  ya existe; el comercio ve y cierra los suyos.
- **Reusa correo y eventos.** No hay infraestructura nueva: misma fachada de correo, mismo
  patrón async best-effort, mismo estilo de código único.
- **Honesto sobre sus límites.** La aproximación de días hábiles queda dicha, con su
  dirección segura; el reporte interno queda separado del reclamo de consumidor.

### Negativas

- **Los reclamos contra la plataforma no se cierran dentro de la app** todavía: se
  gestionan por correo de operadores. Mitigación: la entidad guarda el estado para cuando
  un rol operador los cierre; el acuse y el plazo igual se entregan.
- **El plazo es aproximado.** Ignora feriados. Mitigación: documentado, y el desvío acorta
  el plazo a favor del consumidor, nunca lo alarga.
- **Una tabla más y su migración.** Mitigación: es el costo mínimo de una entidad nueva;
  reusa el trigger de `updated_at` del esquema.

### Riesgos

- **El correo de notificación podría no llegar** (SMTP caído, sin configurar en dev).
  Mitigación: es best-effort como todo el correo (ADR-0021), pero el acuse con código y
  plazo ya viajó en la respuesta HTTP de la creación, así que el reclamo queda registrado y
  trazable aunque el correo falle.
- **Cambiar el plazo sin entender su origen.** Alguien podría bajar el default sin saber
  que viene de la ley. Mitigación: queda escrito acá que el 15 es legal, no arbitrario.

## Anexo — Glosario de términos técnicos

**Libro de reclamaciones.** El canal formal, exigido por ley en el Perú, donde un cliente
deja un reclamo o una queja y el proveedor debe acusar recibo y responder en un plazo.

Ejemplo concreto: en QueueLess es el endpoint que registra un `Reclamo` y devuelve un
acuse con el código `LR-260622-AB7K9` y la fecha límite de respuesta.

**Reclamo vs. queja.** Un **reclamo** es la disconformidad por el producto o el servicio;
una **queja** es el malestar por la atención o el trato. La distinción es la de INDECOPI y
la guardamos en `TipoReclamo`.

Ejemplo concreto: "el almuerzo llegó frío" es un reclamo; "me atendieron de mala manera en
el mostrador" es una queja.

**Reclamo de consumidor vs. reporte interno.** El **reclamo de consumidor** es el que
regula el libro de reclamaciones y al que aplica el plazo legal de 15 días hábiles. Un
**reporte interno** (de un comercio o un repartidor) es otra cosa, sin ese plazo, y queda
fuera de esta fase.

Ejemplo concreto: un cliente que reclama por su pedido es un reclamo de consumidor; un
comercio que reporta que un repartidor no se presentó sería un reporte interno, que hoy no
construimos.

**Código de constancia.** El identificador corto y único del acuse, con formato
`LR-AAMMDD-XXXXX`. No es secreto: solo sirve para que la persona cite su reclamo.

Ejemplo concreto: `LR-260622-AB7K9` identifica el reclamo creado el 22 de junio de 2026; el
cliente lo usa para preguntar por el estado de su caso.

**Días hábiles (aproximación).** El plazo legal se cuenta en días hábiles, que excluyen
fines de semana y feriados. Nuestra aproximación salta solo los fines de semana.

Ejemplo concreto: un reclamo registrado un viernes no cuenta el sábado ni el domingo; el
primer día hábil de su plazo es el lunes. Si en el medio hubiera un feriado, nuestra cuenta
no lo saltaría y el plazo quedaría un día más corto que el legal, nunca más largo.

**Acuse de recibo.** La confirmación inmediata de que el reclamo fue registrado, con su
código de constancia y el plazo de respuesta.

Ejemplo concreto: al registrar el reclamo, la respuesta 201 trae el código y la fecha
límite, y además sale un correo de acuse al cliente.

**Correo de operadores.** La dirección configurada a la que llegan los reclamos contra la
plataforma, atendidos por el equipo que la opera.

Ejemplo concreto: un reclamo `contra = PLATAFORMA` se notifica a
`operadores@queueless.local` (o lo que fije `queueless.reclamo.operadores-email`).

## Referencias

- ADR-0009 — Eventos de dominio (el patrón `@TransactionalEventListener` + `@Async` que reusan los correos del reclamo).
- ADR-0011 — Zona horaria fija `America/Lima` (el cálculo del plazo va en esa zona).
- ADR-0013 — Integración con pasarela de pagos (el criterio de 404 ante un acceso cruzado por id, que usa el responder del comercio).
- ADR-0019 — Taxonomía de excepciones y códigos HTTP (el 422 de una regla de negocio y el 404 de un recurso inexistente).
- ADR-0021 — Email transaccional complementario (la fachada `EmailService`, las plantillas y el envío best-effort que reusamos).
- ADR-0022 — Versionado y autorización por método (la autorización por rol y la identidad tomada del usuario autenticado).
- ADR-0027 — Validación de entrega por código (el patrón de código corto y único con `SecureRandom` que reusa el código de constancia).
- `backend/src/main/java/pe/edu/utec/queueless/reclamo/entity/Reclamo.java` — la entidad y sus enums.
- `backend/src/main/java/pe/edu/utec/queueless/reclamo/service/ReclamoService.java` — el registro, el código de constancia, el plazo y la respuesta.
- `backend/src/main/java/pe/edu/utec/queueless/reclamo/listener/ReclamoEmailListener.java` — el enrutamiento del correo al comercio o a operadores.
- `backend/src/main/java/pe/edu/utec/queueless/reclamo/controller/ReclamoController.java` y `ReclamoComercioController.java` — el registro y la gestión por rol.
- `backend/src/main/java/pe/edu/utec/queueless/notification/email/EmailService.java` — los correos del acuse, la notificación y la respuesta.
- `backend/src/main/resources/db/migration/V8__reclamos.sql` — la tabla y su trigger.
- `backend/src/main/resources/application.yml` — `queueless.reclamo.plazo-respuesta-dias-habiles` y `operadores-email`.
