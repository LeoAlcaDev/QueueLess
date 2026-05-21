# ADR-0003 — Modelo de 12 entidades del dominio

## Contexto

QueueLess maneja un dominio con varios actores (clientes, comercios, repartidores), pedidos con muchos estados, pagos con pasarela externa, delivery opcional, reseñas y un sistema de puntos por entregas comunitarias. Antes de empezar a codear teníamos que decidir cómo modelar todo eso en JPA y en la base relacional.

La pregunta concreta era: ¿cuántas entidades necesitamos y cómo se relacionan? Algunas opciones extremas posibles:

- Un modelo "compacto" de 5-6 entidades grandes con muchos NULLs.
- Un modelo "explotado" de 20+ entidades con cada concepto separado.
- Un modelo intermedio que refleje el dominio real.

Este ADR fija la decisión que tomamos: un modelo de 12 entidades, y justifica cada una.

## Decisión

Modelamos el dominio con **12 entidades JPA** organizadas feature-first:

| # | Entidad | Módulo | Razón corta |
|---|---|---|---|
| 1 | `Usuario` | usuario | Identidad y autenticación |
| 2 | `PerfilCliente` | usuario | Atributos solo del rol cliente |
| 3 | `PerfilComercio` | usuario | Atributos solo del rol comercio (RUC, contacto) |
| 4 | `PerfilRepartidor` | usuario | Atributos solo del rol repartidor (rating, disponibilidad) |
| 5 | `PuntoDeVenta` | puntoventa | Local físico dentro del campus |
| 6 | `Producto` | puntoventa | Ítem vendible de un punto de venta |
| 7 | `Pedido` | pedido | Orden de un cliente con su máquina de estados |
| 8 | `ItemPedido` | pedido | Línea de detalle del pedido (producto + cantidad) |
| 9 | `Pago` | pago | Transacción con pasarela externa |
| 10 | `SolicitudDelivery` | delivery | Solicitud de entrega entre estudiantes (solo DELIVERY) |
| 11 | `Resena` | pedido (subpaquete) | Reseña post-entrega sobre punto o repartidor |
| 12 | `MovimientoQueuePoints` | queuepoints | Movimiento de saldo en formato ledger |

Adicionalmente hay 1 enum modelado como `@ElementCollection`: `Rol` (CLIENTE/COMERCIO/REPARTIDOR), que vive en una tabla de unión `usuario_roles` asociada a `Usuario`. Ese enum NO es una entidad JPA, es un valor.

## Defensa entidad por entidad

Algunas entidades son obvias en cualquier sistema de pedidos. Otras merecen una defensa más detallada porque su existencia separada no es trivial. Dividimos en dos grupos.

### Grupo A — Entidades estándar de cualquier sistema de pedidos (7)

Son entidades canónicas que aparecerían en cualquier dominio similar.

**Usuario.** Identidad del actor en el sistema. Tiene email único, password hash, nombre completo y un `Set<Rol>` con los roles activos. Es la raíz de autenticación y referencia de muchas otras entidades. Los roles se modelan con `@ElementCollection`, que se materializa en una tabla `usuario_roles` separada.

**PuntoDeVenta.** Cada local físico dentro del campus UTEC (cafetería, restaurante, kiosko). Tiene nombre, ubicación, horarios, estado abierto/cerrado y un gestor (un `Usuario` con rol COMERCIO). No es una entidad débil de Usuario porque tiene identidad propia: el local existe independiente de quién lo gestione, y un usuario gestor puede transferir el local a otro.

**Producto.** Ítem que un PuntoDeVenta vende. Tiene precio, descripción, foto, categoría y disponibilidad. Pertenece a un PuntoDeVenta vía `@ManyToOne`. Es necesario separar de PuntoDeVenta porque un local tiene varios productos con ciclo de vida propio (un producto se puede agotar sin que cierre el local).

**Pedido.** El corazón del sistema. Una orden de un cliente en un PuntoDeVenta, con su máquina de estados de 11 estados, total, descuentos, timestamps por transición. Documentado en detalle en ADR-0009.

**ItemPedido.** Línea de detalle dentro de un Pedido (qué producto, cuántas unidades, precio unitario, subtotal). Es una entidad clásica de "header-detail": no puede existir sin Pedido (`ON DELETE CASCADE`) pero necesita identidad propia para tracking individual (un cliente puede tener 3 hamburguesas y 2 gaseosas en el mismo pedido).

**Resena.** Reseña que un cliente deja después de un pedido ENTREGADO, sobre el punto de venta o el repartidor. Tiene rating (1-5), comentario opcional, referencia al pedido. Es entidad porque tiene identidad propia y un constraint UNIQUE de "una reseña por pedido por objetivo" para evitar spam.

**MovimientoQueuePoints.** Movimiento individual de puntos (ganados al hacer una entrega, canjeados al usar puntos como descuento). Decisión clave: NO guardamos saldo, guardamos movimientos. Ver ADR-0008 para la defensa completa del patrón ledger.

### Grupo B — Entidades que merecen defensa explícita (5)

Acá están las decisiones que no son obvias: los 3 perfiles separados, Pago separado y SolicitudDelivery separado. Cada una podría plantearse como "¿y si lo metemos todo junto?". Explicamos por qué decidimos separarlas.

#### 2-3-4. Los 3 perfiles (PerfilCliente, PerfilComercio, PerfilRepartidor)

**El planteamiento alternativo sería:** meter todos los campos de los 3 perfiles en Usuario directamente, dejando NULL los que no apliquen.

**Lo descartamos por 3 razones técnicas:**

**Razón 1 — Sparse columns inaceptables.** Si juntáramos todo en Usuario tendríamos columnas como `ruc`, `direccion_preferida`, `alergias`, `calificacion_promedio`, `disponible`, etc. Un usuario que solo tiene rol CLIENTE arrancaría con 5-7 columnas siempre NULL. Para un usuario solo COMERCIO, otras 5 columnas siempre NULL. Eso no es modelar el dominio, es patear el problema bajo la alfombra. Sparse columns también complican queries ("WHERE algo IS NOT NULL" everywhere), agregan tamaño innecesario al row, y hacen que cualquier developer nuevo se pregunte qué columnas aplican cuándo.

**Razón 2 — Violación de Tercera Forma Normal (3FN).** En 3FN, cada atributo no-clave debe depender de la clave **completa** y de **nada más**. Si en Usuario hay una columna `ruc`, esa columna no depende de "usuario.id", depende de "usuario.id que tenga rol COMERCIO". Eso es una dependencia funcional condicional, que es exactamente lo que 3FN prohíbe. Separar los perfiles arregla esto: en PerfilComercio el RUC depende limpiamente del `usuario_id`.

**Razón 3 — Multi-rol genuino, no herencia.** En nuestro dominio, un usuario puede tener **varios roles a la vez**. Camila Rojas (caso en los seeds) es cliente y repartidora simultáneamente. Eso descarta JPA Inheritance (SINGLE_TABLE, JOINED) porque ambas estrategias exigen que un usuario sea **de un solo tipo**. Lo que necesitamos es composición: Usuario **tiene** un PerfilCliente y **tiene** un PerfilRepartidor, no Usuario **es** Cliente. Esto se profundiza en ADR-0007.

**Sobre el cumplimiento normativo que refuerza la decisión.** El RUC del comercio no es un campo decorativo. Es información tributaria que SUNAT exige para emisión de comprobantes electrónicos en Perú. Cuando agreguemos facturación real, el RUC va a tener validaciones (longitud 11, dígitos verificadores, formato `10` o `20`). Esas reglas viven naturalmente en PerfilComercio, no embarradas con datos de cliente.

**Sobre los campos actuales de cada perfil.** Cada uno tiene exactamente los atributos que aplican al rol y nada más:

- **PerfilCliente**: `direccion_preferida` (para autocompletar entregas), `alergias` (información que llega al comercio en pedidos), `total_pedidos` (estadística usada para reportes y desbloqueos futuros).
- **PerfilComercio**: `ruc` (facturación SUNAT), `contacto_telefono` y `contacto_email` (canales de soporte distintos al login del usuario; el comercio puede tener un email corporativo separado del personal).
- **PerfilRepartidor**: `calificacion_promedio` (rating obtenido por sus entregas, se actualiza con cada reseña), `total_entregas` (estadística visible para clientes al elegir repartidor), `disponible` (flag que el repartidor activa/desactiva sin perder su historial de entregas ni rating).

**Por qué no agregamos más.** Cada campo adicional sería un costo permanente en el modelo. Si en algún momento hace falta (ejemplo: zona habitual del repartidor, métodos de pago preferidos del cliente), se agrega con una migración Flyway nueva. Mientras tanto el modelo se mantiene del tamaño estrictamente necesario.

#### 9. Pago como entidad separada (no campo de Pedido)

**El planteamiento alternativo sería:** tener `pedido.estado_pago` y `pedido.monto_pagado` en lugar de una tabla `pago` aparte.

**Lo descartamos por bounded contexts.** El pago tiene un ciclo de vida propio:

```
PENDIENTE → CONFIRMADO → REEMBOLSADO
         ↘ FALLIDO
```

Esto es **diferente** del ciclo de vida del Pedido. Un pedido puede estar `ENTREGADO` mientras el pago está `CONFIRMADO`, o puede estar `CANCELADO_POR_CLIENTE` mientras el pago está `REEMBOLSADO`. Son máquinas de estado independientes que evolucionan en paralelo.

Además, el Pago se integra con MercadoPago / Culqi (sandbox). Tiene su propia `referencia_externa` (ID que devuelve la pasarela), webhooks asíncronos que confirman pagos minutos después, timestamps específicos (`confirmado_at`, `reembolsado_at`). Meter eso en Pedido convierte a Pedido en una entidad con dos responsabilidades pegadas.

**Patrón aplicado:** bounded contexts de DDD. El módulo `pago/` no sabe internals de Pedido, solo recibe un `pedidoId` y emite/escucha eventos. Eso nos permite cambiar de pasarela (Mock → MercadoPago → Culqi) sin tocar el módulo de pedidos.

**Lo concreto en código:**

- `Pago` tiene un `@OneToOne` con Pedido vía `pedido_id UNIQUE`.
- Su tabla está en V1 `pago` con su propio CHECK constraint para los estados.
- `PagoService`, `PaymentGateway` (interface), `MockPaymentGateway` y `MercadoPagoGateway` viven en el módulo aparte.

#### 10. SolicitudDelivery como entidad separada (no campos en Pedido)

**El planteamiento alternativo sería:** poner `pedido.repartidor_id` y `pedido.estado_delivery` en Pedido.

**Misma lógica que Pago, más una razón extra: NO todos los pedidos son DELIVERY.**

Un pedido puede ser `PICKUP` (el cliente lo recoge directamente) o `DELIVERY` (un compañero lo trae). Si pusiéramos los campos de delivery en Pedido, tendríamos:

- En PICKUP: `repartidor_id NULL`, `zona_entrega NULL`, `busqueda_inicio_at NULL`, `asignado_at NULL`, `recogido_at NULL`, `entregado_at NULL` (por la ruta delivery).
- En DELIVERY: todos esos campos llenos eventualmente.

Eso es **exactamente el mismo problema de sparse columns** que tuvimos con los perfiles. Solución: SolicitudDelivery es una entidad opcional 1:0..1 con Pedido. Existe **solo** para pedidos DELIVERY.

Además, SolicitudDelivery tiene **su propia máquina de estados**:

```
BUSCANDO → ASIGNADO → RECOGIDO → ENTREGADO
        ↘ SIN_REPARTIDOR
        ↘ CANCELADO
```

Esa máquina es independiente de la máquina de estados del Pedido. Un Pedido puede estar `LISTO_PARA_DELIVERY` mientras la SolicitudDelivery está todavía `BUSCANDO` (el comercio terminó pero todavía no hay repartidor asignado).

**Lo concreto en código:**

- `SolicitudDelivery` tiene un `@OneToOne` con Pedido vía `pedido_id UNIQUE`.
- Tiene `repartidor_id` (nullable, se llena al asignar).
- Tiene timestamps específicos del flow delivery.
- Vive en el módulo `delivery/`, con su propio service y matcher.

## Alternativas consideradas

### Alternativa 1 — Modelo "compacto" de 6 entidades con NULLs

Una sola tabla `usuario` con todos los campos, un `pedido` con todo embebido (pago + delivery), y solo PuntoDeVenta, Producto, Resena, Movimiento aparte.

Lo descartamos porque:

- Sparse columns mata legibilidad y performance.
- Violación de 3FN (ver glosario).
- Pedido se vuelve una entidad de 30+ columnas imposible de mantener.

### Alternativa 2 — JPA Inheritance con `@Inheritance(strategy = JOINED)`

Tener `Usuario` abstracto y `Cliente extends Usuario`, `Comercio extends Usuario`, `Repartidor extends Usuario`.

Lo descartamos porque:

- Bloquea multi-rol. Un Usuario en JPA Inheritance es de UN solo tipo.
- En el dominio real, Camila es cliente Y repartidora a la vez.
- Cambiar el tipo de un Usuario sería un UPDATE con cambio de discriminador, sucio y propenso a inconsistencias.

### Alternativa 3 — Modelo "explotado" de 20+ entidades

Separar Direccion como entidad, separar Telefono, separar HorarioApertura, crear una entidad NotificacionEnviada, una entidad EventoAuditoria, etc.

Lo descartamos porque:

- Sobre-modularización. Un horario de apertura no necesita identidad propia.
- Más JOINs en queries comunes.
- Más complejidad sin beneficio.
- YAGNI: si en el futuro hace falta, se extrae sin drama.

## Consecuencias

### Positivas

- Cada entidad tiene **una sola responsabilidad clara**.
- Sparse columns evitadas en todo el modelo.
- 3FN respetada.
- Multi-rol genuino soportado de forma natural.
- Bounded contexts permiten evolucionar `pago/` y `delivery/` independientemente (cambiar gateway, agregar criterios de matching, etc.).
- Cuando llegue producción y el RUC tenga validaciones SUNAT, viven en PerfilComercio limpiamente.
- Reportes y queries son más legibles (no `WHERE ruc IS NOT NULL`).

### Negativas

- **Más JOINs en queries.** Para mostrar el detalle de un Pedido con su Pago y su SolicitudDelivery hace falta unir 3 tablas. Mitigación: el `@OneToOne` con FK directa hace los joins baratos. Los índices están puestos (`idx_pago_pedido`, etc.).
- **Más boilerplate inicial.** 12 entidades + 12 repositorios + servicios. Más código que escribir. Mitigación: Lombok reduce el boilerplate en entidades. Spring genera los repos sin código.
- **Curva de aprendizaje para alguien nuevo.** Hay que entender por qué los perfiles están separados. Mitigación: este ADR.

### Riesgos

- **Riesgo de inconsistencia entre las máquinas de estado de Pedido y los módulos satélite (Pago, SolicitudDelivery).** Si Pedido pasa a `ENTREGADO` pero SolicitudDelivery sigue en `ASIGNADO`, hay desincronización. Mitigación: los listeners de eventos (ADR-0009) consumen `PedidoEstadoCambiadoEvent` y mantienen la coherencia. Tests de integración validarán esto al implementar Semana 2-3.
- **Riesgo de perfil faltante.** Si un usuario activa el rol COMERCIO pero PerfilComercio no se crea, el sistema se rompe en runtime al consultar el RUC. Mitigación: el TODO de Semana 1 en `AuthService.register` es precisamente eso — crear automáticamente los perfiles vacíos al activar el rol. Pendiente al cierre de este ADR.

## Anexo A — Cómo vive cada entidad en la base

V1 `__schema_inicial.sql` materializa las 12 entidades en 12 tablas más `usuario_roles` (tabla de unión para el `@ElementCollection`). Total: 13 tablas físicas.

Las cifras siguientes son **estimaciones realistas para el contexto UTEC**: la población total del campus ronda los pocos miles de estudiantes, así que el volumen del MVP es modesto.

| Tabla | Filas esperadas en producción (UTEC) |
|---|---|
| usuario | ~1500-3000 (estudiantes activos en el sistema) |
| usuario_roles | ~1.2x usuarios (algunos multi-rol) |
| perfil_cliente | ~80% de usuarios |
| perfil_comercio | ~20-30 (uno por local del campus) |
| perfil_repartidor | ~10-15% de usuarios (early adopters del programa) |
| punto_de_venta | ~20-30 |
| producto | ~500-1000 |
| pedido | Decenas de miles al cabo del primer año |
| item_pedido | ~2-4x pedidos |
| pago | 1:1 con pedidos pagados |
| solicitud_delivery | ~30% de los pedidos |
| resena | ~50% de los pedidos entregados |
| movimiento_queuepoints | Crece con cada entrega completada |

Volumen modesto: la base entera entra holgadamente en una instancia chica de Postgres. No anticipamos problemas de performance con esta escala.

## Anexo B — Glosario de términos técnicos

Este glosario está pensado para que cualquiera que lea el ADR sin contexto técnico previo pueda entender los conceptos clave. Por eso usamos lenguaje llano con ejemplos del propio proyecto.

**3FN (Tercera Forma Normal).** Es una regla de diseño de bases de datos relacionales. La idea es simple: cada columna de una tabla debe describir directamente a la fila completa, no a un subconjunto de filas.

Ejemplo concreto del proyecto: imaginá que ponemos la columna `ruc` directamente en la tabla `usuario`. Ahora pensá qué significa esa columna: "el RUC de este usuario". Pero el RUC solo aplica si el usuario es un comercio; un cliente puro no tiene RUC y siempre lo va a tener NULL. Es decir, la columna no describe al usuario, describe a "los usuarios que son comercios". Eso rompe 3FN. La solución es sacar el RUC de `usuario` y meterlo en una tabla aparte (`perfil_comercio`), donde sí describe a todas las filas porque todas las filas de esa tabla son comercios.

**Sparse columns.** Literalmente "columnas dispersas". Son columnas que están en NULL la mayoría del tiempo porque solo aplican a una minoría de filas.

Ejemplo concreto: si tuviéramos `medio_transporte` en `usuario`, estaría NULL en el 85% de las filas (los que no son repartidores). Eso es una sparse column. Son aceptables en casos aislados, pero cuando se vuelven la regla, indican que estamos mezclando conceptos que en realidad son separados. La señal de alarma es cuando empezás a escribir queries con muchos `WHERE columna IS NOT NULL` para filtrar a las filas "que sí aplican".

**Bounded context (DDD).** Concepto que viene de Domain-Driven Design. Es una zona del sistema con sus propias reglas, su propio vocabulario y sus propias entidades, que se comunica con otras zonas a través de interfaces bien definidas.

Ejemplo concreto: en QueueLess, el módulo `pago/` es un bounded context. Adentro habla de "transacciones", "métodos de pago", "webhooks de pasarela", "reembolsos". El módulo `pedido/` no sabe nada de eso; solo sabe "este pedido fue pagado" o "este pedido debe reembolsarse". Si mañana cambiamos MercadoPago por Culqi, lo único que cambia es lo de adentro del módulo `pago/`. El módulo `pedido/` ni se entera. Eso es bounded contexts evolucionando independientemente.

**Ledger pattern.** Patrón donde el saldo de algo (puntos, dinero, stock) NO se guarda como un campo, sino que se calcula sumando movimientos individuales.

Ejemplo concreto del proyecto: en lugar de tener `usuario.queuepoints = 250`, tenemos una tabla `movimiento_queuepoints` con filas como:

```
+50  GANADO  (entrega de pedido #1290)
+50  GANADO  (entrega de pedido #1305)
-30  CANJEADO (descuento aplicado a pedido #1320)
+50  GANADO  (entrega de pedido #1340)
+130 GANADO  (bono de bienvenida)
```

El saldo (250) es la suma de esos 5 movimientos. Ventajas: auditoría completa (siempre se sabe por qué se tiene ese saldo), reversibilidad (si un movimiento fue por error, se revierte con otro movimiento), y nunca puede haber inconsistencia entre el saldo guardado y los movimientos reales, porque el saldo no se guarda. Lo usan Visa, Starbucks, MercadoPago. Ver ADR-0008.

**Máquina de estados (state machine).** Modelo donde una entidad tiene un conjunto fijo de estados posibles y un conjunto fijo de transiciones permitidas entre esos estados. Cualquier transición fuera de las permitidas es rechazada.

Ejemplo concreto: un Pedido en QueueLess puede pasar de `PENDIENTE_PAGO` a `PAGADO_BUSCANDO_REPARTIDOR`, pero no puede saltar directo de `PENDIENTE_PAGO` a `ENTREGADO`. El mapa de transiciones legales vive en `EstadoPedido.java`. Si alguien intenta hacer una transición ilegal, el método `transicionarA` lanza una excepción. Eso garantiza que ningún pedido termine en un estado inconsistente.

**`@OneToOne` con `@MapsId`.** Patrón de JPA donde la clave primaria (PK) de una tabla hija es a la vez la clave foránea (FK) que la conecta con la tabla padre. Es decir, la hija no tiene una columna ID propia: usa el ID del padre como su ID.

Ejemplo concreto: la tabla `perfil_cliente` no tiene una columna `id` propia. Su PK es directamente `usuario_id`, que también es FK a `usuario.id`. Esto crea una relación 1:0..1 limpia: cada usuario tiene como máximo un perfil cliente, y nunca puede haber dos perfiles cliente con el mismo `usuario_id` porque eso violaría la unicidad de la PK.

**`@ElementCollection`.** Anotación de JPA que mapea una colección de valores simples (no entidades) a una tabla aparte, sin que esos valores tengan identidad propia.

Ejemplo concreto: los roles de un usuario (`Set<Rol>`) se guardan en una tabla `usuario_roles` con dos columnas: `usuario_id` y `rol`. Cada fila representa un rol activo de un usuario. No tiene sentido modelar Rol como una entidad porque CLIENTE, COMERCIO y REPARTIDOR son valores fijos del enum, no objetos con identidad propia.

**Bounded contexts evolucionando independientemente.** Es la consecuencia práctica de tener bounded contexts bien definidos: podemos cambiar la implementación interna de un módulo sin tener que tocar los otros.

Ejemplo concreto del proyecto: el módulo `pago/` hoy usa `MockPaymentGateway` en dev y va a usar `MercadoPagoGateway` en producción. Cuando hagamos el switch, el módulo `pedido/` no cambia ni una línea. La interface `PaymentGateway` define el contrato, y la implementación es intercambiable.

## Referencias

- `backend/src/main/resources/db/migration/V1__schema_inicial.sql` — schema completo.
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/` — Usuario y los 3 perfiles.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/entity/Pedido.java` — con su máquina de estados.
- `backend/src/main/java/pe/edu/utec/queueless/pago/entity/Pago.java` — Pago separado.
- `backend/src/main/java/pe/edu/utec/queueless/delivery/entity/SolicitudDelivery.java` — Delivery separado.
- ADR-0007 — Multi-rol y composición de perfiles (detalle de la decisión 2-3-4).
- ADR-0008 — Ledger pattern para QueuePoints (detalle de la decisión 12).
- ADR-0009 — Eventos de dominio (cómo se mantiene coherencia entre módulos).
