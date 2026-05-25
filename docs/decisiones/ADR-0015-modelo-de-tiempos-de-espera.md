# ADR-0015 — Modelo de tiempos de espera: estrategia manual y regresión por bins

## Contexto

El diferenciador técnico de QueueLess es decirle al cliente cuánto va a tardar
su pedido antes de hacerlo. En la propuesta esto aparece en dos fases: primero
una estimación simple basada en lo que el comercio declara, y después un modelo
que aprende de los pedidos reales del local. La Fase 6 cierra ese diferenciador.

Al arrancar la fase, el módulo `waittime/` ya tenía los esqueletos puestos de
fases anteriores, todos con un `TODO Semana 3` que avisa que la lógica viene
más tarde:

- `WaitTimeStrategy`: la interfaz con un solo método `estimarMinutos(PuntoDeVenta)`.
- `ManualDeclaredStrategy`: hoy devuelve directamente `puntoDeVenta.getTiempoPromedioDeclarado()`, sin sumar la cola.
- `PredictiveStrategy`: delega en `BinRegressionModel.predecir(puntoDeVentaId)`.
- `BinRegressionModel`: el método `predecir` devuelve un valor fijo (10) y `entrenar` está vacío.
- `ModelTrainer`: un job `@Scheduled(cron = "${queueless.waittime.retraining-cron}")` que llama a `model.entrenar()`.
- `WaitTimeService`: elige la estrategia, hoy siempre devuelve la manual.

La configuración ya reserva las claves: `queueless.waittime.pedidos-minimos-fase2`
vale `50` y `queueless.waittime.retraining-cron` vale `"0 */15 * * * *"`. La
entidad `PuntoDeVenta` tiene `tiempoPromedioDeclarado`
(un `Integer` en minutos, default 10), y la entidad `Pedido` guarda los
timestamps `aceptadoAt` y `listoAt` que usamos para medir cuánto tardó de verdad
una preparación.

Este ADR fija cómo funcionan las dos estrategias, cómo se entrena y se consulta
el modelo predictivo, y cómo el sistema elige una u otra según los datos que
tiene cada local. No redocumentamos el patrón de estrategias intercambiables (ya
está en el ADR-0013 para pagos y el ADR-0017 para almacenamiento); acá lo
aplicamos y lo citamos.

## Decisión

### Dos estrategias detrás de `WaitTimeStrategy`

Mantenemos la interfaz `WaitTimeStrategy` con dos implementaciones que se pueden
intercambiar: `ManualDeclaredStrategy` (la estimación simple de Fase 1) y
`PredictiveStrategy` (el modelo entrenado de Fase 2). Es el mismo patrón de
"una interfaz, varias implementaciones, el service elige cuál" que ya usamos en
el gateway de pagos (ver ADR-0013) y en el almacenamiento de archivos (ver
ADR-0017). La diferencia es que acá la elección no la hace una propiedad de
configuración fija, sino el volumen de datos de cada local en tiempo real (más
abajo, "Selección automática").

### Estrategia manual: declarado más el tamaño de la cola

La estimación manual deja de ser un número plano y pasa a tener un componente
dinámico:

```
estimado = tiempoPromedioDeclarado + (pedidos_en_cola × minutos_por_pedido_en_cola)
```

- `tiempoPromedioDeclarado` es el campo que el comercio configura en su
  `PuntoDeVenta` (por ejemplo, "mi local tarda unos 10 minutos en promedio").
- `pedidos_en_cola` es una métrica dinámica: la cantidad de pedidos **del mismo
  punto de venta que están en estado `EN_PREPARACION`** en el momento de la
  consulta. Es la cocina ocupada ahora mismo. Se calcula con un conteo barato
  (un `COUNT` con índice sobre `estado` + `punto_de_venta_id`), no recorriendo
  pedidos en memoria.
- `minutos_por_pedido_en_cola` es el peso de cada pedido en cola. Es
  configurable en `application.yml` con la clave nueva
  `queueless.waittime.minutos-por-pedido-en-cola` y un valor por defecto de 3
  minutos. Ejemplo: un local que declara 10 minutos y tiene 4 pedidos en
  preparación estima `10 + 4 × 3 = 22` minutos.

Elegimos `EN_PREPARACION` (y no, por ejemplo, todos los pedidos activos del
local) porque ese estado representa la comida que la cocina está cocinando ahora.
Un pedido que todavía está en `PAGADO_ESPERANDO_COMERCIO` aún no consume tiempo
de cocina, así que sumarlo inflaría el estimado sin razón.

### Modelo predictivo: regresión por bins con tres dimensiones

La estrategia predictiva consulta un modelo de **regresión por bins**: en vez de
una fórmula matemática, es una tabla donde cada celda corresponde a una
combinación de condiciones y guarda el tiempo promedio que el local tardó bajo
esas condiciones. Las tres dimensiones (lo que en aprendizaje automático se
llaman *features*; ver glosario) son todas categóricas, es decir, cada una toma
un conjunto fijo y chico de valores:

| Dimensión | Valores posibles | Cantidad |
|---|---|---|
| Hora del día | 0 a 23 | 24 |
| Día de la semana | lunes = 0 hasta domingo = 6 | 7 |
| Pedidos en cola al aceptar el pedido | 0–2, 3–5, 6 o más | 3 |

El producto da `24 × 7 × 3 = 504` celdas como máximo por punto de venta. Cada
celda guarda dos cosas: el promedio simple de los tiempos reales de preparación
(la diferencia `listoAt − aceptadoAt`, en minutos) de los pedidos que cayeron en
esa combinación, y el contador de cuántos pedidos aportaron a ese promedio.

Ejemplo concreto de una celda: "lunes, 12:00, 3–5 pedidos en cola = 18 minutos
(con 27 pedidos detrás)". Cuando un cliente pregunta el tiempo estimado un lunes
al mediodía y el local tiene 4 pedidos en preparación, la predicción es esos 18
minutos.

"Pedidos en cola" significa lo mismo acá que en la estrategia manual: la cantidad
de pedidos del local en estado `EN_PREPARACION`. La diferencia es el momento en
que se mide. Para armar la celda al entrenar, se cuenta cuántos había cuando ese
pedido fue aceptado (su contexto histórico); para predecir, se cuenta cuántos hay
al momento de la consulta. Usar la misma definición en los dos lados es lo que
hace que el bucket con el que se guarda un dato sea el mismo con el que después se
lo busca.

### Una instancia del modelo por punto de venta

Todos los modelos viven dentro de un único bean de Spring, `BinRegressionModel`,
que internamente mantiene un `Map<Long, BinTable>`: la clave es el id del punto
de venta y el valor es su tabla de 504 celdas. La clase interna `BinTable`
guarda los promedios y contadores de un local. Un solo bean concentra todos los
locales en memoria; no hay una instancia de modelo suelta por cada uno.

### Selección automática de estrategia por local

`WaitTimeService.estimar(puntoDeVenta)` elige la estrategia según cuántos
pedidos `ENTREGADO` tiene ese local en su historia:

- Menos de 50 pedidos entregados → estrategia manual.
- 50 o más → estrategia predictiva.

El umbral es configurable con la clave que ya existe,
`queueless.waittime.pedidos-minimos-fase2` (valor 50). La cuenta se hace una vez
por consulta con un `COUNT` indexado por `estado` + `punto_de_venta_id`, que es
barato.

El umbral es **por local, no global**. Un local de comida rápida puede juntar 50
pedidos en una semana; un local chico tarda meses. Si aplicáramos un umbral
global ("cuando el sistema entero tenga N pedidos, todos pasan a predictivo"),
castigaríamos a los locales chicos con predicciones de un modelo entrenado con
datos de otros locales que no tienen nada que ver con su ritmo. Cada local cruza
a la fase predictiva cuando junta su propia evidencia.

### Fallback cuando una celda está vacía

Si la estrategia predictiva consulta una celda cuyo contador es cero (esa
combinación de hora, día y cola nunca ocurrió todavía), no devuelve 0 ni un valor
indefinido: cae al `tiempoPromedioDeclarado` del local. Ese respaldo (ver
glosario, *fallback*) es parte de la decisión, no un caso borde: garantiza que
la consulta siempre devuelve un número razonable aunque el modelo tenga huecos.
Ejemplo: un local con 60 pedidos entregados ya usa la estrategia predictiva,
pero si nadie pidió nunca un domingo a las 7:00, esa celda está vacía y la
respuesta es el tiempo declarado del local.

### El modelo vive en memoria

`BinRegressionModel` es un bean único de Spring (ver glosario, *singleton*) y su
`Map<Long, BinTable>` vive en memoria. Si el backend se reinicia, el modelo
arranca vacío y se reconstruye en el siguiente ciclo del job de reentrenamiento.
Mientras tanto, como las celdas están vacías, cada local cae a su tiempo
declarado vía el fallback descrito arriba.

Consideramos persistir instantáneas del modelo en la base (una tabla
`waittime_bin_snapshot` con `punto_de_venta_id`, hora, día, bucket de cola,
promedio y conteo). Sería más sólido ante reinicios frecuentes, pero exige una
migración nueva, mantener la instantánea sincronizada con cada reentrenamiento, y
agregar lógica de carga al arranque. El costo no se justifica: el reentrenamiento
es barato (una agregación con `GROUP BY` sobre la tabla de pedidos), corre cada
15 minutos, y la ventana sin predicción tras un reinicio queda cubierta por la
estrategia manual. Es una ventana chica y con respaldo. Si en el futuro el
backend se reiniciara seguido y esa ventana molestara, agregamos la instantánea.

### Reentrenamiento periódico cada 15 minutos

El job `ModelTrainer` reentrena el modelo con la expresión de cron
`0 */15 * * * *` (en los minutos 0, 15, 30 y 45 de cada hora), que ya está
configurada en `queueless.waittime.retraining-cron`. En cada ciclo:

1. Consulta los pedidos en estado `ENTREGADO` que tienen `aceptadoAt` y
   `listoAt` no nulos (todo pedido entregado pasó por esos dos timestamps, así
   que la condición filtra datos incompletos por las dudas).
2. Los agrupa por punto de venta y por celda (hora, día, bucket de cola).
3. Calcula el promedio nuevo de cada celda y su contador.
4. **Reemplaza el mapa interno del modelo de forma atómica**: construye el mapa
   nuevo completo y publica la referencia con una sola asignación sobre un campo
   marcado `volatile` (ver glosario). Nunca edita el mapa viejo "en vivo".

El paso 4 es importante. Si editáramos el mapa mientras una consulta lo está
leyendo, esa consulta podría ver una tabla a medio actualizar (algunas celdas
nuevas, otras viejas). Construir el mapa nuevo aparte y cambiar la referencia de
un solo golpe evita eso: cada consulta ve, o el modelo viejo entero, o el nuevo
entero, nunca una mezcla.

### Por qué `@Scheduled(cron = ...)` y no `fixedDelay`

El esqueleto ya usa una expresión de cron, y la mantenemos. La alternativa,
`@Scheduled(fixedDelay = ...)`, dispararía el reentrenamiento "cada 15 minutos
contados desde que terminó el anterior", arrancando en momentos arbitrarios
según cuándo se hizo el primer ciclo. La expresión de cron, en cambio, alinea
los reentrenamientos al reloj (siempre en los minutos 0, 15, 30, 45). Ese
alineamiento es deseable el día que corramos más de una instancia del backend:
todas reentrenan en el mismo instante en vez de desfasarse de a poco. Hoy hay una
sola instancia y no cambia nada, pero elegir cron desde el principio no cuesta
nada y deja la puerta abierta.

### El cron no se solapa consigo mismo

`@Scheduled` ejecuta cada método en un único hilo por bean de forma
predeterminada. Si un reentrenamiento tardara más de 15 minutos (muy improbable:
es una agregación con índice), Spring no encola una segunda ejecución en paralelo;
simplemente espera a que la anterior termine antes de disparar la siguiente. Lo
dejamos anotado como hallazgo tranquilizador, no como algo a resolver.

### Endpoint público de tiempo estimado

Exponemos `GET /api/puntos-de-venta/{id}/tiempo-estimado`, que devuelve un JSON
`{"minutos": N}`. Es público (sin token), porque un cliente quiere ver cuánto va
a tardar antes de loguearse o de armar el pedido. No hace falta tocar la
configuración de seguridad: la regla existente que deja público todo
`GET /api/puntos-de-venta/**` ya lo cubre. El endpoint lo atiende un controller
nuevo, `WaitTimeController`, dentro de `waittime/controller/`. La ruta vive bajo
`/api/puntos-de-venta/` aunque el controller esté en el módulo `waittime`; la
URL agrupa por recurso (el punto de venta), no por módulo de código.

### Qué datos hay al arrancar Fase 6

Al cerrar Fase 6 no hay historial real de pedidos más allá de los del seed de
desarrollo. En la práctica, casi todos los locales van a operar en modo manual
hasta que la app reciba uso real y junten 50 pedidos entregados cada uno. Esto
no es un problema: la estrategia manual cubre el caso y el endpoint responde un
número útil desde el día uno. Lo dejamos documentado como contexto para que nadie
se asuste cuando vea que el modelo predictivo "no se activa" en las pruebas
iniciales.

## Por qué regresión por bins y no regresión lineal, random forest o gradient boosting

Esta es la decisión central del ADR, así que la justificamos aparte.

Un modelo de bins es, en el fondo, una tabla de búsqueda (ver glosario): se
entra con hora, día y cola, y se lee el promedio. Esa simplicidad es justamente
la ventaja para nuestro caso:

- **Es explicable.** Cualquier persona del equipo puede abrir la celda "lunes,
  12:00, 3–5 en cola = 18 minutos" y entender exactamente qué predice el modelo y
  por qué. No hay coeficientes ni pesos ocultos. Para un proyecto académico que
  el profesor va a revisar, poder explicar el modelo en una frase vale más que un
  punto de precisión.
- **La regresión lineal asume linealidad** entre las variables y el tiempo. La
  hora del día no se relaciona de forma lineal con el tiempo de preparación: las
  12:00 del mediodía son un pico, pero las 11:00 y las 13:00 no son "un poco menos
  pico" de forma proporcional, son valles distintos. Forzar una recta sobre eso
  predice mal en las horas que más importan.
- **Random forest o gradient boosting** capturarían esa no-linealidad, pero
  traen dependencias externas nuevas (que el proyecto no permite sin
  confirmación), infraestructura de entrenamiento, y la necesidad de serializar
  el modelo a disco para no reentrenar desde cero en cada arranque. Todo eso es
  desproporcionado para un MVP con histórico chico, donde un modelo con cientos
  de pedidos por local no le da de comer a un bosque de árboles.

El modelo de bins es lo correcto para el tamaño de datos y el público de este
proyecto. Si algún día el volumen creciera muchísimo y la precisión de los bins
se quedara corta, se evalúa subir de modelo; hoy no es el caso.

## Por qué promedio simple y no mediana ni promedio ponderado por recencia

Cada celda guarda un promedio simple, no una mediana ni un promedio que le dé más
peso a los pedidos recientes. Las razones:

- **El promedio simple se actualiza fácil.** Es una suma y un contador. La
  mediana exige mantener ordenada la lista completa de tiempos de cada celda, lo
  que ocupa más memoria y complica el reentrenamiento.
- **El promedio ponderado por recencia** (donde un pedido viejo pesa menos que
  uno nuevo, con un decaimiento exponencial) sería más robusto cuando un local
  cambia su ritmo, pero exige elegir un factor de decaimiento que no tenemos cómo
  calibrar sin datos reales. Elegirlo a ojo sería inventar un número.
- **Sobre los valores atípicos:** un pedido que tardó 90 minutos por un imprevisto
  ensucia el promedio de su celda. La mitigación está en que el reentrenamiento
  corre sobre toda la ventana de datos cada 15 minutos, así que ese valor viejo
  pesa cada vez menos a medida que entran pedidos normales. Si los datos reales
  mostraran que los valores atípicos son frecuentes (no la excepción), evaluamos
  recortar al percentil 95 o pasar a la mediana en una fase futura. Por ahora, el
  promedio simple con reentrenamiento sobre ventana completa es suficiente.

## Alternativas consideradas

### Alternativa 1 — Regresión lineal o un modelo de árboles

Descartada por las razones de la sección "Por qué regresión por bins": la lineal
no captura el comportamiento por hora, y los árboles traen dependencias e
infraestructura desproporcionadas para el histórico que vamos a tener.

### Alternativa 2 — Mediana o promedio ponderado por recencia en cada celda

Descartada por costo (la mediana) y por falta de datos para calibrar (el
ponderado). Quedan como mejoras futuras si los valores atípicos resultan
frecuentes.

### Alternativa 3 — Persistir instantáneas del modelo en la base

Una tabla `waittime_bin_snapshot` que sobreviva a los reinicios. Descartada para
esta fase: agrega migración, sincronización y carga al arranque para cubrir una
ventana chica que la estrategia manual ya respalda. Reconsiderable si el backend
se reiniciara con frecuencia.

### Alternativa 4 — Umbral global en vez de por local

Activar la fase predictiva cuando el sistema entero junte N pedidos. Descartada
porque le aplicaría a los locales chicos un modelo entrenado con datos de locales
que no se parecen a ellos. El umbral por local respeta el ritmo de cada uno.

### Alternativa 5 — `@Scheduled(fixedDelay = ...)` para el reentrenamiento

Descartada a favor de la expresión de cron por el alineamiento al reloj, que
importa el día que haya más de una instancia del backend. El costo de elegir cron
desde ya es cero.

## Consecuencias

### Positivas

- **El diferenciador técnico queda cerrado.** El cliente ve un tiempo estimado
  útil, primero por la estimación manual y después por el modelo que aprende.
- **Modelo explicable.** Cualquiera del equipo entiende qué predice cada celda
  con solo leerla, lo que facilita defenderlo ante el profesor y depurarlo.
- **Sin dependencias ni infraestructura nuevas.** Todo se resuelve con Spring,
  JPA y memoria. No se agregó nada al `pom.xml`.
- **Costo de consulta y de entrenamiento bajo.** Los conteos van por índice y el
  reentrenamiento es una sola agregación con `GROUP BY`.
- **Degradación elegante.** Tras un reinicio, o en celdas sin datos, el sistema
  cae al tiempo declarado en vez de fallar o devolver basura.

### Negativas

- **Modelo volátil ante reinicios.** Si el backend se reinicia, se pierde el
  modelo hasta el siguiente reentrenamiento. Mitigación: el respaldo manual cubre
  la ventana; la persistencia en base queda como opción futura.
- **Los valores atípicos contaminan celdas con pocos datos.** Una celda con 3
  pedidos y uno de ellos atípico predice mal. Mitigación: el reentrenamiento sobre
  ventana completa diluye el efecto con el tiempo; el percentil 95 o la mediana
  quedan como opción si hace falta.
- **Granularidad fija.** Los buckets de cola (0–2, 3–5, 6 o más) y los bins de
  hora son una decisión de modelado que puede no calzar perfecto con todos los
  locales. Mitigación: son fáciles de re-particionar en una fase futura sin tocar
  el resto del sistema.

### Riesgos

- **Celdas con muy pocos datos dan predicciones ruidosas** sin que el sistema lo
  marque. Un local recién cruzado el umbral de 50 pedidos tiene casi todas sus
  celdas con uno o dos pedidos. Mitigación: el contador por celda ya está
  guardado; si hiciera falta, se puede exigir un mínimo de pedidos por celda
  antes de confiar en ella (y caer al fallback si no llega), sin cambiar el
  modelo.
- **Memoria proporcional a la cantidad de locales.** 504 celdas por local es
  trivial para las decenas de locales del campus, pero si el sistema creciera a
  miles de locales habría que medir. Mitigación: a esa escala, la instantánea en
  base (hoy descartada) cobra sentido.
- **El reentrenamiento depende de timestamps correctos.** Si `aceptadoAt` o
  `listoAt` quedaran mal por un bug en la máquina de estados, el modelo aprende
  tiempos falsos. Mitigación: esos timestamps los setea `Pedido.transicionarA` en
  un solo lugar, y la máquina de estados está cubierta por tests.

## Anexo — Glosario de términos técnicos

**Modelo de regresión por bins (bin regression).** Forma de predecir un número
agrupando los casos en "cajones" (bins) según condiciones discretas y guardando,
para cada cajón, el promedio observado. No hay fórmula: es una tabla.

Ejemplo concreto del proyecto: el modelo de tiempos de QueueLess tiene un cajón
para cada combinación de hora, día y cantidad de pedidos en cola. El cajón
"martes, 13:00, 6 o más en cola" guarda el promedio de minutos que el local tardó
en esas condiciones. Predecir es entrar a la tabla y leer el cajón que
corresponde.

**Feature categórica vs. continua.** Una *feature* es una variable de entrada que
el modelo usa para predecir. Es **categórica** si toma un conjunto fijo y chico
de valores sin orden numérico real (el día de la semana: lunes, martes, ...), y
**continua** si puede tomar cualquier valor en un rango (la temperatura, el
precio). La regresión por bins necesita features categóricas o continuas
convertidas en cajones.

Ejemplo concreto: en QueueLess la hora del día la tratamos como 24 categorías
(0 a 23), no como un número continuo, justamente para poder usarla como
dimensión de la tabla de bins.

**Fallback.** Comportamiento de respaldo al que el sistema recurre cuando el
camino principal no puede dar una respuesta.

Ejemplo concreto: si la estrategia predictiva consulta una celda vacía (nunca
hubo pedidos en esa combinación de hora, día y cola), el fallback es devolver el
`tiempoPromedioDeclarado` del local en lugar de un 0 sin sentido.

**`@Scheduled` con expresión de cron vs. `fixedDelay`.** `@Scheduled` es la
anotación de Spring para correr un método en intervalos. Con una **expresión de
cron** (`0 */15 * * * *`) el método arranca en momentos fijos del reloj (minutos
0, 15, 30, 45). Con **`fixedDelay`** arranca cada N milisegundos contados desde
que terminó la ejecución anterior, lo que lo desliza a horas arbitrarias.

Ejemplo concreto: el `ModelTrainer` usa cron para que, si mañana hay dos
instancias del backend, ambas reentrenen alineadas al reloj en vez de desfasarse.

**Singleton (en Spring).** Bean del que existe una única instancia compartida en
toda la aplicación. Es el comportamiento por defecto de Spring.

Ejemplo concreto: `BinRegressionModel` es un singleton; un solo objeto guarda el
`Map<Long, BinTable>` con los modelos de todos los locales, en vez de crear uno
por cada consulta.

**Campo `volatile`.** Modificador de Java que garantiza que, cuando un hilo
cambia el valor de un campo, los demás hilos ven el valor nuevo de inmediato (sin
quedarse con una copia vieja en caché). Se usa para compartir una referencia
entre hilos de forma segura.

Ejemplo concreto: el `Map<Long, BinTable>` del modelo se guarda en una referencia
`volatile`. El job de reentrenamiento arma el mapa nuevo y lo asigna de un solo
golpe; gracias al `volatile`, la siguiente consulta (que corre en el hilo de la
petición HTTP) ve el mapa nuevo entero, no una mezcla del viejo y el nuevo.

**Tabla de búsqueda (lookup table).** Estructura donde la respuesta ya está
precalculada y guardada, de modo que "calcular" se reduce a buscar la entrada
correcta. Es lo opuesto a evaluar una fórmula cada vez.

Ejemplo concreto: el modelo de bins de QueueLess es una tabla de búsqueda. La
predicción no resuelve ninguna ecuación; entra con (hora, día, cola) y lee el
promedio guardado en esa celda.

**Valor atípico (outlier).** Dato que se aparta mucho del resto y puede distorsionar
un promedio. Ejemplo: un pedido que tardó 90 minutos porque la cocina tuvo un
problema, dentro de una celda donde el resto tardó 15.

## Referencias

- ADR-0001 — Estructura feature-first (ubica el módulo `waittime/` y sus subpaquetes `strategy/`, `ml/`, `service/`, `controller/`).
- ADR-0013 — Integración con pasarela de pagos (mismo patrón de interfaz con implementaciones intercambiables).
- ADR-0017 — Almacenamiento de archivos (otra aplicación del mismo patrón de estrategia).
- `backend/src/main/java/pe/edu/utec/queueless/waittime/strategy/WaitTimeStrategy.java` — la interfaz.
- `backend/src/main/java/pe/edu/utec/queueless/waittime/strategy/ManualDeclaredStrategy.java` — estrategia manual.
- `backend/src/main/java/pe/edu/utec/queueless/waittime/strategy/PredictiveStrategy.java` — estrategia predictiva.
- `backend/src/main/java/pe/edu/utec/queueless/waittime/ml/BinRegressionModel.java` — el modelo y su `Map<Long, BinTable>`.
- `backend/src/main/java/pe/edu/utec/queueless/waittime/ml/ModelTrainer.java` — job de reentrenamiento.
- `backend/src/main/java/pe/edu/utec/queueless/waittime/service/WaitTimeService.java` — selección de estrategia.
- `backend/src/main/java/pe/edu/utec/queueless/puntoventa/entity/PuntoDeVenta.java` — campo `tiempoPromedioDeclarado`.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/entity/Pedido.java` — timestamps `aceptadoAt` y `listoAt`.
- `backend/src/main/resources/application.yml` — claves `queueless.waittime.pedidos-minimos-fase2`, `retraining-cron` y la nueva `minutos-por-pedido-en-cola`.
