# ADR-0012 — Modelado de ventanas de pedido y recojo por lotes

## Contexto

Durante la implementación de la Fase 3 (Pedido core), el equipo identificó que el sistema carece de validaciones automáticas de horario en dos niveles. Ya teníamos el horario de atención del local (apertura y cierre del día), pero faltaban:

- **Horario de servicio del producto**: dentro del horario del local, cada producto puede venderse solo en una franja específica. Ejemplo: el "desayuno completo" se sirve solo de 7:00 a 10:30, aunque el café del bloque A siga abierto hasta las 20:00.
- **Ventanas de pedido y recojo por lotes**: algunos productos no se preparan al momento sino por lote en horario fijo. Tienen una ventana donde el cliente puede pedir, y otra ventana donde el cliente puede recoger. Ejemplo: el "almuerzo del día" se pide entre 11:00 y 13:00, y se recoge entre 12:30 y 14:00, porque la cocina lo prepara todo junto a las 12:30.

Sin estas validaciones, el cliente puede crear pedidos que el comercio luego va a rechazar manualmente (con el motivo `FUERA_DE_HORARIO_PRODUCTO` que ya existe en el enum desde Fase 3). El cliente vive una mala experiencia y el comercio pierde tiempo.

Este ADR fija cómo modelar las ventanas en la base de datos y en la entidad `Producto`. La regla del horario de servicio simple (un producto que se vende de X a Y) es directa y no necesita ADR propio. La parte interesante es el modelo de ventanas por lote.

## Decisión

### Horario de servicio por producto: 2 campos en `Producto`

Agregamos dos campos opcionales a la entidad `Producto`:

```java
@Column(name = "horario_servicio_inicio")
private LocalTime horarioServicioInicio;

@Column(name = "horario_servicio_fin")
private LocalTime horarioServicioFin;
```

Si ambos son `null` (caso por defecto), el producto se vende todo el día que el local esté abierto. Esto preserva el comportamiento actual: ningún producto se rompe con la migración.

Si los dos tienen valor, al crear un pedido el `PedidoService` valida que la hora actual de Lima esté dentro de la franja. Si no, lanza `BusinessRuleException` con mensaje claro.

Es el mismo patrón que ya usa `PuntoDeVenta` con `horarioApertura/Cierre`, así que no introduce nada nuevo conceptualmente.

### Ventanas de pedido y recojo: 4 campos en `Producto` + flag

Agregamos cuatro campos opcionales y un booleano:

```java
@Column(name = "tiene_ventana_de_pedido", nullable = false)
@Builder.Default
private Boolean tieneVentanaDePedido = false;

@Column(name = "ventana_pedido_inicio")
private LocalTime ventanaPedidoInicio;

@Column(name = "ventana_pedido_fin")
private LocalTime ventanaPedidoFin;

@Column(name = "ventana_recojo_inicio")
private LocalTime ventanaRecojoInicio;

@Column(name = "ventana_recojo_fin")
private LocalTime ventanaRecojoFin;
```

El flag `tieneVentanaDePedido` es la fuente de verdad de "este producto es por lote". Si está en `true`, las 4 ventanas son obligatorias y se validan al crear y editar el producto. Si está en `false` (default), las 4 ventanas se ignoran y el producto se vende normalmente según su horario de servicio (si tiene) o todo el día.

Tener un flag explícito en vez de inferirlo de los campos (por ejemplo, "si `ventanaPedidoInicio != null` entonces es por lote") permite:

- Distinguir "este producto NO es por lote" de "este producto es por lote pero el comercio aún no configuró las ventanas".
- Validar de forma clara: si `tieneVentanaDePedido = true`, las 4 ventanas deben tener valor; si está en `false`, deben estar todas en `null`.
- Hacer queries directas tipo "productos por lote del local X".

### Reglas de validación en la entidad y el DTO

Al crear o editar un producto, el service valida:

1. **Si `tieneVentanaDePedido = true`**: las 4 ventanas son obligatorias y `ventanaRecojoFin >= ventanaPedidoFin`. La regla del recojo es clave: no tiene sentido que la ventana de recojo termine antes que la de pedido (¿cómo recoger algo que recién se está pidiendo?). Mismo patrón que `validarHorarios` en `PuntoDeVentaService`.
2. **Si `tieneVentanaDePedido = false`**: las 4 ventanas deben ser `null`. Evita estados inconsistentes en la base.
3. **Si el producto es `INSTANTANEO`**: no puede tener `tieneVentanaDePedido = true`. Un producto instantáneo ya está listo para despacho (gaseosa embotellada, snack envasado), no tiene sentido pedirlo con ventana. Esta regla es estricta y dispara 422 al guardar.

### Catálogo público: muestra todo, marca lo que no está disponible

El endpoint público del catálogo (`GET /api/puntos-de-venta/{id}/productos`) no filtra por horario. Devuelve todos los productos disponibles del local, pero cada `ProductoResponse` incluye un flag derivado:

```java
private Boolean disponibleAhora;
private String razonNoDisponible;
```

El service calcula `disponibleAhora` comparando la hora actual de Lima contra las ventanas configuradas del producto. Si está fuera de horario de servicio o fuera de ventana de pedido, `disponibleAhora` queda en `false` y `razonNoDisponible` trae un texto descriptivo ("Disponible a partir de las 11:00", "Solo de 7:00 a 10:30").

Así el frontend puede mostrar:

- Productos disponibles con la UI normal.
- Productos fuera de horario en gris, con el texto del por qué.

El cliente sabe qué pedir ahora y qué esperar para más tarde, en vez de ver un catálogo que cambia de tamaño según la hora.

### Validación al crear pedido

En `PedidoService.crear()`, además de las validaciones que ya existen (local activo y abierto, horario del local, producto existe, disponible y del local), agregamos dos validaciones por cada item:

1. Horario de servicio del producto (si tiene).
2. Ventana de pedido del producto (si es por lote).

Cada validación vive en un helper package-private separado, siguiendo el patrón de `validarHorarioDeAtencion(local, ahora)`:

```java
void validarHorarioDeServicio(Producto producto, LocalTime ahora)
void validarVentanaDePedido(Producto producto, LocalTime ahora)
```

Los tests les pasan horas fijas para no depender del reloj real del sistema.

### Promoción de `ZONA_LIMA` a constante compartida

Esta fase es el segundo módulo del proyecto que necesita la zona horaria de Lima (el primero fue `PedidoService` en Fase 3). El ADR-0011 anticipó esta situación con la regla del 3 del proyecto: cuando un segundo módulo necesite la constante, se promueve a un lugar compartido.

Movemos `ZONA_LIMA` de `PedidoService` a una clase de utilidades en `shared/util/` (por ejemplo `Zonas.java` o `TiempoLima.java`). Los dos services la importan desde ahí. La fase también es el momento de definir si conviene exponer un helper único tipo `TiempoLima.ahora()` que devuelva el `LocalTime` ya en zona Lima, para no repetir `LocalTime.now(ZONA_LIMA)` en cada llamada.

Esta promoción se hace como parte de esta fase, no en un commit separado, porque el catálogo lo necesita desde el día uno.

### Migración Flyway V5

Una sola migración agrega todos los campos a la tabla `producto`:

```sql
ALTER TABLE producto
    ADD COLUMN horario_servicio_inicio TIME,
    ADD COLUMN horario_servicio_fin    TIME,
    ADD COLUMN tiene_ventana_de_pedido BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN ventana_pedido_inicio   TIME,
    ADD COLUMN ventana_pedido_fin      TIME,
    ADD COLUMN ventana_recojo_inicio   TIME,
    ADD COLUMN ventana_recojo_fin      TIME;
```

Todos los productos existentes quedan con `tiene_ventana_de_pedido = false` y los demás campos en `null`. Comportamiento actual preservado.

No agregamos `CHECK constraints` para validar las combinaciones (las 4 ventanas obligatorias cuando el flag está en `true`, etc.) porque son reglas que dependen de varios campos a la vez y se expresan mejor en código (en el service al guardar el producto). Sí podríamos agregarlas en una migración futura si hace falta defensa en profundidad, pero por ahora son redundantes.

## Por qué 4 campos en `Producto` y no una tabla `ventana_pedido` separada

Esta es la decisión más importante del ADR y la justifico con detalle.

Una alternativa razonable era crear una entidad nueva:

```sql
CREATE TABLE ventana_pedido (
    id              BIGSERIAL PRIMARY KEY,
    producto_id     BIGINT NOT NULL REFERENCES producto(id),
    pedido_inicio   TIME NOT NULL,
    pedido_fin      TIME NOT NULL,
    recojo_inicio   TIME NOT NULL,
    recojo_fin      TIME NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);
```

Esto permitiría que un producto tenga **múltiples ventanas por día** (ejemplo: "almuerzo y cena" con ventanas distintas), o **ventanas que cambian por día de la semana** (lunes a viernes una, sábados otra).

Nos quedamos con los 4 campos en `Producto` por estas razones:

- **El caso de uso real es 1 ventana por producto.** Los locales del campus UTEC no tienen productos con múltiples ventanas. El "almuerzo del día" tiene una sola ventana. Resolver hoy un problema que no existe es agregar complejidad gratis.
- **Coherencia con el modelo actual.** `PuntoDeVenta` ya tiene `horarioApertura/Cierre` como columnas directas. Si seguimos el mismo patrón en `Producto`, el equipo no tiene que aprender un modelo nuevo.
- **Sin JOINs extra.** Al validar un pedido, ya cargamos el producto. Los campos vienen incluidos sin query adicional. Una tabla separada agregaría un `JOIN` o un `findByProductoId` por cada item del pedido.
- **No modifica el conteo de entidades.** El ADR-0003 fija el modelo en 12 entidades. Agregar una entidad `VentanaDePedido` rompería ese contrato y requeriría actualizar el ADR-0003.
- **La migración futura es barata.** Si en algún momento un local pide "necesito que mi almuerzo del día también tenga ventana de cena", refactorizamos a tabla separada con una migración nueva: leer las 4 columnas, insertarlas como fila en `ventana_pedido`, dropear las 4 columnas. Es 1-2 horas de trabajo concentrado, no semanas.

**Limitación conocida**: el modelo solo soporta una ventana por producto. Está documentada en el commit de la migración y en este ADR. Si más adelante aparece un caso real con múltiples ventanas, hay que migrar a la tabla separada descrita arriba.

## Por qué `tipoPreparacion = INSTANTANEO` no puede tener ventana de pedido

`TipoPreparacion` ya existe desde Fase 2 con dos valores:

- `PREPARADO`: el producto se prepara al momento del pedido (sandwich, café, jugo).
- `INSTANTANEO`: el producto ya está listo, embolsado, listo para despacho (snack envasado, gaseosa).

Hoy `TipoPreparacion` era metadato sin lógica asociada. Con esta fase pasa a tener una regla de negocio asociada: distingue los productos que pueden tener ventanas de pedido (los `PREPARADO`) de los que no (los `INSTANTANEO`).

Un producto `INSTANTANEO` por definición no se prepara, así que el concepto "ventana de pedido por lote" no aplica. Validamos esto de forma estricta: si el comercio intenta guardar un producto `INSTANTANEO` con `tieneVentanaDePedido = true`, lanzamos `BusinessRuleException` (422) con mensaje claro.

**Por qué estricto y no warning**: el resto del proyecto valida combinaciones inválidas de forma dura (por ejemplo, `apertura >= cierre` en local). Mantener el mismo nivel de rigor es coherente y evita que el comercio cree configuraciones que después generan bugs al pedir.

**Limitación conocida**: si en el futuro aparece un caso raro tipo "snack del día por reserva anticipada" donde un producto pre-empaquetado igual tiene ventana (ej: se prepara en lote desde la fábrica externa que lo entrega a horario fijo), hay que revertir esta validación. La forma de revertirlo es trivial: borrar el check del service. Para que el equipo recuerde por qué la regla existe, esta decisión queda documentada en este ADR y en el commit que la agrega.

## Alternativas consideradas

### Alternativa 1 — Tabla `ventana_pedido` separada

Descartada por las razones explicadas arriba: agrega complejidad para resolver un caso que no tenemos.

### Alternativa 2 — JSON con la configuración

Una columna `ventana_config JSONB` en `producto` con la estructura serializada.

Descartada porque:

- Rompe la validación a nivel base de datos (los `CHECK` no operan sobre JSON anidado de forma cómoda).
- Hace las queries de horario más lentas y menos legibles.
- Hibernate no mapea JSON nativamente sin librerías extra.
- Es flexibilidad falsa: simula extensibilidad pero a costa de claridad y performance.

### Alternativa 3 — Inferir "es por lote" desde los campos

En vez del flag `tieneVentanaDePedido`, decir que un producto es por lote si `ventanaPedidoInicio` no es `null`.

Descartada porque:

- No permite distinguir "este producto no es por lote" de "este producto es por lote pero al comercio le falta configurar las ventanas".
- La validación se vuelve menos clara: en vez de chequear un booleano, hay que chequear si los 4 campos están todos llenos o todos vacíos.
- El frontend no puede mostrar "este producto es por lote pero su configuración está incompleta" como estado intermedio.

### Alternativa 4 — Reutilizar `TipoPreparacion` para indicar "es por lote"

Agregar un valor `POR_LOTE` al enum existente.

Descartada porque mezcla dos conceptos distintos:

- `PREPARADO` vs `INSTANTANEO` describe **si el producto requiere preparación**.
- "Por lote" describe **si la preparación se hace por horario fijo en vez de a demanda**.

Un producto puede ser `PREPARADO` y a demanda (sandwich), `PREPARADO` y por lote (almuerzo del día), `INSTANTANEO` y a demanda (gaseosa). Mezclarlo en un solo enum perdería información.

### Alternativa 5 — Filtrar el catálogo público a nivel SQL

Hacer una query que excluya los productos fuera de horario de servicio o de ventana de pedido.

Descartada porque:

- El catálogo perdería información valiosa para el cliente ("este producto estará disponible a las 11:00").
- Un catálogo que cambia de tamaño cada hora confunde al usuario.
- El cliente se va con la sensación de que el local no tiene lo que busca, cuando en realidad solo no es la hora.

El approach elegido (mostrar todo, marcar lo que no está disponible) da mejor experiencia al cliente.

## Consecuencias

### Positivas

- **El comercio rechaza muchos menos pedidos manualmente**. La validación automática evita la mayoría de los casos donde antes el cliente pedía algo fuera de horario.
- **Mejor experiencia del cliente**. Ve todo el catálogo con etiquetas claras de disponibilidad, y sabe cuándo va a poder pedir lo que está mirando.
- **Coherencia con el modelo existente**. Los campos siguen el mismo estilo que `PuntoDeVenta.horarioApertura/Cierre`. Sin entidades nuevas, sin patrones nuevos.
- **Performance sin sorpresas**. No hay JOINs adicionales al validar pedidos. El cálculo de `disponibleAhora` en el catálogo es trivial para los volúmenes que manejamos (un local típico tiene menos de 50 productos).
- **El motivo `FUERA_DE_HORARIO_PRODUCTO` del enum de cancelaciones (Fase 3) pasa a ser raro**. La validación automática lo evita en la mayoría de los casos. Queda como red de seguridad para casos borde.

### Negativas

- **Soporte limitado a 1 ventana por producto**. Si aparece un caso real con múltiples ventanas, hay que refactorizar a tabla separada. Mitigación: documentado en este ADR y en el commit de la migración, no es deuda oculta.
- **5 campos nuevos en `Producto`**. La entidad crece. Los DTOs de request y response también crecen. Mitigación: todos son opcionales (el booleano tiene default `false`), no cambian el flujo de productos existentes.
- **Validaciones cruzadas en el service**. Reglas tipo "si flag está en `true`, las 4 ventanas son obligatorias" no se expresan a nivel base. Vive en el service. Mitigación: tests unit que cubren cada combinación.

### Riesgos

- **Configuración inconsistente cargada manualmente en la base**. Si alguien hace un `UPDATE` directo en SQL y deja un producto con `tieneVentanaDePedido = true` y las ventanas en `null`, el comportamiento al pedir es indefinido. Mitigación: en el service, al cargar el producto, podríamos agregar una validación de coherencia que loguee warning si el estado es inconsistente. Por ahora confiamos en que el único camino de escritura es vía API.
- **Cambios futuros que rompen la validación estricta de `INSTANTANEO`**. Si aparece un caso de negocio donde un producto instantáneo necesita ventana, la regla actual bloquea. Mitigación: este ADR documenta cómo revertirlo (borrar el check del service).
- **Hora de Lima en validación de catálogo**. Si por error alguien usa `LocalTime.now()` sin zona en el cálculo de `disponibleAhora`, el catálogo va a mostrar disponibilidades equivocadas cuando el servidor corra en otra zona. Mitigación: ya está cubierto por ADR-0011 (zona horaria fija). Hay que reusar la constante `ZONA_LIMA`. **Esta fase es el segundo módulo (después de `PedidoService`) que la necesita, así que es el momento de promoverla**: en vez de duplicarla como constante privada en `ProductoService`, se mueve a `shared/util/` o equivalente y los dos services la reusan. Esto aplica la regla del 3 que el proyecto sigue para abstracciones.

## Anexo — Glosario de términos técnicos

**Ventana de pedido**. Franja horaria en la que el cliente puede crear un pedido de un producto específico. Ejemplo: la ventana de pedido del "almuerzo del día" es de 11:00 a 13:00. Fuera de esa franja, el pedido se rechaza con 422.

**Ventana de recojo**. Franja horaria en la que el cliente puede pasar a buscar el pedido. Ejemplo: la ventana de recojo del "almuerzo del día" es de 12:30 a 14:00. Esta ventana puede solaparse con la de pedido (caso típico, mientras unos siguen pidiendo otros ya están recogiendo).

**Producto por lote**. Producto cuya preparación se hace por tanda en horario fijo, en vez de hacerse al momento del pedido. Ejemplo: el almuerzo del día se cocina todo junto a las 12:00, no plato por plato cuando llegan los pedidos. Por eso necesita ventanas de pedido (para que la cocina sepa cuántos preparar) y de recojo (para que el cliente venga cuando esté listo).

**Producto a demanda**. Lo opuesto a producto por lote. Se prepara cuando llega el pedido. Ejemplo: el sandwich se arma cuando el cliente lo pide.

**Horario de servicio**. Franja horaria en la que un producto específico se vende, dentro del horario general del local. Es independiente de las ventanas de pedido. Ejemplo: el "desayuno completo" tiene horario de servicio de 7:00 a 10:30 (no es por lote, es a demanda, pero solo se vende en esa franja).

**`tieneVentanaDePedido`**. Flag booleano en la entidad `Producto` que distingue los productos por lote de los demás. Cuando está en `true`, los 4 campos de ventana son obligatorios. Cuando está en `false` (default), las 4 ventanas se ignoran.

**`disponibleAhora`**. Campo derivado en `ProductoResponse` que el service calcula en el momento de armar el response. Combina las reglas de horario de servicio y ventana de pedido del producto con la hora actual de Lima. No se persiste en la base, se calcula al vuelo.

**`razonNoDisponible`**. Campo de texto opcional en `ProductoResponse` que acompaña a `disponibleAhora = false`. Le explica al cliente por qué el producto está en gris. Ejemplo: "Disponible a partir de las 11:00".

**`TipoPreparacion`**. Enum existente desde Fase 2 con dos valores: `PREPARADO` (requiere preparación al momento) e `INSTANTANEO` (ya está listo para despacho). Hasta esta fase era metadato decorativo. Con esta fase pasa a tener semántica: un producto `INSTANTANEO` no puede tener `tieneVentanaDePedido = true`.

**Validación cruzada**. Regla de validación que depende de más de un campo a la vez. Ejemplo: "si el flag está en `true`, las 4 ventanas son obligatorias". Estas reglas se expresan en el service o en el DTO con un método anotado, no con validaciones sueltas en cada campo.

**Defensa en profundidad**. Estrategia de seguridad que aplica la misma validación en varias capas (DTO, service, base de datos). Si una capa falla, las otras protegen. En este ADR optamos por validar en el service y no agregar `CHECK constraints` en la base, porque las reglas son complejas y se expresan mejor en código. Si en el futuro queremos defensa en profundidad para los datos, podemos agregar los checks como migración adicional.

**`LocalTime`**. Tipo de Java 8+ que representa una hora del día sin fecha y sin zona. Ejemplo: `11:00:00`. Usado en este ADR para todos los campos de horario y ventana, igual que en `PuntoDeVenta.horarioApertura/Cierre`.

**Migración Flyway**. Script SQL versionado que actualiza el esquema de la base de datos. Cada migración tiene un número (`V5__...`). Flyway las aplica en orden y mantiene un historial para no aplicarlas dos veces.

## Referencias

- ADR-0001 — Estructura feature-first.
- ADR-0003 — Modelo de 12 entidades (este ADR no agrega entidades, mantiene el conteo).
- ADR-0009 — Eventos de dominio.
- ADR-0011 — Zona horaria fija (`America/Lima`) en lógica de negocio.
- `backend/src/main/java/pe/edu/utec/queueless/puntoventa/entity/Producto.java` — entidad afectada.
- `backend/src/main/java/pe/edu/utec/queueless/puntoventa/service/ProductoService.java` — donde viven las validaciones de configuración.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/service/PedidoService.java` — donde se validan las ventanas al crear pedido.
- `backend/src/main/resources/db/migration/V5__horarios_y_ventanas_producto.sql` — migración que agrega los campos.
