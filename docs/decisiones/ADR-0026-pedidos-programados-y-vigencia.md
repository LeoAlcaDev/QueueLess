# ADR-0026 — Pedidos programados y disponibilidad por vigencia

## Contexto

Hoy todo pedido es inmediato: el cliente paga y el comercio lo atiende ahora.
Falta el caso de pagar ahora para recoger más tarde —el estudiante que a las 9
deja pagado su almuerzo para pasar a buscarlo a la 1, sin hacer cola—. Este ADR
fija cómo sumamos ese pedido programado y todo lo que arrastra para que sea justo
con las dos partes.

El programado reusa el camino de pago que ya existe: un pedido de recojo en
tienda, una vez pagado, queda en `PAGADO_ESPERANDO_COMERCIO` esperando que el
comercio lo acepte (ADR-0013). No inventamos un estado nuevo; le agregamos al
pedido la hora futura de recojo y lo dejamos viajar por la misma máquina de
estados.

Sumar esto abre tres frentes que el ADR resuelve juntos, porque se sostienen
entre sí:

- **Disponibilidad por fecha**: un producto puede estar disponible solo en un
  rango de fechas de calendario (la promo de la semana). Es una dimensión nueva,
  ortogonal al horario por hora del día y a las ventanas de lote que ya
  modelamos en ADR-0012.
- **Compromiso del cliente**: si programar fuera cancelable hasta último momento,
  el comercio no podría confiar en la cola. Definimos una ventana corta para
  arrepentirse y, pasada esa ventana, el cliente queda comprometido.
- **Compromiso del comercio**: si el comercio acepta y luego no cumple —o nunca
  acepta—, el dinero del cliente no puede quedar atrapado. Una red de seguridad
  lo devuelve, y una tasa de cumplimiento deja ver qué tan confiable es cada
  comercio.

Para las comparaciones de tiempo futuro (¿el comercio abre a la hora de recojo?,
¿estamos dentro de la ventana de arrepentimiento?) usamos la zona fija de Lima
(ADR-0011), nunca el reloj del servidor sin zona.

## Decisión

### Pedido programado: la hora futura sobre el pedido, sin estado nuevo

Le agregamos al `Pedido` un campo `recojoProgramadoAt` (`Instant`, nulo en los
pedidos inmediatos). Cuando el cliente programa, ese campo lleva la hora elegida
y el pedido sigue el camino normal: nace en `PENDIENTE_PAGO`, el pago lo lleva a
`PAGADO_ESPERANDO_COMERCIO`, y de ahí avanza igual que cualquier otro recojo en
tienda.

No hay estado nuevo ni estado oculto. El comercio ve el pedido programado en su
cola desde que se paga, marcado como programado y con su hora de recojo, junto a
los inmediatos. La diferencia para el comercio es informativa: sabe que ese
pedido es para más tarde y se organiza, pero el flujo de aceptar, preparar y
entregar es el mismo.

### Disponibilidad por vigencia y compromiso de programar

Al `Producto` le sumamos dos cosas distintas:

- `vigenciaInicio` y `vigenciaFin` (`LocalDate`, las dos opcionales; nulas =
  siempre disponible). Acotan en qué **fechas de calendario** se vende el
  producto. Es una dimensión ortogonal a las que ya existen: el horario de
  servicio dice a qué hora del día se vende, las ventanas de lote dicen en qué
  franja se pide y se recoge (ADR-0012), y la vigencia dice entre qué fechas
  existe. Un producto puede tener las tres a la vez sin que se pisen.
- `aceptaProgramado` (`Boolean`, default `true`). Responde una pregunta que
  ninguno de los otros atributos responde: "¿el comercio se compromete a hacer
  este producto con anticipación?". Un producto puede estar perfectamente
  disponible hoy y aun así no aceptarse programado, porque el comercio no quiere
  comprometerse a tenerlo listo a una hora futura. Por eso es un flag aparte y no
  algo que se deduzca de la disponibilidad.

### Validación al crear un programado

Cuando el pedido trae `recojoProgramadoAt`, validamos, antes de aceptarlo:

- **Es de recojo en tienda.** Programar un delivery queda fuera de alcance en
  esta fase.
- **La hora de recojo cae en el horizonte permitido**: como mínimo 2 horas y
  como máximo 7 días desde ahora. Menos de 2 horas no es programar, es un pedido
  casi inmediato; más de 7 días es demasiada incertidumbre para el comercio.
- **La hora cae en un slot de 15 minutos** (en punto, y cuarto, y media, menos
  cuarto). Acota las opciones a horas redondas y le simplifica la organización al
  comercio.
- **El producto acepta programado** (`aceptaProgramado` en `true`).
- **A la hora de recojo elegida** el comercio está abierto y el producto está
  disponible —dentro de su vigencia de fechas y de su horario del día—. La
  validación se hace contra la **hora de recojo**, no contra ahora: el cliente
  puede programar a las 9 de la mañana un recojo para la 1 de la tarde aunque a
  las 9 el local todavía no abra. Convertimos `recojoProgramadoAt` a hora y fecha
  de Lima y reusamos los mismos validadores de horario que ya valida un pedido
  inmediato, pasándoles la hora de recojo.

Acá hay un detalle que vale aclarar: el modelo **no tiene** una dimensión de día
de la semana ni de días cerrados; el local y el producto solo declaran horarios
como hora del día (`LocalTime`) y, ahora, rangos de fecha. Por eso validar la
hora del día más el rango de vigencia cubre la disponibilidad por completo: no
existe un "cerrado los domingos" que un chequeo de solo hora pudiera saltarse.

### Cancelación del cliente: programar es comprometerse

El modelo es que el compromiso del cliente nace **con el pago**, no con la
creación. A partir de ahí:

- Un programado que todavía está en `PENDIENTE_PAGO` (sin pagar) se cancela
  libre, sin candado, como cualquier pedido sin pagar; si el cliente lo
  abandona, el trabajo de pagos pendientes lo limpia a los 60 minutos. Nunca
  queda "comprometido" algo que no se pagó.
- Una vez pagado, el cliente tiene una **ventana de arrepentimiento de 30
  minutos, contados desde el pago** (`pagadoAt`), para corregir un error de
  programación —se equivocó de hora, de local—. Dentro de esa ventana cancela
  con **reembolso completo**, incluso si el comercio ya aceptó rápido. Pasada la
  ventana, queda comprometido y la cancelación se **bloquea**.

Para que la cancelación dentro de la ventana funcione aunque el comercio haya
aceptado, agregamos a la máquina de estados la transición
`ACEPTADO → CANCELADO_POR_CLIENTE`, que antes no existía. La dejamos **candada
en el service**: solo se permite si el pedido es programado y está dentro de su
ventana. Un pedido **directo no cambia en nada**: sigue las reglas de siempre
(cancelable hasta que el comercio acepta), porque su camino de cancelación usa el
conjunto de estados de siempre, que no incluye `ACEPTADO`. El reembolso lo
dispara, como en cualquier cancelación desde un estado pagado, el camino que ya
existe (ADR-0013); no se reimplementa.

La ventana de arrepentimiento (30 min) es más corta que el horizonte mínimo (2 h)
a propósito: le garantiza al comercio una franja de bloqueo antes del recojo.
Esa garantía se sostiene incluso si el cliente paga tarde, porque el trabajo de
pagos pendientes cancela lo no pagado a los 60 minutos
(`queueless.pedido.cancelacion-pago-pendiente-minutos`): el pago más tardío
posible es a los 60 minutos de creado, la ventana dura 30, así que el último
arrepentimiento posible cae a los 90 minutos, por debajo del horizonte mínimo de
120. La propiedad se mantiene mientras el tiempo de pago pendiente más la ventana
sigan por debajo del horizonte mínimo.

### Red de seguridad si el comercio no cumple

Un trabajo programado, hermano de los de `scheduling/`, corre **cada minuto** y
cierra los dos huecos en los que el dinero del cliente quedaría atrapado:

- **El comercio que nunca aceptó.** Encuentra los programados que siguen en
  `PAGADO_ESPERANDO_COMERCIO` cuya hora de recojo ya pasó y los cancela con el
  motivo `COMERCIO_NO_ATENDIO`. Sin gracia: el reembolso debe sentirse inmediato,
  así que se cancela apenas pasa la hora.
- **El comercio que aceptó y abandonó.** Encuentra los programados que se
  quedaron en `ACEPTADO` con la hora de recojo ya pasada y los cancela con el
  motivo `COMERCIO_NO_PREPARO`. Acá sí damos un **margen de gracia**
  (`gracia-recojo-vencido-minutos`, 15 minutos por defecto) por si el comercio va
  legítimamente tarde. Deja en paz a los pedidos en `EN_PREPARACION`: ahí el
  comercio sí está haciendo la comida y cancelarlo sería injusto.

Las dos transiciones que usa —`PAGADO_ESPERANDO_COMERCIO → CANCELADO_POR_COMERCIO`
y `ACEPTADO → CANCELADO_POR_COMERCIO`— ya son válidas hoy y ya gatillan reembolso,
así que la red de seguridad no toca la máquina de estados. El cliente recupera su
plata dentro del minuto de pasada la hora (o de la gracia). Sin esto, un
programado sin atender dejaría el dinero atrapado para siempre; por eso entra en
esta fase y no se difiere.

### Reputación del comercio: tasa de cumplimiento calculada al leer

Mostramos en el perfil del comercio y en su vista pública del catálogo una tasa
de cumplimiento: de los pedidos programados de los que el comercio fue
responsable, qué proporción honró. La calculamos **al leer**, recorriendo los
programados del comercio y clasificándolos:

- **Honrado**: el pedido se entregó.
- **Falla**: el comercio dejó lapsar un programado sin aceptarlo (lo canceló la
  red de seguridad como `COMERCIO_NO_ATENDIO`), o canceló pasada una **gracia de
  15 minutos** desde que aceptó (`gracia-cancelacion-minutos`). Esa gracia tras
  aceptar es para deshacer un error sin penalidad; cancelar después cuenta como
  compromiso roto.
- **Neutro** (fuera del cálculo): declinar antes de aceptar (no se comprometió),
  cancelar dentro de la gracia, las cancelaciones del cliente, los no-shows, y
  los pedidos todavía en curso.

La tasa es honrados sobre honrados más fallas. El comercio es **libre de declinar
antes de aceptar** sin penalidad: ahí todavía no se comprometió.

Para no mostrar un número engañoso con pocos datos, aplicamos un umbral: por
debajo de un mínimo de programados resueltos (`minimo-pedidos-tasa`, 5 por
defecto) no mostramos un porcentaje, mostramos "sin datos aún". Es el mismo
espíritu con el que el modelo de tiempos de espera no se fía de su predicción
hasta tener suficiente historia (ADR-0015 y el umbral de la estrategia
predictiva): con dos pedidos, un 50% o un 100% no dice nada y puede ser injusto.

Las dos gracias de 15 minutos —la de la tasa, tras aceptar, y la del recojo
vencido, en la red de seguridad— son conceptos distintos y viven en claves de
configuración separadas, aunque hoy arranquen en el mismo valor, para poder
ajustarlas por separado sin que una arrastre a la otra.

### No-show del cliente: el caso pasivo

Si el cliente no cancela y simplemente no aparece, no hay penalización pensada por
ahora y el comercio se queda con todo. Esto ya funciona así sin construir nada: un
pedido que el comercio dejó `LISTO_PARA_RECOGER` y que nadie recoge expira a
`EXPIRADO`, y expirar desde "listo" no devuelve nada. Como `EXPIRADO` solo se
alcanza desde `LISTO_PARA_RECOGER`, todo programado expirado es uno que el
comercio aceptó, preparó y dejó listo; el cliente no pasó. Por eso, en la tasa de
cumplimiento, `EXPIRADO` es **neutro**: el comercio cumplió su parte y un no-show
del cliente no debe bajarle la reputación.

### Penalización del cliente por cancelar bloqueado: dirección futura

En esta fase, pasada la ventana de arrepentimiento, la cancelación del cliente
está simplemente bloqueada. La dirección futura, que dejamos documentada pero sin
lógica todavía, es permitir cancelar con **reembolso parcial**: un porcentaje del
pago va al comercio (que ya se comprometió) y otro a QueueLess. Esa comisión sería
la primera vía de ingresos de la plataforma. No la construimos ahora; la dejamos
anotada para no perder la decisión.

## Por qué la ventana de arrepentimiento se mide desde el pago y no desde la creación

El compromiso del cliente es el pago, no el clic de crear. Un programado sin pagar
no compromete nada: o lo cancela el cliente libremente, o lo barre el trabajo de
pagos pendientes. Si midiéramos la ventana desde la creación, un cliente que tarda
en pagar llegaría al estado pagado con parte de su ventana ya consumida, o incluso
sin ventana, lo cual no tiene sentido: recién al pagar se comprometió. Medir desde
`pagadoAt` le da siempre sus 30 minutos completos desde el momento real del
compromiso, y —como mostramos arriba— la garantía de bloqueo antes del recojo se
mantiene gracias al tope de 60 minutos del trabajo de pagos pendientes.

## Por qué la red de seguridad cubre dos huecos y no solo el que nunca acepta

La primera versión de la red de seguridad miraba solo los programados que el
comercio nunca aceptó. Pero eso deja un hueco peor: el comercio que **acepta y
después abandona**. Ese pedido se queda en `ACEPTADO`, pasa la hora de recojo, y
el cliente ya no puede cancelar porque su ventana de arrepentimiento venció hace
rato. Resultado: el dinero queda atrapado para siempre, sin reembolso y sin
salida —exactamente lo que la red de seguridad existe para evitar, y peor que el
caso que sí cubríamos—. Por eso la red mira los dos estados pre-preparación
(`PAGADO_ESPERANDO_COMERCIO` y `ACEPTADO`) y deja en paz `EN_PREPARACION`, donde
el comercio sí está cumpliendo. La tasa de cumplimiento ya clasifica este segundo
caso como falla por la regla de "cancelar pasada la gracia", así que cerrarlo no
le costó nada a la métrica.

## Por qué la tasa se calcula al leer y no se guarda

Guardar la tasa obligaría a recalcularla y reescribirla en cada evento que la
afecta (cada entrega, cada cancelación, cada lapso). Calcularla al leer es más
simple y siempre está al día respecto de los datos que ya tenemos. El costo es que
el número se actualiza al volver a consultarlo, no en vivo, y que la consulta
recorre el historial de programados del comercio. A la escala del proyecto eso es
barato; si algún día pesa, las palancas están claras (acotar el cálculo a una
ventana de tiempo, agrupar la consulta o cachear, y de última mostrarla solo en el
detalle y no en el listado). Hacerla más fresca —por refetch o empujándola por el
canal SSE que ya existe— es una mejora futura, no necesaria ahora.

## Alternativas consideradas

### Alternativa 1 — Un estado nuevo para el pedido programado

Modelar el programado con un estado propio en la máquina de estados. Lo
descartamos porque duplicaría todo el flujo del comercio (aceptar, preparar,
entregar) en una rama paralela, cuando la única diferencia real con un recojo
inmediato es la hora de recojo. Un campo en el pedido alcanza; la máquina de
estados no se toca salvo por la transición de cancelación dentro de la ventana.

### Alternativa 2 — Bloquear la cancelación del programado siempre

No dar ventana de arrepentimiento: una vez pagado, el cliente queda comprometido
de inmediato. Lo descartamos porque castiga el error honesto (equivocarse de hora
al programar) sin darle al cliente ninguna salida. La ventana corta es el
equilibrio: deja corregir el error pero le garantiza al comercio el compromiso
antes del recojo.

### Alternativa 3 — Penalizar el no-show del cliente

Cobrarle algo al cliente que paga y no aparece. Lo descartamos por ahora porque el
comercio ya se queda con el pago (el pedido expira desde "listo" sin reembolso),
así que no pierde; y porque medir el no-show con justicia (¿llegó tarde?, ¿el
local cerró antes?) abre una caja que no hace falta abrir en esta fase.

### Alternativa 4 — Guardar la tasa de cumplimiento en el perfil

Mantener un campo con la tasa y actualizarlo en cada evento. Lo descartamos por lo
dicho arriba: es un dato derivado que hay que mantener sincronizado con varias
fuentes, cuando calcularlo al leer es barato y siempre consistente.

## Consecuencias

### Positivas

- **El cliente puede saltarse la cola** dejando pagado su pedido para más tarde,
  que es el problema que QueueLess viene a resolver.
- **Sin estado nuevo ni flujo paralelo.** El programado reusa el camino de pago y
  la máquina de estados; el comercio no aprende nada nuevo más allá de ver la hora
  de recojo.
- **El dinero del cliente nunca queda atrapado.** La red de seguridad cubre los
  dos huecos (no aceptó / aceptó y abandonó) y reusa el reembolso que ya existe.
- **Reputación visible.** La tasa de cumplimiento, calculada al leer, deja al
  cliente comparar comercios antes de programar.

### Negativas

- **Tres campos nuevos repartidos** (`recojoProgramadoAt` en el pedido,
  `vigenciaInicio/Fin` y `aceptaProgramado` en el producto) y dos motivos de
  cancelación. Mitigación: todos opcionales o con default, ningún flujo existente
  cambia.
- **La tasa se calcula en cada lectura** y recorre el historial de programados del
  comercio, que crece sin tope. Mitigación: a la escala actual es barato; quedan
  documentadas las palancas (ventana de tiempo, consulta agrupada o cache, mostrar
  solo en el detalle) para cuando pese.
- **La tasa no es en vivo**: se actualiza al volver a consultarla. Mitigación:
  refrescarla por refetch o por SSE es una mejora futura, no necesaria ahora.

### Riesgos

- **El comercio que empieza a preparar dentro de la ventana del cliente.** Si el
  comercio entra en `EN_PREPARACION` dentro de los 30 minutos de la ventana de
  arrepentimiento, el cliente ya no puede cancelar aunque siga dentro de la
  ventana, porque en preparación el pedido no es cancelable. Es poco probable
  —nadie cocina un programado dos horas antes del recojo— y bloquear ahí es
  defendible porque el comercio ya invirtió: el comercio que empieza temprano gana
  sobre la ventana del cliente. Lo dejamos como borde conocido, sin lógica
  especial.
- **Configuración de tiempos incoherente.** La garantía de bloqueo antes del
  recojo depende de que el tiempo de pago pendiente más la ventana de
  arrepentimiento sigan por debajo del horizonte mínimo. Mitigación: los tres
  valores son configuración explícita y la relación queda documentada acá; quien
  los cambie debe respetar la desigualdad.
- **La cancelación dentro de la ventana queda abierta como transición.** La
  transición `ACEPTADO → CANCELADO_POR_CLIENTE` ahora existe en la máquina de
  estados; si un futuro camino de cancelación se olvidara del candado del service,
  un directo podría usarla indebidamente. Mitigación: el candado vive en el
  service y los tests cubren que un directo no se ve afectado.

## Anexo — Glosario de términos técnicos

**Pedido programado.** Pedido de recojo en tienda que se paga ahora para recoger a
una hora futura. Se distingue de un inmediato solo por tener `recojoProgramadoAt`
con valor.

Ejemplo concreto: a las 9:00 el cliente paga su almuerzo con recojo a las 13:00; el
pedido queda en `PAGADO_ESPERANDO_COMERCIO` con `recojoProgramadoAt = hoy 13:00` y
aparece en la cola del comercio marcado como programado.

**Vigencia.** Rango de fechas de calendario en el que un producto se vende, dado
por `vigenciaInicio` y `vigenciaFin` (`LocalDate`). Es independiente del horario
del día y de las ventanas de lote (ADR-0012).

Ejemplo concreto: una promo válida del 1 al 7 de junio tiene `vigenciaInicio =
2026-06-01` y `vigenciaFin = 2026-06-07`; un recojo programado para el 8 de junio
la encuentra fuera de vigencia y se rechaza, aunque la hora del día sea correcta.

**`aceptaProgramado`.** Flag del producto que dice si el comercio se compromete a
prepararlo con anticipación. Responde una pregunta distinta de la disponibilidad.

Ejemplo concreto: un café recién hecho puede estar disponible todo el día pero con
`aceptaProgramado = false`, porque el comercio no quiere comprometerse a tenerlo
listo a una hora exacta; programarlo se rechaza aunque a esa hora el local abra.

**Horizonte.** El rango de antelación permitido para la hora de recojo de un
programado: mínimo 2 horas, máximo 7 días desde ahora.

Ejemplo concreto: a las 10:00 se puede programar entre las 12:00 de hoy y las 10:00
de dentro de siete días; un recojo a las 11:00 del mismo día se rechaza por estar
dentro del mínimo.

**Slot.** La granularidad de las horas de recojo: múltiplos de 15 minutos. Acota las
opciones a horas redondas.

Ejemplo concreto: 13:00, 13:15, 13:30 y 13:45 son slots válidos; 13:07 se rechaza.

**Ventana de arrepentimiento.** Los 30 minutos desde el pago en los que el cliente
de un programado todavía puede cancelar con reembolso completo, incluso si el
comercio ya aceptó. Se mide desde `pagadoAt`.

Ejemplo concreto: si el cliente pagó 13:00, hasta las 13:30 puede cancelar y le
devuelven todo; a las 13:31 la cancelación se bloquea.

**Gracia tras aceptar.** Los 15 minutos desde que el comercio acepta un programado
en los que cancelar no cuenta como falla en la tasa de cumplimiento. Es para
deshacer un error sin penalidad.

Ejemplo concreto: el comercio acepta 11:00 y a las 11:10 se da cuenta de que no
tiene un ingrediente y cancela; no le baja la tasa. Si cancelara a las 11:30, sí.

**Margen de gracia del recojo vencido.** Los 15 minutos que la red de seguridad
espera, pasada la hora de recojo, antes de cancelar un programado que sigue en
`ACEPTADO`. Es por si el comercio va legítimamente tarde. Es una gracia distinta de
la de la tasa, en su propia clave de configuración.

Ejemplo concreto: recojo a las 13:00 y el comercio aún no marcó listo; la red de
seguridad lo cancela recién a las 13:15, dándole ese margen.

**Tasa de cumplimiento.** Proporción de programados que el comercio honró sobre los
que fue responsable, calculada al leer. Por debajo de un mínimo de datos muestra
"sin datos aún" en vez de un porcentaje.

Ejemplo concreto: un comercio con 8 programados resueltos, 6 entregados y 2 dejados
lapsar, muestra 75%; uno con 3 resueltos muestra "sin datos aún" porque está por
debajo del mínimo de 5.

**Red de seguridad.** El trabajo programado que cada minuto cancela con reembolso
los programados que el comercio no cumplió, en sus dos formas: nunca aceptó, o
aceptó y abandonó.

Ejemplo concreto: un programado pagado para las 13:00 que a las 13:01 sigue en
`PAGADO_ESPERANDO_COMERCIO` lo cancela el trabajo y dispara el reembolso, sin que
el cliente tenga que hacer nada.

## Referencias

- ADR-0003 — Modelo de entidades (el `Pedido` y el `Producto` que extendemos).
- ADR-0011 — Zona horaria fija `America/Lima` (las comparaciones de tiempo futuro
  van en esa zona).
- ADR-0012 — Ventanas de pedido y recojo por lote (la vigencia es ortogonal a esas
  ventanas y al horario del día; los validadores de horario que reusamos).
- ADR-0013 — Integración con la pasarela de pagos (el camino a
  `PAGADO_ESPERANDO_COMERCIO` que reusa el programado y el reembolso automático al
  cancelar desde un estado pagado).
- ADR-0015 — Modelo de tiempos de espera (el umbral de datos mínimos por debajo del
  cual no se muestra una métrica, que la tasa de cumplimiento reusa con el mismo
  espíritu).
- `backend/src/main/java/pe/edu/utec/queueless/pedido/entity/Pedido.java` — el campo `recojoProgramadoAt`.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/entity/EstadoPedido.java` — la transición nueva de cancelación dentro de la ventana.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/entity/MotivoCancelacion.java` — los motivos `COMERCIO_NO_ATENDIO` y `COMERCIO_NO_PREPARO`.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/service/PedidoService.java` — la creación del programado y las tres ramas de cancelación del cliente.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/service/TasaCumplimientoService.java` — el cálculo de la tasa al leer.
- `backend/src/main/java/pe/edu/utec/queueless/scheduling/CancelarProgramadosVencidosJob.java` — la red de seguridad.
- `backend/src/main/java/pe/edu/utec/queueless/puntoventa/entity/Producto.java` — la vigencia y el flag `aceptaProgramado`.
- `backend/src/main/resources/db/migration/V7__producto_vigencia_y_pedido_programado.sql` — las columnas nuevas.
