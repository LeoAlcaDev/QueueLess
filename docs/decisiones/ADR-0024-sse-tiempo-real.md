# ADR-0024 — Actualización en vivo de pedidos con SSE (Server-Sent Events)

## Contexto

Hoy, cuando un pedido avanza de estado, el cliente y el comercio solo se enteran
si recargan la pantalla. La información ya existe y ya viaja: cada cambio de
estado publica un `PedidoEstadoCambiadoEvent` (ADR-0009), que hoy consumen el
listener de push (ADR-0016), el de correo (ADR-0021), el de reembolsos y el de
QueuePoints. Lo que falta es empujar ese cambio a la pantalla que está abierta,
para que se actualice sola.

La push ya cubre el caso de "la app está cerrada o en segundo plano". Pero cuando
el usuario está mirando la pantalla del pedido —el cliente siguiendo su pedido, o
el comercio mirando su cola—, mandar solo una push es pobre: la push es para
avisar, no para mantener una vista viva. Para eso queremos un canal en vivo,
servidor→cliente, mientras esa pantalla está abierta.

Este ADR fija cómo sumamos ese canal en vivo enganchándolo al evento que ya
existe, sin tocar el flujo del pedido ni el modelo de datos, y manteniéndolo
complementario al push igual que el correo (ADR-0021). **No agrega ninguna
entidad nueva.**

## Decisión

### SSE como segundo consumidor del evento que ya existe

Sumamos un listener nuevo, `PedidoSseListener`, que consume el mismo
`PedidoEstadoCambiadoEvent` con exactamente el mismo patrón que el listener de
push y el de correo (ADR-0009): `@Async("queuelessTaskExecutor")` +
`@TransactionalEventListener` en fase `AFTER_COMMIT` +
`@Transactional(propagation = REQUIRES_NEW, readOnly = true)`. Corre después del
commit y en otro hilo, y vuelve a leer el pedido en su propia transacción
read-only, porque el evento solo trae el id y acá necesitamos el cliente y el
punto de venta, que son lazy (igual que hace el listener de correo con los items).

Esto **no toca** `PedidoService`, ni la máquina de estados, ni el modelo de
datos. El módulo `pedido` ni se entera de que ahora hay un consumidor más.

### `SseEmitter` de Spring, no WebSocket

El flujo es de un solo sentido: el servidor empuja cambios al cliente, y el
cliente no responde nada por ese canal (las acciones del cliente siguen yendo por
los endpoints REST de siempre). Para eso usamos `SseEmitter`, que viene en Spring
Web; no agregamos ninguna dependencia. SSE es del tamaño correcto para un flujo
unidireccional y trae la reconexión automática gratis en el navegador (ver el
glosario y la defensa más abajo).

### Un registro en memoria, por cliente y por comercio

`RegistroSse` mantiene las conexiones `SseEmitter` abiertas, en dos grupos: por
cliente (la clave es el id del usuario cliente) y por comercio (la clave es el id
del usuario-comercio, que es el `gestor` del local). Cuando llega un evento, el
listener resuelve desde el pedido a quién le toca y le manda el cambio solo a esos
emisores: al cliente dueño del pedido (`pedido.cliente`) y al comercio dueño del
local (`pedido.puntoDeVenta.gestor`).

El registro es seguro para concurrencia porque lo tocan dos hilos a la vez: el del
request (al abrir o cerrar una conexión) y el del listener async (al repartir).
Usa un `ConcurrentHashMap` por grupo y, dentro de cada dueño, un
`CopyOnWriteArrayList` que se puede recorrer para enviar mientras otro hilo lo
modifica. El ciclo de vida lo maneja el propio registro: registra el emisor al
abrirse, y lo suelta cuando se completa, expira o falla (`onCompletion`,
`onTimeout`, `onError`); además, si un envío falla porque el cliente ya se fue,
suelta ese emisor en el momento. Así no quedan conexiones colgadas filtrando
memoria.

### Dos endpoints GET, con la identidad del usuario autenticado

Hay dos endpoints que abren la conexión, uno por rol:

- `GET /api/v1/cliente/pedidos/stream` — para el cliente, los cambios de sus
  propios pedidos.
- `GET /api/v1/comercio/pedidos/stream` — para el comercio, los cambios de los
  pedidos de sus locales.

La identidad del suscriptor sale del **usuario autenticado**
(`authentication.getName()` → `usuarioService.findByEmail`), **nunca de un
parámetro de la URL**. Esto es clave de seguridad: si el id viniera de la URL,
cualquiera podría suscribirse al stream de otro. Como los endpoints no reciben
ningún id, eso es imposible por construcción. La autorización por rol es la misma
del resto del sistema (ADR-0022): cada endpoint vive en un controller con
`@PreAuthorize` a nivel de clase (`hasRole('CLIENTE')` y `hasRole('COMERCIO')`), y
además cae bajo las reglas de URL `/api/v1/cliente/**` y `/api/v1/comercio/**` de
la cadena de filtros, así que están protegidos por las dos capas.

### Payload mínimo, sin el código del pedido

Lo que viaja por el stream (`CambioEstadoSse`) es deliberadamente mínimo:
`pedidoId`, `estadoAnterior`, `estadoNuevo`, `puntoDeVentaId` y `ocurridoAt`. El
mismo payload va al cliente y al comercio. **No incluye el `codigo` del pedido**:
ese código se reserva como una prueba que solo el cliente porta y muestra al
momento de la entrega, así que mandarlo en vivo al comercio lo dejaría sin esa
garantía. Si la app necesita más datos del pedido, los obtiene refrescando su
detalle por el endpoint REST, que es donde viven.

### Complementario al push, no en reemplazo

SSE y push cubren momentos distintos de la misma información: **SSE cuando la app
está abierta y mirando** (mantiene la vista viva), **push cuando está cerrada o en
segundo plano** (avisa). Es la misma lógica de canal complementario y best-effort
con la que el correo se sumó al push en ADR-0021: si el SSE falla, queda en un
`WARN` y el cambio del pedido no se ve afectado. No reexplicamos best-effort acá;
está en el glosario de ADR-0016 y ADR-0021.

### El backend es igual para web y móvil

El backend no distingue web de móvil: el mismo stream sirve a los dos. La única
asimetría vive en el cliente de frontend: en la web se consume con `EventSource`
(nativo del navegador) y en móvil con la librería `react-native-sse`, porque React
Native no trae `EventSource`. Eso es frontend, de una fase posterior; lo dejamos
anotado, no lo implementamos en este ADR.

## Por qué SSE y no WebSocket

WebSocket abre un canal bidireccional full-duplex: cliente y servidor pueden
hablar los dos por el mismo socket. Acá no necesitamos eso: el cliente nunca
responde por este canal, solo recibe. Pagar la complejidad de un protocolo
bidireccional (handshake propio, manejo de sesiones, una librería de cliente con
más superficie) para un flujo de un solo sentido es sobredimensionar. Encima, SSE
corre sobre HTTP común y trae la **reconexión automática** de fábrica en el
navegador: si la conexión se corta, el cliente la reabre solo. Con WebSocket esa
reconexión la tendríamos que escribir nosotros. Para "empujar avisos a una
pantalla abierta", SSE es exactamente del tamaño correcto.

## Por qué un segundo consumidor del evento y no enviar desde `PedidoService`

La alternativa sería que `PedidoService`, justo después de cambiar el estado,
llame al registro y empuje el SSE. Lo evitamos por lo mismo que ADR-0009 evitó las
llamadas directas entre módulos: acoplaría `pedido` con el canal de tiempo real y
metería trabajo de red (repartir a N conexiones) en la ruta caliente del cambio de
estado, que el cliente espera. El patrón de evento + listener async ya resuelve las
dos cosas: `pedido` solo publica, y el reparto pasa después del commit, en otro
hilo. Sumar SSE es entonces crear un listener más, sin tocar nada de lo que ya
está.

## Por qué agrupamos al comercio por gestor y no por punto de venta

El registro de comercios usa como clave el id del usuario-comercio (el gestor), no
el id de cada punto de venta. Así, un comercio con varios locales recibe en un solo
stream los cambios de todos ellos, igual que su cola ya le muestra los pedidos de
todos sus locales juntos. Y, sobre todo, la identidad sale entera del usuario
autenticado: el comercio abre su stream y el backend resuelve qué locales son
suyos desde el `gestor` del pedido, sin que el comercio mande ningún id. Si más
adelante hiciera falta un stream por local puntual, se puede agregar la dimensión
del punto de venta como segunda clave; hoy no lo necesitamos.

## Alternativas consideradas

### Alternativa 1 — WebSocket

Un canal bidireccional. Lo descartamos porque sobra para un flujo de un solo
sentido y porque perderíamos la reconexión automática que SSE trae gratis, a
cambio de más complejidad de protocolo y de cliente.

### Alternativa 2 — Polling corto

Que la app pregunte cada pocos segundos "¿cambió algo?". Lo descartamos porque es
ineficiente (la mayoría de las preguntas vuelven sin novedad, cargando la base y
la red al pedo) y porque agrega retraso: el cambio se ve recién en el siguiente
ciclo de poll, no en el momento. SSE empuja el cambio apenas ocurre.

### Alternativa 3 — Redis pub/sub ahora

Mantener las conexiones coordinadas entre instancias con un bus externo desde ya.
Lo descartamos por el mismo razonamiento con que ADR-0009 descartó un broker
externo para los eventos: es infraestructura extra que no se justifica al MVP, que
corre en una sola instancia. Es, eso sí, el camino de escalado futuro (ver
Consecuencias y el glosario).

### Alternativa 4 — Enviar el SSE sincrónico dentro de `PedidoService`

Empujar el evento en el mismo `cambiarEstado`, sin listener. Lo descartamos porque
acopla el módulo `pedido` con el canal de tiempo real y mete latencia de reparto en
la ruta caliente del negocio. El patrón evento + async (ADR-0009) ya lo resuelve.

## Consecuencias

### Positivas

- **Pantallas que se actualizan solas.** El cliente y el comercio ven el avance del
  pedido sin recargar, mientras tienen la pantalla abierta.
- **Cero impacto en el flujo del pedido.** SSE es un consumidor más del evento, fuera
  de la transacción y en otro hilo; si falla, el cambio del pedido igual quedó.
- **Sin dependencias ni entidades nuevas.** `SseEmitter` viene en Spring Web; no se
  toca el modelo de datos.
- **Seguro por construcción.** La identidad sale del principal y no hay parámetro de
  id, así que nadie puede abrir el stream de otro.

### Negativas

- **Estado en memoria.** Las conexiones viven en la instancia; no sobreviven a un
  reinicio. Mitigación: no hace falta que sobrevivan —el navegador reconecta solo— y
  el detalle del pedido siempre está disponible por REST.
- **Un canal más que mantener.** Ahora la misma novedad puede salir por push y por
  SSE. Mitigación: es a propósito (cubren momentos distintos) y los dos son
  best-effort, así que un fallo de uno no rompe nada.

### Riesgos

- **Una sola instancia.** El registro en memoria funciona perfecto con una instancia
  (nuestro caso en P2). Con varias detrás de un balanceador, un cliente conectado a
  la instancia A no recibiría un evento procesado por la instancia B. Mitigación
  documentada: un bus externo tipo Redis pub/sub para compartir los eventos entre
  instancias; es el camino de escalado, no se implementa al MVP.
- **Conexiones que se acumulan.** Si no soltáramos los emisores muertos, irían
  ocupando memoria. Mitigación: el registro los suelta en `onCompletion`/`onTimeout`/
  `onError` y también cuando un envío falla; las conexiones tienen un timeout de 30
  minutos tras el cual se cierran y el navegador reconecta.

## Anexo — Glosario de términos técnicos

**SSE (Server-Sent Events).** Una forma estándar de que el servidor empuje datos al
cliente sobre una conexión HTTP que queda abierta, en un solo sentido
(servidor→cliente). El cliente no manda nada por ese canal; solo escucha.

Ejemplo concreto: cuando el pedido 42 pasa a `LISTO_PARA_RECOGER`, el backend
empuja por la conexión abierta del cliente un evento `pedido-estado` con el cambio,
y la pantalla de seguimiento se actualiza sola, sin recargar ni preguntar.

**`SseEmitter`.** La clase de Spring Web que representa, del lado del servidor, una
de esas conexiones abiertas. Un controller la devuelve y el servidor le hace
`.send(...)` cada vez que tiene algo para empujar.

Ejemplo concreto: `emitter.send(SseEmitter.event().name("pedido-estado").data(payload))`
manda el cambio al cliente conectado. Si el cliente ya cerró la app, ese `.send`
falla y el registro suelta el emisor.

**`EventSource` y `react-native-sse`.** El lado del cliente que abre la conexión SSE
y escucha los eventos. En la web es `EventSource`, que ya trae el navegador; en
móvil (React Native) no existe `EventSource` nativo y se usa la librería
`react-native-sse`.

Ejemplo concreto: en la web, `new EventSource("/api/v1/cliente/pedidos/stream")` y
después `es.addEventListener("pedido-estado", e => ...)` recibe cada cambio. Esto es
frontend, de una fase posterior; el backend es el mismo para los dos.

**Reconexión automática.** SSE trae de fábrica, en el navegador, que si la conexión
se corta el cliente la reabre solo. No hay que escribir código de reintento.

Ejemplo concreto: cuando una conexión llega a su timeout de 30 minutos y la
soltamos, el `EventSource` del navegador reconecta solo y sigue recibiendo, sin que
el usuario note nada.

**`ConcurrentHashMap` y `CopyOnWriteArrayList`.** Estructuras de datos pensadas para
que varios hilos las usen a la vez sin corromperse ni lanzar errores. La primera es
un mapa concurrente; la segunda, una lista que al modificarse copia su contenido, de
modo que recorrerla mientras otro hilo la cambia es seguro.

Ejemplo concreto: el hilo del request agrega un emisor cuando el cliente abre el
stream, justo mientras el hilo async del listener recorre esa misma lista para
repartir un evento. Con estas estructuras, esa coincidencia no rompe nada ni lanza
`ConcurrentModificationException`.

**Bus de mensajes (Redis pub/sub).** Un canal externo donde un proceso publica y
otros reciben, para coordinar varias instancias del backend. Sirve cuando las
conexiones viven repartidas entre instancias distintas.

Ejemplo concreto: si mañana corriéramos dos instancias detrás de un balanceador, un
cliente conectado a la instancia A no recibiría un evento que procesó la instancia
B. Con un Redis pub/sub, B publica el evento en el bus y A se lo reenvía a su cliente
conectado. Hoy, con una sola instancia, no hace falta.

## Referencias

- ADR-0009 — Eventos de dominio (el patrón `@TransactionalEventListener` después del
  commit + `@Async` que reusa el listener de SSE; el `PedidoEstadoCambiadoEvent`).
- ADR-0016 — Notificaciones push con Firebase (el canal con el que SSE convive;
  definición de best-effort).
- ADR-0021 — Email complementario al push (mismo criterio de canal complementario
  que aplicamos acá; best-effort).
- ADR-0022 — Versionado y autorización por método (las URLs `/api/v1/` y el
  `@PreAuthorize` por rol que protegen los dos endpoints de stream).
- `backend/src/main/java/pe/edu/utec/queueless/sse/RegistroSse.java` — el registro en memoria de conexiones.
- `backend/src/main/java/pe/edu/utec/queueless/sse/PedidoSseListener.java` — el listener que reparte el evento.
- `backend/src/main/java/pe/edu/utec/queueless/sse/ClientePedidoStreamController.java` y `ComercioPedidoStreamController.java` — los dos endpoints GET.
- `backend/src/main/java/pe/edu/utec/queueless/sse/dto/CambioEstadoSse.java` — el payload mínimo.
- `backend/src/test/java/pe/edu/utec/queueless/sse/RegistroSseTest.java` — el test de aislamiento por dueño.
