# ADR-0027 — Validación de entrega por código en recojo y delivery

## Contexto

Hasta ahora un pedido se daba por entregado con la sola palabra de una de las
partes. En **recojo en tienda**, el comercio llama a `marcarEntregado` y el
pedido pasa a `ENTREGADO` sin ninguna prueba de que el cliente recibió. En
**delivery**, el repartidor llama a `confirmarEntrega`, y ese cierre no solo
termina el pedido: es la transición a `ENTREGADO` la que dispara el listener que
le **acredita 50 QueuePoints al repartidor** (el mecanismo está en ADR-0014, y el
ledger que los registra, en ADR-0008). Es decir, en delivery el cierre mueve
dinero-en-puntos, y lo hacía sin que nadie probara la entrega.

La pieza para cerrar ese hueco ya existía y no la estábamos usando. Cada pedido
nace con un `codigo` único —un `String` con formato `QL-AAMMDD-XXXXX`, generado
con `SecureRandom`— que hasta hoy solo servía como identificador legible. Esta
fase lo convierte en la **prueba de la entrega**: el cliente lo porta, la
contraparte lo valida (tecleándolo o escaneando un QR), y el cierre solo procede
si coincide.

Hay una decisión previa que esta fase completa. En ADR-0024 ya habíamos resuelto
**no mandar el código por el canal SSE**, con el argumento de que es una prueba
que solo el cliente porta y que mandárselo en vivo al comercio lo dejaría sin esa
garantía. Pero esa protección estaba a medias: el canal REST seguía entregando el
código a la contraparte. `PedidoResponse` lo incluía y se devolvía igual al
comercio que al cliente, y `SolicitudDeliveryResponse` se lo mostraba al
repartidor. Con el código a la vista de quien valida, exigirlo no probaría nada.
Así que esta fase tiene dos mitades inseparables: **empezar a exigir el código** y
**ocultárselo a quien valida**.

Damos por sentadas, y solo referenciamos, varias decisiones ya tomadas: el flujo
de entrega del delivery y quién dispara cada transición (ADR-0014), el ledger de
QueuePoints y su idempotencia (ADR-0008), la taxonomía de excepciones y el código
HTTP de un error de negocio (ADR-0019), la autorización por rol y la identidad
tomada del usuario autenticado y no de un parámetro (ADR-0022), y el criterio de
no exponer el código por SSE (ADR-0024).

## Decisión

### El código del pedido se vuelve la prueba de entrega

Adoptamos el `codigo` que el pedido ya tiene como la prueba de que la entrega
ocurrió. El cliente lo lleva consigo; la contraparte —el comercio en recojo, el
repartidor en delivery— se lo pide al momento de entregar y lo valida contra el
del pedido. Si coincide, el pedido se cierra; si no, no. Vale igual tecleado a
mano que escaneado por QR, porque las dos formas terminan siendo el mismo string
viajando al mismo endpoint.

### Recojo: `marcarEntregado` exige el código

En recojo en tienda, `marcarEntregado` pasa a recibir el código en el cuerpo del
request y a rechazar el cierre si no coincide con el del pedido. Acá no hay puntos
en juego para nadie —el listener de QueuePoints solo acredita cuando el pedido
tuvo una solicitud de delivery asociada (ADR-0014), y un recojo no la tiene—, así
que lo que protege la validación es la **integridad** del estado `ENTREGADO`: que
no se marque como recibido algo que el cliente nunca recibió.

### Delivery: `confirmarEntrega` exige el código

En delivery, `confirmarEntrega` pasa a exigir el código antes de cerrar. Recién
con el código correcto la solicitud pasa a `ENTREGADO`, el pedido transiciona a
`ENTREGADO` y, como consecuencia de esa transición, se le acreditan los puntos al
repartidor. Validamos **antes** de tocar cualquier estado: si el código no
coincide, no hay transición, y como los puntos cuelgan de la transición a
`ENTREGADO`, tampoco hay puntos. Esto ata el fraude al origen —no se puede cobrar
una entrega que no se hizo— en vez de tener que detectarlo y revertirlo después.

### El QR no es un segundo camino de validación

El QR no agrega una vía de validación distinta: **codifica exactamente el mismo
código**. Cuando la contraparte lo escanea, su app (frontend, de una fase
posterior) lo decodifica al mismo string y lo manda al mismo endpoint que usaría
si lo hubiera tecleado. El backend valida igual venga de donde venga: una sola
lógica de comparación, y dos maneras de que el código llegue hasta ella. El
backend **no decodifica imágenes de QR** ni recibe imagen alguna en la
validación; solo recibe el string del código. La única imagen que el backend
produce es la del QR del propio cliente, para que la muestre (ver más abajo).

### Ocultamos el código a quien valida

El código deja de viajar a quien tiene que validarlo. El cliente lo sigue viendo
en sus propios pedidos —lo necesita para mostrarlo en el mostrador y para su QR—,
pero el comercio y el repartidor ya no. Es la misma idea con la que en ADR-0024
decidimos no mandar el código por SSE; acá la llevamos también al canal REST,
que era por donde se seguía filtrando.

En concreto, el código queda expuesto en **un solo lugar**: la vista que el
cliente tiene de sus propios pedidos. Para el comercio omitimos el código de su
vista del pedido (su cola y su detalle, y también las respuestas de las acciones
que mueve sobre el pedido, que usan la misma representación). Para el repartidor,
el código sale por completo de la representación de la solicitud de delivery.

### Comparamos sin distinguir mayúsculas, y lo dejamos dicho

La comparación del código recortar los espacios sobrantes y **no distingue
mayúsculas de minúsculas**. Lo decidimos así a propósito y bajo un supuesto que
conviene dejar escrito: el alfabeto con el que hoy se arma el código son las
letras `A`–`Z` y los dígitos `0`–`9`, donde no hay un par de caracteres que se
diferencien solo por la caja. Comparar sin distinguir mayúsculas nos deja tolerar
que una persona teclee el código en minúscula en el mostrador, sin perder
precisión, porque en ese alfabeto "ab7k9" y "AB7K9" no pueden ser dos códigos
distintos. Un QR, por su parte, siempre devuelve el código tal como se generó, en
mayúsculas. Dejamos asentado el supuesto para que esto no sea un detalle implícito
que se rompa en silencio si algún día el alfabeto pasara a distinguir la caja: ese
día habría que volver a una comparación exacta.

### No cambiamos cómo se genera el código

La generación del código no se toca. Ya era legible y es suficientemente segura
para su modelo de amenaza, y lo defendemos abajo. Lo único que cambia es que
**ahora lo exigimos**.

### El QR se expone al cliente, y solo al dueño

El cliente puede pedir el QR de su pedido. Lo servimos como una imagen que se
genera al vuelo a partir del código —no se guarda nada— y solo se lo damos al
dueño del pedido. La identidad sale del usuario autenticado, igual que en el SSE
(ADR-0024) y como manda ADR-0022, nunca de un parámetro de la URL: el endpoint
recibe el id del pedido, pero la pertenencia se verifica contra el cliente
autenticado, y un pedido ajeno se ve como inexistente (404), con el mismo criterio
de no revelar existencia que el resto del proyecto.

### Sin estado nuevo y sin migración

No agregamos ningún estado ni tocamos la máquina de estados: las transiciones a
`ENTREGADO` son las mismas de siempre, solo que ahora tienen una precondición más
—que el código coincida—. Tampoco hay migración: el campo `codigo` existe desde la
primera versión del esquema y el QR se calcula en el momento, no se persiste.

## Por qué atar el fraude al origen y no auditarlo después

La alternativa natural sería dejar que el cierre ocurra como hoy y, en paralelo,
construir alguna auditoría que después detecte las entregas marcadas sin que
hubieran ocurrido. La descartamos porque llega tarde: en delivery, para cuando la
auditoría detectara la entrega falsa, los puntos ya estarían acreditados y habría
que revertirlos —un flujo de reversión que hoy ni siquiera está implementado, solo
diseñado (ADR-0008)—. Validar el código en el momento del cierre corta el problema
antes de que exista: sin código correcto no hay transición a `ENTREGADO`, y sin
esa transición no hay nada que auditar ni que revertir. Es más barato y más
honesto pedir la prueba en el mostrador que reconstruirla después.

## Por qué ocultamos el código a quien valida

Una validación en la que el validador ya tiene la respuesta no valida nada. Si el
comercio ve el código en su cola, puede teclearlo y cerrar el pedido sin que el
cliente esté presente; si el repartidor lo ve en su solicitud, puede confirmar la
entrega desde la otra punta del campus. El valor de exigir el código depende por
completo de que el código lo tenga **solo** el cliente. Por eso ocultarlo de la
contraparte no es un extra: es la otra mitad de la misma decisión. Es,
exactamente, el razonamiento con el que ADR-0024 ya había sacado el código del
canal SSE; lo que hacía falta era aplicarlo también al canal REST, que es por
donde seguía saliendo.

Para el comercio elegimos omitir el código de la representación que ya usa, en vez
de armarle una representación nueva sin ese campo. El pedido que ve el comercio es
el mismo objeto que ve el cliente salvo por este único campo; duplicar toda la
estructura para quitar un dato sería sobre-modularizar sin ganancia. Lo único
sensible es el **valor** del código, no la existencia del campo, así que al
comercio le llega el campo en nulo y listo. Para el repartidor, en cambio, el
código sale entero de la representación de la solicitud: ahí no hay un cliente que
también la consuma para ese dato (el cliente ya tiene el código por su propia vista
del pedido), así que el campo no le hace falta a nadie y lo quitamos del todo.

## Modelo de amenaza: por qué la generación actual alcanza

El código se arma con un prefijo `QL-`, la fecha en formato `AAMMDD` en hora de
Lima, y un sufijo de cinco caracteres elegidos al azar con `SecureRandom` sobre un
alfabeto de 36 símbolos (las 26 letras y los 10 dígitos). La unicidad se garantiza
contra la base —se reintenta si el candidato ya existe— y por una restricción
`UNIQUE` en la columna.

La pregunta razonable es si cinco caracteres alcanzan. La respuesta es que la
seguridad de este código **no descansa solo en el tamaño del espacio** —que de
todos modos no es chico: 36⁵ son más de sesenta millones de combinaciones de
sufijo—, sino sobre todo en **dónde y cómo se valida**. El código es de un solo
uso, de vida corta y está atado a un pedido concreto: solo sirve para cerrar *ese*
pedido, mientras *ese* pedido está en condiciones de entregarse, y la validación
ocurre cara a cara en el mostrador o en la mano del repartidor. No hay un oráculo
contra el que un atacante pueda probar millones de códigos sin levantar sospecha:
quien quisiera cerrar un pedido sin el cliente tendría, en la práctica, un solo
intento presencial contra un código que no puede deducir por su forma —los cinco
caracteres son aleatorios de `SecureRandom`, no un contador ni una secuencia—. Con
ese modelo de amenaza, agrandar el sufijo o sumarle un segundo factor sería
endurecer la cerradura de una puerta que ya solo se abre con alguien mirando.

## El no-show del cliente se sigue resolviendo solo

Esta fase no construye nada nuevo para el caso en que el cliente nunca aparece a
recoger. Ese caso ya está resuelto y lo único que hace la validación por código es
darle sentido: un recojo que el comercio dejó listo y que nadie pasa a buscar
expira a `EXPIRADO`, sin puntos ni reembolso, exactamente como hoy (el caso pasivo
está descrito en ADR-0026). La validación por código es justamente lo que sostiene
el principio de fondo —no premiar lo que no se entregó—: si el cliente no llega, no
hay quien presente el código, así que el pedido no puede cerrarse como `ENTREGADO`
y termina expirando. No hace falta lógica nueva; la pieza que faltaba era impedir
que se cerrara como entregado algo que no se entregó, y eso es lo que agrega esta
fase.

## Calificación del cliente sobre el pedido: dirección futura

Queda anotada, y explícitamente fuera de alcance, la idea de que el cliente pueda
calificar el pedido una vez entregado. Tiene sentido engancharla a este flujo —la
entrega validada es el momento natural para habilitar una calificación—, pero
mezclarla acá ampliaría la fase más allá de lo que esta decisión resuelve. La
dejamos para una fase posterior, sin construir nada todavía, para no perder la
intención.

## Alternativas consideradas

### Alternativa 1 — Seguir confiando en la palabra de la contraparte

Dejar el cierre como estaba. La descartamos porque es justamente el agujero que
esta fase viene a cerrar: en delivery permitía acreditar puntos por entregas que
podían no haber ocurrido, y en recojo dejaba marcar como recibido algo que el
cliente no recibió.

### Alternativa 2 — Un segundo factor o un PIN nuevo, aparte del código

Inventar un dato adicional —un PIN, un token de un solo uso— específico para la
entrega. Lo descartamos porque el pedido ya tiene un código único, legible y
adecuado para esto; sumar un dato nuevo significaría otra columna, otra generación
y otra cosa que el cliente tiene que portar, sin ganar nada que el código no dé ya.

### Alternativa 3 — Que el backend reciba y decodifique la imagen del QR

Que la app de la contraparte mande la foto o el contenido binario del QR y el
backend lo decodifique. Lo descartamos porque acopla el backend a la lectura de
imágenes sin ninguna ganancia: el QR no es más que el código en otra
representación, así que basta con que el frontend lo decodifique a string y mande
ese string al mismo endpoint que el tecleado. El backend valida un string, no una
imagen.

### Alternativa 4 — Una representación paralela del pedido para el comercio

Crear un DTO aparte, sin el campo del código, para lo que ve el comercio. Lo
descartamos porque la vista del comercio es la misma que la del cliente salvo por
ese único campo; duplicar toda la estructura para quitar un dato sería
sobre-modularizar. Omitir el campo (dejarlo en nulo) en la representación que ya
existe es más simple y deja el código en un solo lugar.

### Alternativa 5 — Incluir la calificación del cliente en esta fase

Aprovechar la entrega validada para sumar de una vez la calificación del pedido.
La descartamos por foco: la dejamos como dirección futura para que esta fase se
mantenga ceñida a la validación de la entrega.

## Consecuencias

### Positivas

- **El cierre del pedido ahora tiene una prueba.** En delivery, los puntos del
  repartidor dejan de poder acreditarse por entregas no ocurridas; en recojo, el
  estado `ENTREGADO` deja de poder ponerse sin que el cliente esté presente.
- **La protección del código queda completa.** Lo que ADR-0024 empezó en el canal
  SSE se cierra también en REST: el código vive en un solo lugar, la vista del
  cliente sobre sus propios pedidos.
- **Una sola lógica de validación para los dos flujos.** Recojo y delivery
  comparten la misma comparación; el QR no agrega un camino aparte, solo una forma
  de que el código llegue.
- **Sin esquema nuevo.** No hay migración ni cambio en la máquina de estados; el
  campo ya existía y el QR se genera al vuelo.

### Negativas

- **El cierre de la entrega ahora puede fallar por código.** Antes era una acción
  que no podía rechazarse por este motivo; ahora un código equivocado devuelve un
  error de negocio (422, ADR-0019). Es el costo buscado, no un efecto colateral,
  pero el frontend tiene que contemplar ese rechazo y pedir el código de nuevo.
- **El comercio recibe el campo del código en nulo.** Su representación del pedido
  conserva el campo, vacío. Mitigación: es a propósito —lo sensible es el valor, no
  el campo— y deja la estructura del pedido igual para los dos roles.

### Riesgos

- **El supuesto de la comparación sin distinguir mayúsculas.** Vale mientras el
  alfabeto del código no distinga la caja. Mitigación: el supuesto queda escrito en
  este ADR y junto al método de comparación; si el alfabeto cambiara, hay que pasar
  a comparación exacta.
- **El cliente sin acceso a su código en el momento.** Si el cliente no puede
  mostrar su código ni su QR (sin batería, sin señal), la entrega se traba.
  Mitigación: el código es un string corto y legible que el cliente puede haber
  anotado, y el QR no es el único camino —el tecleo del mismo código sirve igual—;
  la atención presencial siempre puede resolver el caso por los medios del local.

## Anexo — Glosario de términos técnicos

**Código del pedido.** El `String` único que cada pedido tiene desde que nace, con
formato `QL-AAMMDD-XXXXX`. Hasta esta fase era solo un identificador legible; ahora
es además la prueba de la entrega.

Ejemplo concreto: un pedido creado el 21 de junio de 2026 podría tener el código
`QL-260621-AB7K9`; el cliente lo muestra en el mostrador y el comercio lo teclea
para cerrar la entrega.

**Prueba de entrega.** El dato que demuestra que la entrega ocurrió de verdad. En
QueueLess es el código: como solo lo porta el cliente, que la contraparte lo
conozca al momento del cierre prueba que el cliente estuvo presente.

Ejemplo concreto: el repartidor no puede confirmar la entrega de un pedido desde
su casa, porque no tiene el código; tiene que pedírselo al cliente en la entrega.

**QR (código QR).** Una imagen que codifica un texto y que una cámara puede leer
para recuperar ese texto. Acá el QR no codifica nada nuevo: solo el mismo código
del pedido, para que la contraparte lo capture con la cámara en vez de teclearlo.

Ejemplo concreto: el QR del pedido `QL-260621-AB7K9` es una imagen que, escaneada,
devuelve la cadena `QL-260621-AB7K9`; la app de la contraparte la manda al mismo
endpoint de validación que usaría si la persona la hubiera tecleado.

**`SecureRandom`.** El generador de números aleatorios de Java pensado para usos de
seguridad: produce valores impredecibles, a diferencia de un generador común cuya
secuencia se puede anticipar. Es lo que hace que el sufijo del código no se pueda
deducir por su forma.

Ejemplo concreto: los cinco caracteres `AB7K9` del código salen de `SecureRandom`,
así que ver un código no ayuda a adivinar el siguiente.

**Modelo de amenaza.** La descripción de contra qué ataque concreto algo tiene que
defenderse, para no protegerlo de más ni de menos. El del código de entrega es un
intento presencial y único de cerrar un pedido sin el cliente, no un ataque
automatizado que prueba millones de combinaciones.

Ejemplo concreto: como el código solo se valida cara a cara y sirve para un único
pedido en un único momento, cinco caracteres aleatorios alcanzan; no estamos
defendiéndonos de alguien probando códigos en masa contra un servidor.

**Precondición.** Una condición que tiene que cumplirse para que una operación
proceda. La validación del código es una precondición nueva del cierre del pedido,
que se suma a las que ya validaba la máquina de estados, sin reemplazarlas.

Ejemplo concreto: para que un pedido pase a `ENTREGADO` ya tenía que estar en un
estado desde el que esa transición fuera legal; ahora, además, el código tiene que
coincidir.

**Comparación sin distinguir mayúsculas (case-insensitive).** Comparar dos cadenas
tratando como iguales las versiones en mayúscula y en minúscula de una misma letra.
La usamos para tolerar el tecleo manual, y vale porque el alfabeto del código no
tiene caracteres que se diferencien solo por la caja.

Ejemplo concreto: si el cliente teclea `ql-260621-ab7k9`, lo aceptamos como igual a
`QL-260621-AB7K9`; el QR, en cambio, siempre trae la versión en mayúsculas.

## Referencias

- ADR-0008 — Ledger pattern para QueuePoints (la acreditación de puntos al
  transicionar a `ENTREGADO`, su idempotencia y que solo el repartidor gana).
- ADR-0013 — Integración con pasarela de pagos (contexto de pago y reembolso del
  pedido; el criterio de responder 404 ante un acceso cruzado por id).
- ADR-0014 — Flujo de delivery, matching y opciones del cliente (quién dispara cada
  transición y el `EntregaCompletadaListener` que acredita los puntos al entregar).
- ADR-0019 — Taxonomía de excepciones y códigos HTTP (el `BusinessRuleException`
  que mapea a 422 cuando el código no coincide).
- ADR-0022 — Versionado y autorización por método (la autorización por rol y la
  identidad tomada del usuario autenticado, no de un parámetro).
- ADR-0024 — Actualización en vivo con SSE (la decisión previa de no mandar el
  código por SSE, que esta fase extiende al canal REST).
- ADR-0026 — Pedidos programados y vigencia (el no-show del cliente que termina en
  `EXPIRADO` sin reembolso, que esta fase enmarca pero no modifica).
- `backend/src/main/java/pe/edu/utec/queueless/pedido/service/PedidoService.java` — la verificación del código y el mapeo que oculta el código al comercio.
- `backend/src/main/java/pe/edu/utec/queueless/delivery/service/SolicitudDeliveryService.java` — la validación del código al confirmar la entrega del delivery.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/dto/ConfirmarEntregaRequest.java` — el cuerpo con el código que reciben los dos flujos.
- `backend/src/main/java/pe/edu/utec/queueless/shared/qr/GeneradorQr.java` — la generación del QR a partir del código.
- `backend/src/main/java/pe/edu/utec/queueless/delivery/dto/SolicitudDeliveryResponse.java` — la representación de la solicitud, de la que se quitó el código.
