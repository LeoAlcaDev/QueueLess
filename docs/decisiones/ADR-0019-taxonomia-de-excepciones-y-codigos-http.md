# ADR-0019 — Taxonomía de excepciones y códigos de respuesta HTTP

## Contexto

Una API REST se comunica con sus clientes tanto por el cuerpo de la respuesta como
por el código HTTP. El código es la primera señal que recibe el cliente —el panel web
del comercio, la app móvil, la colección de Postman, el revisor del curso— y dice, sin
necesidad de leer el cuerpo, qué pasó: 404 es "no existe", 409 es "ya existe", 403 es
"no podés hacer esto", 422 es "tu pedido está bien formado pero rompe una regla de
negocio".

Hasta este punto el contrato de errores de QueueLess era inconsistente. Teníamos dos
excepciones de dominio genéricas, `BusinessRuleException` y `ResourceNotFoundException`,
y un manejador parcial. La consecuencia era que:

- La mayoría de los errores de negocio que no fueran "no encontrado" caían en el
  manejador por defecto y salían como **500**, cuando en realidad eran problemas del
  pedido del cliente (un correo repetido, un saldo insuficiente, un archivo inválido).
- Una **ruta inexistente devolvía 500** en vez de 404, porque la excepción que lanza
  Spring cuando ninguna ruta hace match (`NoResourceFoundException`) no estaba mapeada y
  terminaba en el manejador por defecto.
- Las **creaciones devolvían 200** en lugar de 201, y los **borrados devolvían 200** con
  cuerpo vacío en lugar de 204.

Este ADR fija, en un solo lugar, la taxonomía de excepciones de dominio, el código HTTP
con el que el manejador global traduce cada una, y la convención de códigos para crear y
borrar. La idea es que cualquiera que lea el código entienda por qué una excepción dada
produce un código dado, y que ese contrato sea estable para los clientes.

El criterio de seguridad de responder 404 ante un acceso cruzado por id (IDOR) está en el
ADR-0013 y no lo cambiamos: este ADR lo complementa y aclara su frontera con el 403.

## Decisión

### La jerarquía de excepciones de dominio

Las excepciones de dominio viven en `shared/exception/` y se organizan así:

```
RuntimeException
├── ResourceNotFoundException          -> 404 Not Found
└── BusinessRuleException              -> 422 Unprocessable Entity   (base / catch-all)
    ├── DuplicateResourceException     -> 409 Conflict
    ├── ForbiddenOperationException    -> 403 Forbidden
    ├── InvalidStateTransitionException-> 422 (hereda del base)
    ├── InvalidFileException           -> 422 (hereda del base)
    ├── InsufficientPointsException    -> 422 (hereda del base)
    └── PaymentException               -> 422 (hereda del base)
```

Son ocho excepciones de dominio en dos ramas. `ResourceNotFoundException` cuelga directo
de `RuntimeException`, porque "no existe" no es una violación de regla de negocio, es una
categoría aparte. Las otras siete cuelgan de `BusinessRuleException`, que es a la vez una
excepción usable directamente (para reglas que no merecen un tipo propio) y la **raíz
catch-all** de todas las violaciones de negocio.

Cada subtipo es una clase trivial: un constructor que recibe el mensaje y lo pasa al
`super`. No agregan lógica; lo que aportan es **semántica** —decir con el tipo qué clase
de problema ocurrió— y, a través del manejador, el código HTTP correcto.

### El manejador global traduce excepción a código

Un único `@RestControllerAdvice` (`GlobalExceptionHandler`) concentra la traducción. Esta
es la tabla completa de lo que mapea hoy:

| Situación / excepción | Código | Mensaje al cliente |
|---|---|---|
| `MethodArgumentNotValidException` (falla `@Valid`) | **400** | "Errores de validación" + detalle por campo |
| `HttpMessageNotReadableException` (cuerpo malformado) | **400** | "El cuerpo de la petición no se puede leer" |
| `MethodArgumentTypeMismatchException` (parámetro con tipo inválido) | **400** | "Parámetro con formato inválido: {nombre}" |
| `BadCredentialsException` | **401** | "Credenciales inválidas" |
| `AccessDeniedException` (Spring Security) | **403** | "Acceso denegado" |
| `ForbiddenOperationException` | **403** | el mensaje de la excepción |
| `ResourceNotFoundException` | **404** | el mensaje de la excepción |
| `NoResourceFoundException` (ruta no mapeada) | **404** | "Recurso no encontrado" |
| `DuplicateResourceException` | **409** | el mensaje de la excepción |
| `BusinessRuleException` y subtipos sin handler propio | **422** | el mensaje de la excepción |
| `Exception` (cualquier otra) | **500** | "Ocurrió un error inesperado" (el detalle solo al log) |

Todas las respuestas pasan por un mismo método `build(...)` que arma un `ErrorResponse`
uniforme: `timestamp`, `status`, `error` (la frase estándar del código), `message`, `path`
y, cuando aplica, la lista de errores por campo. Así el cliente siempre recibe la misma
forma, cambie el código que cambie.

El punto clave de la jerarquía es cómo Spring elige el handler: **gana el más específico**.
`DuplicateResourceException` *es-un* `BusinessRuleException`, pero como tiene su propio
`@ExceptionHandler`, sale como 409, no como 422. Lo mismo `ForbiddenOperationException`
(403). En cambio `InvalidStateTransitionException`, `InvalidFileException`,
`InsufficientPointsException` y `PaymentException` no tienen handler propio: caen en el de
`BusinessRuleException` y salen como 422. Es exactamente lo que queremos: un 422 sensato
por defecto para toda regla de negocio, y un código más fino solo donde lo amerita.

### Convención de códigos para crear y borrar

- **201 Created** en todas las creaciones: registro de usuario, alta de punto de venta,
  alta de producto, creación de pedido y creación de reseña. El cuerpo lleva el recurso
  creado.
- **204 No Content** en los borrados (borrar punto de venta, borrar producto): el método
  devuelve `ResponseEntity<Void>` con `noContent().build()`.

Esta convención aplica a **todos** los endpoints de creación del backend, **incluido
`POST /api/auth/register`**. Importa anotarlo porque el registro y el webhook de la
pasarela son los dos endpoints que se mantienen **sin versionar** cuando el resto de la
API pase a `/api/v1/` (decisión que llega en otra fase del roadmap): el 201 del registro
se queda en `/api/auth/register`, no migra a `/api/v1/auth/register`. No agregamos cabecera
`Location` al registro porque no existe un endpoint que exponga el usuario por id (solo
`/api/usuarios/me`, relativo al autenticado); el cuerpo ya devuelve el id y el token, que
es lo que el cliente necesita.

### Las rutas no mapeadas devuelven 404

Cuando ninguna ruta hace match, Spring lanza `NoResourceFoundException`. La mapeamos
explícitamente a 404. Antes esa excepción caía en el manejador por defecto y salía como
500, lo que es engañoso: pedir una URL que no existe no es un error del servidor, es un
"no encontrado". El detalle de este cambio en el perfil de producción está en el ADR-0018.

## Defensa

### Por qué 422 y no 400 para las reglas de negocio

400 (Bad Request) y 422 (Unprocessable Entity) se confunden seguido. La distinción que
usamos: **400 es un problema de forma** —el servidor no pudo leer o enlazar el pedido: un
JSON roto, un campo obligatorio ausente, un id donde se esperaba un número—; **422 es un
problema de fondo** —el pedido está perfectamente formado y se entendió, pero viola una
regla de negocio: el pedido no puede pasar de `ENTREGADO` a `EN_PREPARACION`, el saldo de
QueuePoints no alcanza para el canje. Separarlos le dice al cliente qué hacer: ante un 400
arregla el formato del payload; ante un 422 el pedido no tiene sentido de negocio y no se
arregla reenviándolo igual.

### Por qué 409 para duplicados y 403 para operaciones prohibidas

409 (Conflict) es el código preciso para "el estado actual del recurso choca con tu
intento de crear": un correo ya registrado, una reseña repetida, un pago ya iniciado. Es
más informativo que un 422 genérico.

403 (Forbidden) lo usamos para una operación que el usuario autenticado **no tiene
permitido ejecutar** por su rol o por el estado del recurso —por ejemplo, "solo el rol
COMERCIO puede crear un punto de venta"—. Esto **no contradice** la decisión del ADR-0013
de responder 404 ante un acceso cruzado por id: ese 404 existe para **no revelar la
existencia** de un recurso ajeno a un atacante que prueba ids. El 403 de
`ForbiddenOperationException` es otro caso: no estamos escondiendo nada, simplemente la
operación está vedada para quien la pide. Mantenemos los dos criterios y su frontera
clara: ocultar existencia ajena -> 404; operación reconocida pero no permitida -> 403.

### Por qué una jerarquía y no excepciones planas

Colgar las siete de `BusinessRuleException` da dos cosas gratis. Primero, un **catch-all
seguro**: si mañana alguien agrega una regla de negocio y lanza una `BusinessRuleException`
pelada (o un subtipo nuevo sin handler), sale como 422, que es razonable, en vez de
filtrarse como 500. Segundo, **compatibilidad con los tests**: las pruebas de servicio que
asertan `assertThatThrownBy(...).isInstanceOf(BusinessRuleException.class)` siguen pasando
para los subtipos, porque un `DuplicateResourceException` sigue siendo un
`BusinessRuleException`.

### Por qué un manejador central y no el código HTTP en cada throw

La alternativa de lanzar `ResponseStatusException` de Spring con el código en cada punto
mezcla un detalle de transporte (el número HTTP) con la lógica de dominio. Preferimos que
el dominio lance excepciones **semánticas** (`InsufficientPointsException`) y que un único
lugar —el manejador— decida el código. Si mañana cambiamos el código de una categoría, se
toca un solo `@ExceptionHandler`, no decenas de `throw` repartidos.

## Alternativas consideradas

### Alternativa 1 — Una sola excepción genérica con un campo de código

Una `AppException` con un `int httpStatus`. Descartada: obliga a cada `throw` a conocer y
elegir el código HTTP (otra vez transporte mezclado con dominio), y el tipo deja de decir
qué clase de problema es. Las excepciones tipadas se leen mejor en el `throw` y en el test.

### Alternativa 2 — `ResponseStatusException` de Spring en cada throw

Usar la excepción de Spring que ya lleva el código. Descartada por lo mismo de la sección
anterior: acopla el dominio al transporte y dispersa la decisión del código.

### Alternativa 3 — Excepciones planas, todas heredando de `RuntimeException`

Sin la raíz `BusinessRuleException`. Descartada: se pierde el catch-all de 422 (todo
subtipo nuevo sin handler se iría a 500) y se rompen los tests que asertan
`isInstanceOf(BusinessRuleException)`.

### Alternativa 4 — Responder 404 también para operaciones prohibidas

Llevar el criterio de IDOR del ADR-0013 (404 para no revelar existencia) a toda operación
no permitida. Descartada: cuando el recurso es del propio usuario y solo falta el permiso
por rol o estado, un 403 es honesto y más útil para el cliente, y no filtra existencia de
nada ajeno. El 404 lo reservamos para el caso de acceso cruzado por id del ADR-0013.

## Consecuencias

### Positivas

- **Contrato de errores predecible y REST-correcto.** Cada situación tiene su código y su
  cuerpo uniforme; los clientes pueden ramificar por el status.
- **Cada `throw` expresa intención de dominio**, y el código HTTP es responsabilidad de un
  único manejador.
- **Sin 500 accidentales para reglas de negocio.** El catch-all de 422 cubre cualquier
  subtipo nuevo.
- **404 honesto en rutas inexistentes**, en lugar del 500 anterior.
- **201 y 204 donde corresponde**, que es lo que espera un cliente REST y la rúbrica.

### Negativas

- **Más clases que mantener** (ocho excepciones). Mitigación: son triviales, un constructor
  cada una, y su docstring documenta a qué código mapean.
- **Hay que respetar la especificidad de `@ExceptionHandler`.** Quien agregue un subtipo de
  `BusinessRuleException` que necesite un código propio debe agregarle su handler; si no,
  hereda 422 (que suele estar bien, pero hay que tenerlo presente).

### Riesgos

- **Un subtipo nuevo sin handler hereda 422 en silencio.** Si alguien esperaba otro código
  para esa categoría y se olvida del handler, sale 422 sin avisar. Mitigación: esta tabla y
  el docstring de cada excepción dejan por escrito el mapeo esperado.
- **El 401 y el 403 de seguridad dependen de Spring Security.** `BadCredentialsException` y
  `AccessDeniedException` los lanza la cadena de filtros; un cambio en esa cadena podría
  alterar qué excepción llega al manejador. Mitigación: están cubiertos por los tests de
  controlador con `@WithMockUser`.

## Anexo — Glosario de términos técnicos

**Código de estado HTTP.** El número que encabeza toda respuesta HTTP y resume el
resultado. Las familias: 2xx éxito, 4xx error del cliente, 5xx error del servidor.

- **200 OK** — éxito genérico (lo usamos en lecturas y en el login).
- **201 Created** — se creó un recurso. Ejemplo: `POST /api/auth/register` o el alta de un
  producto devuelven 201 con el recurso creado en el cuerpo.
- **204 No Content** — la operación salió bien y no hay cuerpo que devolver. Ejemplo:
  borrar un producto.
- **400 Bad Request** — el servidor no pudo leer o enlazar el pedido. Ejemplo: un JSON
  roto, un campo `@NotBlank` vacío, un id no numérico en la URL.
- **401 Unauthorized** — falta autenticación o las credenciales son inválidas. Ejemplo:
  login con contraseña incorrecta.
- **403 Forbidden** — autenticado, pero sin permiso para esta operación. Ejemplo: un
  CLIENTE intentando crear un punto de venta.
- **404 Not Found** — el recurso o la ruta no existen. Ejemplo: un id que no está, o una
  URL que no corresponde a ningún endpoint.
- **409 Conflict** — el estado actual choca con lo que se intenta crear. Ejemplo:
  registrarse con un correo ya usado.
- **422 Unprocessable Entity** — el pedido está bien formado pero viola una regla de
  negocio. Ejemplo: canjear más QueuePoints de los que hay de saldo.
- **500 Internal Server Error** — un error inesperado del servidor. El cliente ve un
  mensaje genérico; el detalle queda solo en el log (ver ADR-0018).

**`@RestControllerAdvice`.** Anotación de Spring que marca una clase como manejador global
de excepciones para todos los controllers REST. Permite atrapar excepciones en un solo
lugar y devolver una respuesta uniforme, en vez de un `try/catch` por endpoint.

Ejemplo concreto: `GlobalExceptionHandler` atrapa una `DuplicateResourceException` lanzada
en cualquier servicio y responde 409, sin que el controller tenga que saber nada.

**`@ExceptionHandler`.** Anotación dentro del advice que asocia un método con un tipo de
excepción. Spring, ante una excepción, busca el `@ExceptionHandler` cuyo tipo sea el más
específico que la cubra.

Ejemplo concreto: hay un `@ExceptionHandler(DuplicateResourceException.class)` y otro
`@ExceptionHandler(BusinessRuleException.class)`. Como el primero es más específico, una
`DuplicateResourceException` cae ahí (409) aunque también sea una `BusinessRuleException`.

**Unprocessable Entity (422) vs. Bad Request (400).** 400 es problema de forma (el servidor
no entendió el pedido); 422 es problema de fondo (lo entendió, pero rompe una regla). La
distinción guía al cliente: ante 400 corrige el formato; ante 422 el pedido no tiene
sentido de negocio.

## Referencias

- ADR-0013 — Integración con pasarela de pagos (criterio de 404 ante acceso cruzado por id;
  frontera con el 403 de este ADR; el "pago ya iniciado" mapea a 409).
- ADR-0018 — Hardening del perfil de producción (rutas no mapeadas a 404; los 500 no
  exponen detalles al cliente).
- `backend/src/main/java/pe/edu/utec/queueless/shared/exception/GlobalExceptionHandler.java` — el manejador y el mapeo completo.
- `backend/src/main/java/pe/edu/utec/queueless/shared/exception/BusinessRuleException.java` — la raíz catch-all (422).
- `backend/src/main/java/pe/edu/utec/queueless/shared/exception/ResourceNotFoundException.java` — la rama de 404.
- `backend/src/main/java/pe/edu/utec/queueless/shared/exception/` — los seis subtipos (`DuplicateResourceException`, `ForbiddenOperationException`, `InvalidStateTransitionException`, `InvalidFileException`, `InsufficientPointsException`, `PaymentException`).
- `backend/src/main/java/pe/edu/utec/queueless/shared/exception/ErrorResponse.java` — la forma uniforme de la respuesta de error.
- `backend/src/main/java/pe/edu/utec/queueless/auth/controller/AuthController.java` — 201 en el registro.
- `backend/src/main/java/pe/edu/utec/queueless/puntoventa/controller/ComercioPuntoDeVentaController.java`, `ComercioProductoController.java` — 201 al crear, 204 al borrar.
