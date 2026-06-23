# ADR-0030 — Términos y Condiciones: documento vivo y registro de aceptación

## Contexto

QueueLess necesita unos Términos y Condiciones y, además, dejar constancia de que cada
usuario los aceptó. Son dos cosas distintas: el **texto** de los términos y el
**mecanismo** del backend para registrar la aceptación. Este ADR es sobre el mecanismo;
el texto vive aparte, en `docs/legal/terminos-y-condiciones.md`, escrito en lenguaje
claro y con una regla de oro —no afirmar nada que el sistema no haga— que no
redocumentamos acá.

El problema concreto que resuelve el mecanismo: como los términos van a cambiar con el
tiempo (es un documento vivo), no alcanza con saber *si* el usuario aceptó; hay que saber
*qué versión* aceptó y *cuándo*. Damos por sentada la entidad `Usuario` y que extiende
`BaseEntity` (ADR-0003, ADR-0007), la configuración por `@Value`, y la migración Flyway
con `ddl-auto: validate` (ADR-0002).

## Decisión

### Los Términos son un documento vivo versionado en el repositorio

El texto de los Términos vive en `docs/legal/terminos-y-condiciones.md`, versionado junto
al código. Cada versión se identifica por la fecha de su encabezado. Cuando cambia lo que
la plataforma hace, se actualiza el texto y se sube su versión. Que viva en el repo, y no
en una tabla de la base, es deliberado: el texto es contenido editorial que evoluciona con
revisiones, no un dato transaccional; el control de versiones del repo ya es el lugar
natural para su historia.

### El backend registra la aceptación con versión y fecha, no con un booleano

Sobre el `Usuario` registramos dos datos: **qué versión** de los Términos aceptó
(`tycVersionAceptada`) y **cuándo** lo hizo (`tycAceptadoAt`). No un simple "aceptó sí/no",
porque el documento cambia: un booleano nos diría que alguien aceptó *algunos* términos en
*algún* momento, sin poder distinguir si aceptó la versión vigente o una vieja que ya no
refleja lo que hacemos. Guardar la versión y la fecha responde la pregunta que de verdad
importa: ¿este usuario aceptó la versión que rige hoy?

Guardamos solo la **última** aceptación, no un historial de todas. Para lo que esta fase
necesita —saber qué versión rige para cada usuario— alcanza con el último estado; si en el
futuro hiciera falta una traza de auditoría de cada aceptación, se suma una tabla aparte
sin tocar este registro.

### La versión vigente es configurable y única fuente de verdad

La versión vigente es un valor de configuración (`queueless.tyc.version-vigente`). El
endpoint de aceptación la lee de ahí para registrarla, y el documento la declara en su
encabezado. Tener un solo lugar que la define evita que el texto y lo que el backend
registra se desincronicen: cuando se publica una versión nueva, se cambia el encabezado del
documento y ese mismo valor en la configuración.

### En esta fase solo registramos: no obligamos ni bloqueamos

Decisión consciente: el backend **solo deja constancia** de la aceptación. **No** obliga a
aceptar antes de operar ni bloquea ninguna acción por falta de aceptación. Obligar a
aceptar antes de usar la plataforma es una decisión de **flujo** —cuándo y cómo se le
muestra el documento al usuario, qué se le impide hacer hasta que acepte— que se diseña
junto con el frontend que lo va a mostrar. Meter ese candado en el backend ahora, sin esa
contraparte, sería adivinar el flujo. Por eso esta fase deja la pieza de registro lista y
deja el bloqueo para cuando se diseñe el flujo completo.

### Diseño mínimo del registro

Concretamente: dos columnas nuevas en la tabla `usuario` (`tyc_version_aceptada`,
`tyc_aceptado_at`), agregadas por una migración Flyway (`V9__usuario_aceptacion_tyc.sql`),
con el `flyway.target` de los tests subido a 9 para que el Postgres de integración aplique
la migración y la validación de Hibernate no falle (ADR-0002). Y dos endpoints para el
usuario autenticado, bajo el mismo prefijo `/api/v1/me/...` que ya usan los perfiles:

- `GET /api/v1/me/tyc`: devuelve la versión vigente, la versión que el usuario aceptó (si
  aceptó alguna) y la fecha.
- `POST /api/v1/me/tyc/aceptacion`: registra que el usuario acepta la versión vigente, con
  la fecha del momento. Aceptar de nuevo simplemente actualiza a la versión vigente.

## Por qué versión y fecha y no un booleano

Un booleano `aceptoTerminos` se rompe en cuanto el documento cambia. Imaginá que un usuario
aceptó la versión de enero; en marzo publicamos una versión nueva con un cambio
importante. El booleano sigue en `true`, diciendo "aceptó", pero aceptó algo que ya no es lo
vigente. Con la versión y la fecha, comparar `tycVersionAceptada` contra la versión vigente
responde sin ambigüedad si está al día. La fecha, además, deja constancia de cuándo
ocurrió, que es lo que un registro de aceptación necesita tener.

## Por qué solo registrar y no bloquear todavía

Bloquear operaciones por falta de aceptación suena prudente, pero define un flujo que no es
del backend solo: ¿se le muestra el documento al registrarse?, ¿la primera vez que abre la
app?, ¿qué puede hacer mientras no acepte? Esas respuestas dependen de la interfaz que lo
muestre, que todavía no existe. Si pusiéramos el candado ahora, estaríamos fijando un flujo
a ciegas y probablemente lo tendríamos que rehacer cuando llegue el frontend. Registrar es
la parte que sí podemos resolver bien hoy y sobre la que el flujo se construirá después.

## Por qué dos columnas en `Usuario` y no una entidad aparte

La aceptación vigente es un atributo del usuario: una versión y una fecha. Modelarla como
una entidad o tabla propia agregaría una relación y una consulta para guardar dos campos
que pertenecen naturalmente al usuario y que se leen siempre junto con él. La tabla aparte
recién se justifica si quisiéramos el **historial** de todas las aceptaciones, que esta
fase decidió no construir. Para el último estado, dos columnas en `usuario` es lo justo.

## Alternativas consideradas

### Alternativa 1 — Un booleano de "aceptó términos"

Guardar solo si aceptó. Descartada porque no sobrevive a un cambio de versión: no
distingue entre aceptar la versión vigente y una vieja.

### Alternativa 2 — Una tabla de historial de aceptaciones

Guardar cada aceptación con su versión y fecha en una tabla propia. Descartada para esta
fase: para saber qué versión rige por usuario alcanza el último estado. Queda como opción
si el día de mañana se necesita una traza de auditoría completa.

### Alternativa 3 — Obligar la aceptación antes de operar

Bloquear acciones hasta que el usuario acepte. Descartada por ahora porque es una decisión
de flujo que se diseña con el frontend; fijarla en el backend sin esa contraparte sería
adivinar.

### Alternativa 4 — La versión vigente incrustada en el código

Tener la versión fija en una constante. Descartada por la misma razón que los demás valores
del proyecto son configuración: poder publicar una versión nueva sin recompilar, y tener un
solo lugar que el documento y el backend comparten.

## Consecuencias

### Positivas

- **Sabemos qué versión aceptó cada usuario**, no solo que aceptó algo, lo que es lo que un
  registro de aceptación necesita cuando el documento cambia.
- **Texto y registro no se desincronizan**: la versión vigente sale de un único valor de
  configuración que el documento declara en su encabezado.
- **Registro mínimo y barato**: dos columnas en `usuario`, sin entidad ni relación nuevas.
- **No condiciona el producto**: como solo registra, nada se rompe ni se bloquea por falta
  de aceptación; el flujo que la exija se diseña después, sin deuda acá.

### Negativas

- **No hay historial de aceptaciones**: guardamos solo la última. Mitigación: es lo que la
  fase necesita; una tabla de historial se agrega después si hace falta.
- **La aceptación no se exige todavía**: un usuario puede operar sin haber aceptado.
  Mitigación: es deliberado; el bloqueo es una decisión de flujo futura, y el registro ya
  queda listo para soportarla.

### Riesgos

- **Olvidar subir la versión de configuración al cambiar el documento**: el backend
  registraría una versión que no corresponde al texto nuevo. Mitigación: la versión vive en
  un solo lugar y el encabezado del documento la repite, así que la sincronía es un cambio
  de dos líneas que va junto en el mismo commit.

## Anexo — Glosario de términos técnicos

**Documento vivo.** Un texto que se mantiene y evoluciona con el tiempo en vez de quedar
fijo. Cada cambio sube su versión.

Ejemplo concreto: los Términos de QueueLess viven en `docs/legal/terminos-y-condiciones.md`;
cuando se suma una funcionalidad, se actualiza el texto y se cambia la fecha de su encabezado.

**Versión vigente.** La versión de los Términos que rige hoy, identificada por la fecha de
su encabezado y definida en la configuración del backend.

Ejemplo concreto: si `queueless.tyc.version-vigente` vale `2026-06-23`, esa es la versión
que el endpoint registra cuando un usuario acepta, y la misma que el documento muestra arriba.

**Registro de aceptación.** Los datos que el backend guarda para dejar constancia de que un
usuario aceptó: qué versión y cuándo.

Ejemplo concreto: tras aceptar, el `Usuario` queda con `tycVersionAceptada = "2026-06-23"` y
`tycAceptadoAt` con el instante de la aceptación.

**Por qué versión en vez de booleano.** Un booleano solo dice "aceptó alguna vez"; la
versión dice "aceptó *esta*". Como el documento cambia, lo segundo es lo único que permite
saber si el usuario está al día.

Ejemplo concreto: alguien que aceptó la versión `2026-01-10` aparece, al comparar contra la
vigente `2026-06-23`, como que no aceptó la actual, cosa que un booleano en `true` ocultaría.

## Referencias

- ADR-0002 — Flyway y `ddl-auto: validate` (la migración nueva y el `flyway.target` de test).
- ADR-0003 / ADR-0007 — Modelo de entidades y composición de perfiles (la `Usuario` que extendemos).
- ADR-0013 — Integración con pasarela de pagos (que la plataforma no almacena datos de tarjeta, afirmado en el documento de Términos).
- ADR-0017 — Almacenamiento de archivos (las imágenes de productos que el documento describe).
- ADR-0021 — Email transaccional (los correos que el documento menciona como uso del dato de contacto).
- ADR-0022 — Versionado y autorización por método (los endpoints `/api/v1/me/...` para el usuario autenticado).
- ADR-0025 — Alérgenos y hábitos (el descargo de alérgenos, el punto más delicado del documento).
- ADR-0026 — Pedidos programados (las reglas de compromiso y reembolso que el documento resume).
- ADR-0027 — Validación de entrega por código (la prueba de entrega que el documento resume).
- `docs/legal/terminos-y-condiciones.md` — el texto vivo de los Términos.
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/Usuario.java` — los campos `tycVersionAceptada` y `tycAceptadoAt`.
- `backend/src/main/java/pe/edu/utec/queueless/tyc/service/TycService.java` — el registro y la lectura de la aceptación.
- `backend/src/main/java/pe/edu/utec/queueless/tyc/controller/TycController.java` — los endpoints `/api/v1/me/tyc`.
- `backend/src/main/resources/db/migration/V9__usuario_aceptacion_tyc.sql` — las columnas nuevas.
- `backend/src/main/resources/application.yml` — `queueless.tyc.version-vigente`.
