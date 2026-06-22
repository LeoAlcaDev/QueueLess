# ADR-0028 — Ocupación de locales por hora a partir del historial

## Contexto

QueueLess ya acumula un dato que hasta ahora no aprovechábamos: cada pedido guarda
cuándo se creó (`creadoAt`) y de qué local es (`puntoDeVenta`). Con eso se puede
responder una pregunta que le sirve a las dos partes del mercado: ¿a qué hora suele
estar más cargado un local? Es la misma idea de las "horas de mayor afluencia" que
muestra un mapa cuando uno busca un restaurante: una barra por hora que dice si ese
momento es valle o pico.

Esta fase construye esa vista. El cliente la usa para elegir cuándo pedir —o si le
conviene otro local—, y el comercio para anticipar su jornada. Es **solo
informativa**: muestra la curva, no recomienda acciones ni dispara nada.

Damos por sentadas, y solo referenciamos, varias decisiones ya tomadas: la zona fija
de Lima para toda agrupación por hora (ADR-0011, a través de `TiempoLima`); el criterio
de no fiarse de una métrica con pocos datos y responder "aún recopilando datos" en su
lugar (ADR-0015 para el modelo de tiempos y ADR-0026 para la tasa de cumplimiento); la
fórmula de la estimación manual de tiempos (`tiempoPromedioDeclarado + cola × peso`,
ADR-0015); el criterio de responder 404 ante un acceso cruzado por id (ADR-0013); y la
autorización por rol con la identidad tomada del usuario autenticado (ADR-0022).

## Decisión

### Calculamos la ocupación agregando el historial, no con un modelo predictivo

La ocupación de una franja sale de **contar pedidos del historial**, agrupados por
local, día de la semana y hora del día. No entrenamos ni consultamos un modelo: es una
agregación directa sobre la tabla de pedidos. El modelo mental es el de las horas de
mayor afluencia de un mapa, no el de una predicción.

Esto convive con el modelo predictivo de tiempos de espera (ADR-0015) sin pisarse:
aquél responde "cuánto vas a esperar **ahora**" mirando la cola del momento; esta vista
responde "cómo suele estar este local **a lo largo de la semana**" mirando su pasado.
Son preguntas distintas y las mantenemos separadas (ver más abajo, "El tiempo del ahora
y el tiempo por franja son dos cosas distintas").

### Contamos los pedidos que se concretaron, en hora de Lima

La señal de afluencia son los pedidos que **llegaron a pagarse** (`pagadoAt` no nulo),
no los carritos que alguien abrió y abandonó sin pagar. Un pedido abandonado antes del
pago no fue demanda real para el local, así que contarlo inflaría la curva con ruido.

Cada pedido cae en su franja según la **hora de Lima** de su creación, nunca la hora del
servidor: convertimos `creadoAt` con `TiempoLima` y tomamos el día de la semana y la
hora. Sin esto, un pedido creado a las 23:00 de Lima podría contarse como del día
siguiente si el servidor corre en otra zona.

### Medimos el promedio por ocurrencia, no la suma acumulada

El nivel de una franja es el **promedio de pedidos por cada vez que esa franja ocurrió**
en la ventana, no la suma de todos sus pedidos. Si miramos los últimos 90 días, "lunes
12:00" ocurrió unas trece veces; si en total hubo 39 pedidos en esa franja, el nivel es
`39 / 13 = 3` pedidos típicos, no 39.

La distinción es la diferencia entre una curva con sentido y una absurda. La suma crece
con el largo de la ventana y con la popularidad del local sin decir nada del momento:
una franja con 39 pedidos sumados se leería como "muchísimo", cuando en realidad son
tres por lunes. El promedio por ocurrencia es lo único que se puede comparar entre
franjas y entre locales.

### El tiempo por franja: la afluencia traducida a una demora orientativa

Cada franja con datos muestra dos cosas juntas, igual que la barra de un mapa: qué tan
cargada está y **cuánto podría demorar un pedido a esa hora**. El tiempo por franja lo
derivamos de la **ocupación típica de esa franja**, reusando la fórmula de la estimación
manual (`tiempoPromedioDeclarado + cola × minutos-por-pedido-en-cola`, ADR-0015) pero
alimentándola con el promedio por ocurrencia de la franja en lugar de la cola del
momento. Ejemplo: un local que declara 10 minutos, con un peso de 3 minutos por pedido y
una franja de 3 pedidos típicos, estima `10 + 3 × 3 = 19` minutos para esa hora.

Reusamos la fórmula tal cual está: `ManualDeclaredStrategy.estimarMinutos(local, cola)`
ya recibe el tamaño de cola como parámetro, así que le pasamos el promedio de la franja y
listo, sin tocar el camino que usa el tiempo del ahora.

### El tiempo del ahora y el tiempo por franja son dos cosas distintas

Hay que ser honestos sobre qué estima cada uno, porque se parecen pero no son lo mismo:

- El **tiempo del ahora** lo da `WaitTimeService.estimarMinutos`, que ya existe y **no
  tocamos**. Su entrada es la **cola actual** (los pedidos en `EN_PREPARACION` en este
  instante), así que responde "cuánto vas a esperar si pedís ahora". No sirve para "a las
  3 de la tarde un pedido demora X": a las 3 de la tarde no conocemos la cola que va a
  haber —eso es justo lo que la curva estima por su cuenta—.
- El **tiempo por franja** no mira ninguna cola presente; traduce la afluencia histórica
  típica de esa hora a una demora **orientativa**.

La vista del cliente devuelve los dos por separado: la curva con su tiempo por franja, y
aparte el tiempo del ahora. No los mezclamos.

### La ocupación se mide por pedidos que entran, y eso la vuelve orientativa

Conviene dejar dicho el límite de la aproximación, con el mismo cuidado con el que el
proyecto evita afirmar lo que no puede sostener. La afluencia la medimos por los pedidos
que **entran** en una franja (cuándo se crearon), que **no** es lo mismo que cuántos
pedidos **coexisten** en la cocina al mismo tiempo. Por eso el tiempo por franja es una
**guía**, no un modelo del tamaño de cola instantáneo ni una promesa de precisión. Lo
presentamos como orientación, nunca como un número exacto.

### Cold-start honesto y umbral por franja

Una franja con pocos datos no inventa nada. Si una franja no junta un mínimo de pedidos
(`queueless.ocupacion.minimo-pedidos`, 5 por defecto) no mostramos ni su nivel ni su
tiempo: la marcamos como "aún recopilando datos". Con dos o tres pedidos sueltos, un
promedio no dice nada y mostrarlo sería fingir un patrón que no tenemos. Es el mismo
espíritu con el que el modelo de tiempos no se fía hasta tener historia (ADR-0015) y la
tasa de cumplimiento se calla por debajo de su mínimo (ADR-0026).

Cuando **ninguna** franja del local cruza el umbral, la respuesta entera es "aún
recopilando datos": es el arranque en frío, el estado natural de un local nuevo o de un
sistema recién puesto en marcha. El tiempo del ahora sí se devuelve siempre, porque no
depende del historial (cae al tiempo declarado del local desde el día uno).

La curva se llena sola a medida que entran pedidos reales; no hay nada que sembrar ni un
paso manual que disparar.

### La curva se calcula sobre una ventana reciente

Agregamos solo los pedidos de los últimos `queueless.ocupacion.ventana-dias` días (90 por
defecto), no toda la historia. Un patrón de afluencia cambia con el tiempo —un local que
antes llenaba a la 1 ahora llena a las 12—, así que una ventana reciente describe mejor el
presente que un promedio de años. De paso, acota cuántos pedidos recorre el cálculo.

### Solo lectura: sin esquema, sin máquina de estados, sin migración

Esta fase no agrega ninguna entidad ni columna: lee `creadoAt`, `pagadoAt` y
`puntoDeVenta`, que ya existen. No toca la máquina de estados ni publica eventos. **No hay
migración** y `flyway.target` no se mueve.

### Endpoints separados por rol

Exponemos la misma curva por dos rutas, según quién la mira:

- Cliente: `GET /api/v1/cliente/ocupacion/{puntoVentaId}` (rol CLIENTE). Devuelve la curva
  con el tiempo por franja y el tiempo del ahora, para decidir cuándo pedir.
- Comercio: `GET /api/v1/comercio/ocupacion/{puntoVentaId}` (rol COMERCIO). La misma curva,
  para anticipar la jornada. La identidad sale del usuario autenticado (ADR-0022) y un
  local ajeno se ve como inexistente, 404, con el mismo criterio del resto del proyecto
  (ADR-0013).

Las dos rutas caen bajo los prefijos `/api/v1/cliente/**` y `/api/v1/comercio/**` que
`SecurityConfig` ya protege por rol, así que no tocamos la configuración de seguridad.

## Por qué agregación y no un modelo predictivo por franja

Podríamos haber entrenado un modelo que prediga la ocupación de cada franja, como el de
tiempos de espera (ADR-0015). No lo hicimos porque la pregunta no lo pide: "qué tan lleno
suele estar este local los lunes al mediodía" se responde contando los lunes al mediodía
del pasado reciente, que es exactamente lo que el usuario quiere ver. Un modelo agregaría
infraestructura (entrenamiento, persistencia, reentrenamiento) para producir un número que
la agregación directa ya da, y encima menos explicable. La curva agregada es la respuesta
correcta y la más honesta: muestra el dato crudo, no una estimación de él.

## Por qué reusamos la fórmula manual y no el estimador del ahora

La tentación sería llamar a `WaitTimeService.estimarMinutos` para el tiempo de cada
franja. No sirve, y es importante entender por qué: ese método cuenta la cola **del
momento** de la consulta. Si lo llamáramos para "el lunes a las 12:00", nos devolvería el
tiempo que corresponde a la cola de **ahora**, no a la de un lunes al mediodía. La cola de
una franja futura no existe todavía; lo que sí tenemos es cuántos pedidos suele haber en
esa franja, y eso es lo que alimenta la fórmula. Por eso reusamos la *fórmula* de la
estrategia manual (que toma un tamaño de cola como parámetro), no el *servicio* que la
llama con la cola del momento.

## Dirección futura: notificación de afluencia y preferencias por categoría

Dejamos registrada, sin construir nada todavía, la dirección que ya decidimos para cuando
esta vista crezca:

- El comercio podrá **recibir un aviso** de que se le viene una franja de alta afluencia,
  para prepararse. Sería **informativo y opcional**, y con tono humilde ("es probable que
  a esta hora tengas más clientes"), nunca una afirmación de certeza, porque la curva es
  orientativa. El cliente no recibe avisos de ocupación: solo consulta la vista.
- Ese aviso necesita maquinaria que esta fase no incluye (un trabajo que vigile la
  ocupación, decida cuándo un local entra en pico y dispare el push), así que llega más
  adelante junto con la preferencia que lo gobierna.
- Cuando lleguen, las **preferencias de notificación** se modelarán **por categorías** de
  aviso (transaccionales del pedido, informativas, promocionales), no con un interruptor
  por cada evento. Un toggle por evento sería una matriz de promesas que el backend tendría
  que consultar y testear en cada camino, donde cada celda es una vía de fallo silencioso
  —un aviso que el usuario apagó pero que igual se dispara porque alguien olvidó mirar la
  preferencia—; eso es la misma promesa vacía que evitamos en el arranque en frío. Las
  transaccionales críticas (el estado del pedido) no serán apagables, porque apagarlas
  rompería el servicio; lo configurable serán las informativas y las promocionales.

## Plan futuro: sembrar el estudio de atención de locales

Tenemos un estudio real de afluencia de locales del campus que algún día poblaría la curva
desde el arranque, sin esperar a que entren pedidos. No lo sembramos ahora, y dejamos
escrito que hacerlo queda condicionado a **dos** validaciones, no una:

1. Que cada local de prueba esté **mapeado a su comercio real**. Hoy el local del seed es
   un placeholder, no un comercio real con su identidad.
2. Que el patrón de afluencia del estudio se haya **verificado como vigente** —o se haya
   ajustado al año en curso— antes de darlo por bueno. El estudio es veraz para el año en
   que se hizo, no necesariamente para hoy.

Sembrarlo sin esas dos validaciones mostraría una curva que podría no corresponder ni al
comercio real ni al presente, que es justo lo que el proyecto no hace. Hasta entonces, la
única fuente de la curva es el historial real de pedidos, y el día que se siembre el
estudio la misma curva cobra vida sin cambiar una línea de código.

## Alternativas consideradas

### Alternativa 1 — Un modelo predictivo de ocupación por franja

Entrenar un modelo que prediga la carga de cada franja. Lo descartamos porque la pregunta
se responde contando el historial reciente; un modelo sería infraestructura de más para un
número que la agregación ya da, y menos explicable.

### Alternativa 2 — Usar la suma acumulada de la franja como nivel

Mostrar el total de pedidos de cada franja en vez del promedio por ocurrencia. Lo
descartamos porque la suma crece con la ventana y con la popularidad sin describir el
momento: 39 pedidos sumados no son comparables con nada, mientras que "3 por lunes" sí.

### Alternativa 3 — Reusar `WaitTimeService.estimarMinutos` para el tiempo por franja

Llamar al estimador del ahora para cada franja. Lo descartamos porque su entrada es la cola
del momento, no una hora del día: daría siempre el tiempo de ahora, no el de la franja.

### Alternativa 4 — Sembrar el estudio de atención de locales en esta fase

Poblar la curva desde el arranque con el estudio existente. Lo descartamos hasta que se
cumplan las dos validaciones (local mapeado a comercio real, patrón verificado como
vigente); mostrarlo antes sería afirmar una afluencia que podría no ser real hoy.

### Alternativa 5 — Preferencias de notificación con un toggle por evento

Un interruptor por cada tipo de aviso. Lo descartamos en favor de categorías (cuando se
construya la notificación): el toggle por evento multiplica las vías de fallo silencioso y
abruma al usuario.

## Consecuencias

### Positivas

- **El cliente decide mejor cuándo pedir.** Ve la curva de afluencia y una demora
  orientativa por hora, más el tiempo real del ahora.
- **El comercio anticipa su jornada** con la misma curva, sin construir nada nuevo del lado
  del comercio.
- **Sin esquema ni infraestructura nuevos.** Es una agregación de lectura sobre datos que
  ya existen; no hay migración, ni modelo, ni dependencias.
- **Honesto por diseño.** Una franja sin datos suficientes lo dice; un local sin historial
  lo dice; el tiempo por franja se presenta como orientación, no como exactitud.

### Negativas

- **Arranque en frío.** Un local nuevo o un sistema recién puesto en marcha muestran "aún
  recopilando datos" hasta juntar pedidos. Mitigación: es el comportamiento honesto y la
  curva se llena sola; el tiempo del ahora sí responde desde el día uno.
- **La curva recorre el historial reciente en cada consulta.** A la escala del campus es
  barato; si algún día pesa, las palancas son la ventana de días, una agregación con
  `GROUP BY` en la base, o un cacheo.

### Riesgos

- **Confundir la guía con una promesa.** El tiempo por franja es orientativo; leerlo como
  exacto llevaría a quejas. Mitigación: la distinción ahora/franja y el carácter orientativo
  quedan escritos acá y se reflejan en cómo el frontend lo presente.
- **Ventana mal elegida.** Una ventana muy corta da curvas ruidosas; una muy larga arrastra
  patrones viejos. Mitigación: es configurable y su default (90 días) es un punto razonable
  entre frescura y volumen.

## Anexo — Glosario de términos técnicos

**Ocupación (o afluencia).** Qué tan cargado suele estar un local en una franja, medido por
cuántos pedidos concretados entran en esa franja. Es la traducción de las "horas de mayor
afluencia" de un mapa al dominio de QueueLess.

Ejemplo concreto: si los lunes al mediodía un local recibe unos tres pedidos, su ocupación
en la franja "lunes 12:00" es 3 pedidos típicos.

**Franja.** Una combinación de día de la semana y hora del día (de 0 a 23), en hora de Lima.
Hay 7 × 24 = 168 franjas posibles por local.

Ejemplo concreto: "martes 13:00" es una franja; un pedido creado el martes a la 1:15 de la
tarde de Lima cae en ella.

**Promedio por ocurrencia.** El nivel de una franja: sus pedidos divididos por la cantidad
de veces que esa franja ocurrió en la ventana, no la suma.

Ejemplo concreto: 39 pedidos en "lunes 12:00" a lo largo de 13 lunes dan 3 pedidos típicos,
no 39.

**Tiempo del ahora vs. tiempo por franja.** El **tiempo del ahora** estima la espera con la
cola del momento (lo da `WaitTimeService`, ADR-0015). El **tiempo por franja** traduce la
afluencia histórica típica de una hora a una demora orientativa, reusando la fórmula manual
alimentada con el promedio de la franja.

Ejemplo concreto: a las 9 de la mañana el tiempo del ahora puede ser 8 minutos (poca cola
ahora), y la franja "lunes 13:00" mostrar 19 minutos orientativos (suele llenarse al
mediodía).

**Cold-start (arranque en frío).** El estado en el que todavía no hay datos suficientes para
mostrar una métrica. En vez de inventar un número, se responde "aún recopilando datos".

Ejemplo concreto: un local recién dado de alta muestra "aún recopilando datos" en toda su
curva hasta que sus franjas junten el mínimo de pedidos; recién ahí aparece la afluencia.

**Ventana.** El rango reciente de días sobre el que se calcula la curva (90 por defecto),
para que refleje el presente y no patrones viejos.

Ejemplo concreto: con una ventana de 90 días, la curva de hoy ignora un pico que el local
tenía hace un año y ya no tiene.

## Referencias

- ADR-0011 — Zona horaria fija `America/Lima` (la agrupación por hora va en esa zona, vía `TiempoLima`).
- ADR-0013 — Integración con pasarela de pagos (el criterio de 404 ante un acceso cruzado por id que usa el endpoint del comercio).
- ADR-0015 — Modelo de tiempos de espera (el tiempo del ahora que reusamos sin tocar, la fórmula manual que alimentamos con la franja, y el umbral de datos mínimos que reusamos en espíritu).
- ADR-0022 — Versionado y autorización por método (la autorización por rol y la identidad tomada del usuario autenticado).
- ADR-0026 — Pedidos programados y vigencia (el mismo criterio de no mostrar una métrica por debajo de un mínimo de datos).
- `backend/src/main/java/pe/edu/utec/queueless/ocupacion/service/OcupacionService.java` — la agregación, el promedio por ocurrencia, el umbral y el tiempo por franja.
- `backend/src/main/java/pe/edu/utec/queueless/ocupacion/controller/OcupacionClienteController.java` y `OcupacionComercioController.java` — los endpoints por rol.
- `backend/src/main/java/pe/edu/utec/queueless/ocupacion/dto/OcupacionResponse.java` y `FranjaOcupacion.java` — la forma de la respuesta.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/repository/PedidoRepository.java` — la consulta de los `creadoAt` de los pedidos concretados de un local.
- `backend/src/main/java/pe/edu/utec/queueless/waittime/strategy/ManualDeclaredStrategy.java` — la fórmula de tiempo que reusamos.
- `backend/src/main/resources/application.yml` — las claves `queueless.ocupacion.minimo-pedidos` y `queueless.ocupacion.ventana-dias`.
