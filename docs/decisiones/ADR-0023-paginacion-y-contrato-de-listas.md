# ADR-0023 — Paginación de historiales y contrato de respuesta de listas

## Contexto

Desde el P1, todas las respuestas de la API salen con el mismo envoltorio: una
clase `ApiResponse<T>` con tres campos, `success`, `data` y `message`. El
controller nunca devuelve una entidad ni una lista "pelada": siempre la mete
adentro de ese sobre. Es una convención que se respetó en los catorce
controllers, pero que nunca quedó escrita en un ADR: nació como decisión de
implementación y se quedó sin hogar. Este ADR la fija, porque la paginación que
sumamos ahora es, en el fondo, una extensión de ese mismo contrato.

El problema concreto que dispara el cambio: hay cinco listados que **crecen sin
tope** con el uso del sistema y hoy se devuelven enteros en una sola respuesta.

- Los pedidos de un cliente (`/api/v1/cliente/pedidos`).
- Los movimientos de QueuePoints de un usuario (`/api/v1/me/queuepoints/movimientos`).
- Las reseñas de un punto de venta (`/api/v1/puntos-de-venta/{id}/resenas`).
- Las reseñas de un repartidor (`/api/v1/repartidores/{id}/resenas`).
- Las entregas de un repartidor (`/api/v1/repartidor/mis-entregas`).

Un cliente con dos años de pedidos, o un local con miles de reseñas, harían que
esos endpoints devuelvan listas enormes: lentas de serializar en el backend,
pesadas de transferir y de renderizar en la app. El resto de las listas del
sistema **no** tienen este problema y se quedan como están (lo detallamos abajo).

Este ADR fija cómo paginamos esos cinco historiales y, de paso, deja documentado
el contrato de respuesta de las listas para toda la API.

## Decisión

### El envoltorio `ApiResponse<T>` que ya usábamos

Lo elevamos de convención tácita a decisión registrada. Toda respuesta exitosa
viaja en:

```java
public class ApiResponse<T> {
    private final boolean success;   // true en respuestas OK
    private final T data;            // el payload (objeto, lista o página)
    private final String message;    // opcional, para un texto al usuario
}
```

Se arma con las fábricas `ApiResponse.ok(data)` o `ApiResponse.ok(data,
message)`. Los errores no usan este sobre: los maneja el `@RestControllerAdvice`
con su propia forma (ADR-0019). Vive en `shared/dto/ApiResponse.java`.

### Qué paginamos y qué no

Paginamos **solo los cinco historiales** de arriba. Quedan **sin paginar**, a
propósito:

- Las **colas vivas**: la cola de pedidos del comercio y los pedidos disponibles
  para repartidores. Son vistas de "lo que está pasando ahora", acotadas por
  estado (un local no tiene mil pedidos activos a la vez), y su actualización en
  vivo la resuelve el canal de tiempo real (ADR-0024), no la paginación.
- Las **listas acotadas**: el catálogo de productos de un local y la lista de
  puntos de venta. No crecen sin control; un menú tiene decenas de ítems, no
  decenas de miles.

Meter paginación donde no hace falta solo agrega fricción al cliente sin ganar
nada.

### La lista paginada viaja como `ApiResponse<PageResponse<T>>`

Reusamos `PageResponse<T>`, que ya existía en `shared/dto` esperando este
momento. Es la traducción de un `Page<T>` de Spring Data a una forma estable y
propia, para no filtrar la clase `Page` de la librería en el contrato público:

```java
public class PageResponse<T> {
    private final List<T> content;     // los elementos de ESTA página
    private final int page;            // número de página, empezando en 0
    private final int size;            // tamaño de página efectivo
    private final long totalElements;  // total de elementos en todas las páginas
    private final int totalPages;      // total de páginas
}
```

Se construye con `PageResponse.of(page)`. Para el cliente, el cambio de contrato
es: lo que antes venía como un arreglo en `data`, ahora viene como un objeto en
`data`, con el arreglo adentro de `data.content` y la metadata al lado.

### Paginación por offset con `page` y `size`

Usamos paginación por offset: el cliente pide un número de página y un tamaño
(`?page=2&size=20`) y el backend traduce eso a un `LIMIT`/`OFFSET` contra
Postgres, vía el `Pageable` de Spring Data. La página empieza en `0`, igual que
el campo `page` de `PageResponse`, para que pedir y leer usen el mismo criterio.

### Orden natural de cada historial, con desempate por `id`

Cada historial conserva el orden que ya tenía y le agrega el `id` como segundo
criterio:

- Pedidos del cliente: por `creadoAt` descendente, luego `id`.
- Movimientos de QueuePoints: por `createdAt` descendente, luego `id` (ya lo
  tenía; ver ADR-0008).
- Reseñas (de local y de repartidor): por `createdAt` descendente, luego `id`.
- Entregas del repartidor: por `asignadoAt` descendente, luego `id`.

El desempate por `id` es lo que hace que la paginación sea **estable** (ver el
glosario y la defensa más abajo). En las entregas ordenamos por `asignadoAt` y
no por `entregadoAt` a propósito: toda entrega que aparece en el historial ya
fue asignada a ese repartidor, así que `asignadoAt` siempre tiene valor, mientras
que `entregadoAt` es `null` hasta que la entrega se completa.

### Tamaño por defecto 20, máximo 100

Lo configuramos una sola vez, en `application.yml`, y Spring lo aplica a todo
`Pageable` que resuelve:

```yaml
spring:
  data:
    web:
      pageable:
        default-page-size: 20
        max-page-size: 100
        one-indexed-parameters: false
```

Si el cliente no manda `size`, recibe 20. Si pide más de 100, Spring lo recorta a
100 antes de que la petición llegue al servicio: nadie puede pedir "todo de una"
disfrazándolo de `?size=999999`.

### El orden lo fija el servidor, no el cliente

El orden de cada historial lo define el repositorio (está en el nombre del
método derivado). El servicio descarta cualquier `sort` que venga del cliente:
rearma el `Pageable` quedándose solo con la página y el tamaño. Así el orden es
siempre el mismo entre páginas y la paginación no se rompe.

## Por qué documentamos el envoltorio recién ahora

El sobre `ApiResponse` funcionó bien dos fases sin estar en un ADR, así que la
pregunta es por qué escribirlo ahora y no antes. La respuesta es que recién ahora
**cambia**: la paginación le suma una forma nueva (`PageResponse` adentro de
`data`) y un tope de tamaño que afecta a quien consume la API. Documentar el
contrato en el mismo momento en que se amplía es más honesto que dejarlo otra vez
implícito; y deja un lugar al que apuntar cuando alguien pregunte "¿cómo
responden las listas de QueueLess?".

## Por qué offset y no paginación por cursor

La paginación por cursor (o *keyset*) es más eficiente en tablas gigantes porque
no paga el costo del `OFFSET`, pero a cambio pierde algo que para nosotros vale
mucho: poder saltar a una página arbitraria y saber cuántas páginas hay en total
(`totalPages`). La app de QueueLess quiere mostrar "página 3 de 12" y dejar al
usuario ir y volver; con cursores eso no sale gratis. Y nuestra escala —los
historiales de un campus universitario— está lejos de donde el `OFFSET` empieza a
doler. Si algún día un historial llega a millones de filas, reconsideramos
cursores para ese endpoint puntual.

## Por qué el desempate por `id`

Sin un segundo criterio de orden, dos filas con el mismo valor en el primer
criterio quedan en un orden que la base no garantiza entre una consulta y otra.
Con paginación eso es un problema real: si ordenás solo por fecha y diez
movimientos comparten la misma fecha, la fila que cae en el borde entre la página
0 y la página 1 puede aparecer dos veces o no aparecer nunca, según cómo Postgres
resuelva el empate en cada consulta. El caso no es teórico: la columna
`created_at` de los movimientos se llena con el timestamp del inicio de la
transacción, así que todos los movimientos creados juntos comparten fecha exacta.
Agregar `id` —que es único y monótono— como desempate vuelve el orden total y
determinístico, y la paginación deja de repetir o saltear filas.

## Por qué el servidor ignora el `sort` del cliente

El resolvedor de `Pageable` de Spring acepta un parámetro `?sort=` y lo aplicaría
sobre la consulta. Si lo dejáramos pasar, un cliente podría pedir un orden
distinto al que asume el desempate por `id`, y volveríamos al problema de páginas
que se pisan. Como ninguno de estos cinco historiales necesita que el cliente
elija el orden —cada uno tiene un orden natural claro—, el servicio se queda solo
con la página y el tamaño y fija el orden él mismo. Es una línea de más en cada
servicio, pero garantiza que la promesa de "paginación estable" se cumpla pase lo
que pase desde el cliente.

## Alternativas consideradas

### Alternativa 1 — Seguir devolviendo la lista completa

No paginar y devolver todo el historial en cada llamada. Lo descartamos porque:
es exactamente el problema que vinimos a resolver. Un historial que crece sin
tope termina siendo lento de serializar, pesado de transferir y caro de
renderizar; el día que duela, ya es tarde.

### Alternativa 2 — Paginación por cursor (keyset)

Paginar con un cursor (el último `id`/fecha visto) en vez de número de página. Lo
descartamos porque pierde `totalPages` y el salto a página arbitraria, que la UI
quiere, y porque su ventaja de rendimiento solo aparece a una escala que no
tenemos. Queda como camino futuro para un endpoint puntual si alguna tabla se
vuelve enorme.

### Alternativa 3 — Dejar que el cliente elija el orden con `?sort=`

Aceptar el `sort` que mande el cliente. Lo descartamos porque abre la puerta a
órdenes que rompen el desempate por `id` y, con eso, la estabilidad de la
paginación. El orden de un historial es una decisión del dominio (el más reciente
primero), no una preferencia del cliente.

### Alternativa 4 — Un envoltorio nuevo solo para listas paginadas

Inventar una respuesta distinta para las listas en vez de meter `PageResponse`
dentro del `ApiResponse` de siempre. Lo descartamos porque parte el contrato en
dos: el cliente tendría que tratar las listas distinto del resto. Reusar
`ApiResponse<PageResponse<T>>` mantiene una sola forma (`success`/`data`/
`message`) para toda la API; lo único que cambia es qué hay adentro de `data`.

## Consecuencias

### Positivas

- **Respuestas acotadas.** Ningún historial puede devolver más de 100 elementos
  por llamada, sin importar cuánto haya crecido.
- **Paginación estable.** El desempate por `id` y el orden fijado por el servidor
  garantizan que recorrer las páginas no repita ni saltee filas.
- **Contrato documentado.** El envoltorio de respuesta de las listas queda por
  fin escrito, y Swagger (ADR-0004) lo refleja con el esquema de `PageResponse`.
- **Una sola forma de respuesta.** Reusar `ApiResponse` mantiene la coherencia
  con el resto de la API.

### Negativas

- **Cambio de contrato para los cinco endpoints.** Lo que venía como arreglo en
  `data` ahora viene en `data.content`. Mitigación: actualizamos los consumidores
  que teníamos (el test del historial de QueuePoints y la colección de Postman) en
  el mismo cambio; el frontend todavía no consume estos endpoints, así que no hay
  ruptura en producción.
- **Una línea de más por servicio** para descartar el `sort` del cliente.
  Mitigación: va con un comentario que explica el porqué, así no se "limpia" por
  error en el futuro.

### Riesgos

- **Que un endpoint de lista nuevo se olvide de paginar y vuelva al problema
  original.** Mitigación: este ADR deja la pauta de cuándo paginar (historiales
  que crecen) y cuándo no (colas vivas, listas acotadas), y la convención de
  `ApiResponse<PageResponse<T>>` para imitarla.
- **Que alguien quite el desempate por `id` al tocar un order-by.** Mitigación: un
  test de integración recorre las páginas y verifica que no haya filas repetidas
  ni salteadas; si alguien rompe el orden estable, el test lo agarra.

## Anexo — Glosario de términos técnicos

**Paginación por offset.** Partir una lista larga en páginas y pedirlas por
número de página y tamaño; la base devuelve solo el tramo pedido con
`LIMIT`/`OFFSET`. Lo opuesto es traer todo de una.

Ejemplo concreto: `GET /api/v1/me/queuepoints/movimientos?page=1&size=20`
devuelve los movimientos del 21 al 40 del usuario, no todos.

**`Pageable` y `Page<T>` (Spring Data).** `Pageable` es el objeto que describe
qué página se pide (número, tamaño, orden). `Page<T>` es lo que devuelve el
repositorio: los elementos de esa página más la metadata (total de elementos,
total de páginas). Spring arma el `Pageable` solo, a partir de los parámetros
`page` y `size` de la URL.

Ejemplo concreto: el método `findByClienteIdOrderByCreadoAtDescIdDesc(clienteId,
pageable)` de `PedidoRepository` recibe un `Pageable` y devuelve un
`Page<Pedido>` con, por ejemplo, 20 pedidos y el dato de que hay 137 en total.

**`PageResponse<T>`.** Nuestra clase propia que traduce un `Page<T>` a la forma
que viaja por la API, para no exponer la clase `Page` de Spring en el contrato.
Tiene `content`, `page`, `size`, `totalElements` y `totalPages`.

Ejemplo concreto: `PageResponse.of(paginaDePedidos)` produce
`{ "content": [...20 pedidos...], "page": 0, "size": 20, "totalElements": 137,
"totalPages": 7 }`, y eso es lo que el controller mete en `data`.

**Desempate (tie-breaker).** Un segundo criterio de orden que se aplica cuando el
primero empata, para que el orden sea total y no quede librado a la base. Sin él,
dos filas "iguales" según el primer criterio pueden salir en cualquier orden.

Ejemplo concreto: ordenar los movimientos por `created_at DESC, id DESC`. Si tres
movimientos comparten el mismo `created_at`, el `id DESC` decide cuál va primero,
siempre igual, así no se repiten ni se saltean entre páginas.

**`default-page-size` y `max-page-size`.** Dos propiedades de Spring Data web. La
primera es el tamaño de página que se usa si el cliente no manda `size`; la
segunda es el tope: si pide más, se recorta a ese máximo.

Ejemplo concreto: con `default-page-size: 20` y `max-page-size: 100`, una llamada
sin `size` trae 20 elementos, y una con `?size=500` trae 100 (recortado), nunca
500.

**`one-indexed-parameters`.** Propiedad que decide si la primera página es la `0`
(en `false`) o la `1` (en `true`). La dejamos en `false` para que el `page` que se
pide y el `page` que devuelve `PageResponse` signifiquen lo mismo.

Ejemplo concreto: con `one-indexed-parameters: false`, `?page=0` es la primera
página y la respuesta trae `"page": 0`. No hay un "corrimiento de uno" entre lo
que se pide y lo que se lee.

**Contrato de respuesta (envelope).** La forma fija con la que la API envuelve
toda respuesta, para que el cliente sepa qué esperar siempre. En QueueLess es
`ApiResponse` (`success`, `data`, `message`); para listas paginadas, el `data`
contiene un `PageResponse`.

Ejemplo concreto: tanto `GET /api/v1/cliente/pedidos/{id}` (un pedido) como
`GET /api/v1/cliente/pedidos` (la lista paginada) responden con el mismo sobre
`{ success, data, message }`; lo único que cambia es si `data` es un pedido o un
`PageResponse` de pedidos.

## Referencias

- ADR-0004 — Swagger / OpenAPI (la documentación ahora muestra el esquema de
  `PageResponse` en los endpoints de lista).
- ADR-0008 — Ledger pattern para QueuePoints (de ahí viene el orden
  `created_at DESC, id DESC` de los movimientos, ya con desempate por id).
- ADR-0019 — Taxonomía de excepciones y códigos HTTP (la forma de las respuestas
  de error, que no usan este envoltorio).
- ADR-0022 — Versionado de la API bajo `/api/v1` (el otro tramo del contrato
  público: las URLs de estos endpoints).
- `backend/src/main/java/pe/edu/utec/queueless/shared/dto/ApiResponse.java` — el envoltorio de respuesta.
- `backend/src/main/java/pe/edu/utec/queueless/shared/dto/PageResponse.java` — la página traducida al contrato.
- `backend/src/main/resources/application.yml` — bloque `spring.data.web.pageable` (tamaño por defecto y máximo).
- Los cinco controllers y servicios paginados (paquetes `pedido`, `queuepoints`, `pedido.resena`, `delivery`).
- `backend/src/test/java/pe/edu/utec/queueless/queuepoints/repository/PaginacionMovimientosRepositoryIT.java` — test de paginación estable.
- `backend/src/test/java/pe/edu/utec/queueless/pedido/resena/PaginacionContratoMockMvcIT.java` — test del contrato y del tope de tamaño.
