# ADR-0014 — Flujo de delivery, matching de repartidores y opciones del cliente durante la búsqueda

## Contexto

Al arrancar la Fase 5 (Delivery + QueuePoints + Reseñas) descubrimos un agujero en la documentación: **ningún ADR existente dice quién dispara cada transición del pedido en el flujo DELIVERY**. El ADR-0003 modela `SolicitudDelivery` como entidad separada con su propia máquina de estados, el ADR-0009 establece el patrón de eventos y listeners, y el ADR-0013 documenta cómo `PagoService` orquesta la transición tras confirmar el pago. Pero no había un documento que dijera con precisión qué pasa entre que el pago se confirma para un pedido DELIVERY y que el repartidor lo entrega.

Ese agujero costó caro. La primera implementación de Fase 5 tenía el listener de creación de solicitud cableado al estado equivocado (`ACEPTADO`), creando un deadlock conceptual: el pedido quedaba atorado en `PAGADO_BUSCANDO_REPARTIDOR` porque el listener esperaba que el comercio aceptara para crear la solicitud, pero el comercio no podía aceptar mientras el pedido no estuviera en `PAGADO_ESPERANDO_COMERCIO`, y a ese estado nadie lo llevaba. Nadie podía dar el primer paso.

Además, la propuesta original del proyecto dice que durante el countdown de 4 minutos el cliente puede **cambiar a pickup, reintentar o cancelar**, pero esas opciones no estaban implementadas en ningún lado del código.

Este ADR cierra los dos agujeros:

1. Documenta el flujo end-to-end de un pedido DELIVERY, especificando quién dispara cada transición.
2. Define las opciones que tiene el cliente durante la búsqueda de repartidor y después del timeout.

Las decisiones que ya están cubiertas en otros ADRs **no se redocumentan acá**: solo se aplican y se citan. Específicamente:

- El patrón de eventos con `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` está en ADR-0009.
- La política de reembolso de cuatro estados y la regla "cliente puede cancelar antes de `ACEPTADO`" están en ADR-0013.
- La separación de `SolicitudDelivery` como entidad y su máquina de estados están en ADR-0003.
- La idempotencia del ledger de QueuePoints está en ADR-0008.

## Decisión

### Quién dispara cada transición del pedido en el flujo DELIVERY

La cadena de transiciones para un pedido tipo DELIVERY queda formalmente atribuida así:

```
PENDIENTE_PAGO
    ↓  PagoService.confirmar (cuando llega la confirmación del webhook)
PAGADO_BUSCANDO_REPARTIDOR
    ↓  SolicitudDeliveryService.aceptar (cuando un repartidor toma la solicitud)
PAGADO_ESPERANDO_COMERCIO
    ↓  PedidoService.aceptar (cuando el comercio acepta)
ACEPTADO
    ↓  PedidoService.iniciarPreparacion
EN_PREPARACION
    ↓  PedidoService.marcarListo (variante DELIVERY)
LISTO_PARA_DELIVERY
    ↓  SolicitudDeliveryService.confirmarRecogida
RECOGIDO (solicitud) — el pedido se mantiene en LISTO_PARA_DELIVERY
    ↓  SolicitudDeliveryService.confirmarEntrega
ENTREGADO
```

La consecuencia importante de este orden es que **el comercio NO puede aceptar un pedido DELIVERY hasta que un repartidor lo tome**. Si el comercio aceptara antes, podría empezar a preparar comida que nunca se va a entregar (si no aparece repartidor en 4 minutos). El sistema lo bloquea simplemente porque `PedidoService.aceptar` exige que el estado actual sea `PAGADO_ESPERANDO_COMERCIO`, y a ese estado solo se llega cuando `SolicitudDeliveryService.aceptar` lo dispara.

Este orden es distinto al de PICKUP, donde `PagoService.confirmar` lleva el pedido directo a `PAGADO_ESPERANDO_COMERCIO` y el comercio acepta enseguida. La diferencia es deliberada: en DELIVERY el comercio no debe quemar ingredientes mientras no haya alguien que lleve la comida.

**Por qué reutilizamos `PAGADO_ESPERANDO_COMERCIO` para ambos tipos en vez de tener un estado específico para DELIVERY**. Desde el punto de vista del comercio, una vez que llega al estado "puedo aceptar este pedido", la lógica es idéntica para PICKUP y DELIVERY (validar, aceptar, empezar a preparar). El comercio diferencia entre uno y otro mirando el campo `tipoEntrega` del pedido, que está disponible siempre. Tener dos estados distintos (`PAGADO_ESPERANDO_COMERCIO_PICKUP` vs `PAGADO_ESPERANDO_COMERCIO_DELIVERY`) duplicaría las transiciones a partir de ahí sin agregar información útil.

**Nota sobre la transición `RECOGIDO`**. Cuando el repartidor confirma la recogida en el local, lo que cambia es el estado de la **solicitud** (`ASIGNADO → RECOGIDO`), no del pedido. El pedido se mantiene en `LISTO_PARA_DELIVERY` hasta que el repartidor confirma la entrega al cliente, momento en el que el pedido transiciona a `ENTREGADO`. Esto refleja que el pedido y la solicitud son entidades con máquinas de estado independientes (decisión 10 del ADR-0003).

### Creación automática de la solicitud al confirmar el pago

`CrearSolicitudDeliveryListener` reacciona a la transición a `PAGADO_BUSCANDO_REPARTIDOR` (no a `ACEPTADO`, como decía la implementación original con bug). Para cada evento, verifica que el pedido sea DELIVERY (los PICKUP nunca generan solicitud, así que el guard descarta los falsos positivos) y llama a `SolicitudDeliveryService.crearParaPedido(pedido)`.

El servicio es idempotente: si ya existe una solicitud para ese `pedidoId`, no crea otra. Esa idempotencia es importante porque el evento podría reentregar (en caso raro de reintento del listener) y no queremos dos solicitudes para un mismo pedido.

```java
@Async("queuelessTaskExecutor")
@TransactionalEventListener
public void onPedidoBuscandoRepartidor(PedidoEstadoCambiadoEvent event) {
    if (event.getEstadoNuevo() != EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR) {
        return;
    }
    Pedido pedido = pedidoService.findById(event.getPedidoId());
    // El estado solo aplica a DELIVERY, pero el guard explícito protege
    // ante cambios futuros de la máquina de estados.
    if (pedido.getTipoEntrega() != TipoEntrega.DELIVERY) {
        return;
    }
    solicitudDeliveryService.crearParaPedido(pedido);
}
```

### Matching publica evento, no llamada directa

`SolicitudDeliveryService.crearParaPedido` ya no llama directamente a `RepartidorMatchingService.iniciarBusqueda` después de persistir la solicitud. En vez de eso, **publica un evento de dominio** `SolicitudDeliveryCreadaEvent`, y el matching service lo escucha como `@TransactionalEventListener(AFTER_COMMIT)` + `@Async`.

La razón es la regla del ADR-0009: los efectos secundarios solo deben ocurrir cuando la transacción que los causó ya quedó persistida. La implementación anterior tenía un bug latente: si la transacción de `crearParaPedido` se revertía después de llamar al matching, las notificaciones push ya habrían salido sobre una solicitud "fantasma" cuyo ID no estaba en la base.

Con el evento, el flujo queda:

1. `SolicitudDeliveryService.crearParaPedido` persiste la solicitud y publica `SolicitudDeliveryCreadaEvent(solicitudId)`.
2. La transacción se confirma.
3. Spring entrega el evento a `RepartidorMatchingService.onSolicitudCreada`, que corre en otro hilo.
4. El matching busca repartidores disponibles y les manda push.

Si la transacción se revierte, el listener nunca corre. Sin solicitud persistida, no hay notificaciones falsas.

### Matching MVP: notificar a todos los disponibles

Para esta fase, el matching es deliberadamente simple: notifica a **todos los repartidores marcados como disponibles**, sin filtrar por cercanía geográfica. La primera aceptación gana (`SolicitudDeliveryService.aceptar` rechaza con 422 las aceptaciones posteriores porque el estado de la solicitud ya no es `BUSCANDO`).

```java
@Async("queuelessTaskExecutor")
@TransactionalEventListener
public void onSolicitudCreada(SolicitudDeliveryCreadaEvent event) {
    List<PerfilRepartidor> disponibles = perfilRepartidorRepository.findByDisponibleTrue();
    if (disponibles.isEmpty()) {
        log.warn("No hay repartidores disponibles para solicitud {}", event.getSolicitudId());
        return;
    }
    for (PerfilRepartidor perfil : disponibles) {
        notificationService.notificar(/* push con solicitudId, timeout, etc. */);
    }
}
```

Esto es una **simplificación consciente del MVP**. La sección "Plan futuro: matching con coordenadas 3D" más abajo detalla el modelo de cercanía real que reemplazará este matching cuando se haga el relevamiento de campo del campus.

### Política del timeout: tres opciones para el cliente

Cuando el `BusquedaTimeoutJob` detecta que pasaron 4 minutos sin que ningún repartidor acepte, marca la solicitud como `SIN_REPARTIDOR`. El pedido **se queda en `PAGADO_BUSCANDO_REPARTIDOR`** esperando una decisión del cliente. NO se cancela automáticamente.

El razonamiento es que el comercio no aceptó el pedido todavía, así que cancelar como `CANCELADO_POR_COMERCIO` sería falso (el comercio no hizo nada). Y cancelar automáticamente como `CANCELADO_POR_CLIENTE` quitaría agencia al cliente, que probablemente sí quiera seguir intentando o cambiar a pickup.

El cliente recibe una notificación push con un campo en el payload (`data.requiereDecision=true` o similar) que la app móvil interpreta para mostrar la pantalla de las tres opciones. El detalle del payload es responsabilidad del adapter de notificaciones; en este ADR basta con saber que el mecanismo existe.

Las tres opciones son:

| Opción | Endpoint | Efecto |
|---|---|---|
| Reintentar búsqueda | `POST /api/cliente/pedidos/{id}/solicitud-delivery/reintentar` | Crea una **nueva** `SolicitudDelivery` en `BUSCANDO` (la anterior queda en `SIN_REPARTIDOR` como histórico) y reinicia el countdown de 4 minutos. El endpoint no resucita la solicitud anterior, crea otra. |
| Cambiar a pickup | `POST /api/cliente/pedidos/{id}/cambiar-a-pickup` | Cambia `tipoEntrega` del pedido a `PICKUP`, transiciona el pedido a `PAGADO_ESPERANDO_COMERCIO`, cancela la solicitud actual (`CANCELADO`). El comercio ya puede aceptar como pickup normal. |
| Cancelar el pedido | `POST /api/cliente/pedidos/{id}/cancelar` (ya existe desde Fase 4) | Cancela el pedido. Como estaba en `PAGADO_BUSCANDO_REPARTIDOR` (incluido en `GATILLAN_REEMBOLSO`), el reembolso es automático. |

Las tres opciones también están disponibles **durante** la espera de 4 minutos, no solo después del timeout. Si el cliente cambia de opinión a los 30 segundos y prefiere pickup, no tiene que esperar a que el countdown termine.

**Sobre el cambio de `tipoEntrega`**. La operación "cambiar a pickup" modifica el campo `tipoEntrega` del pedido. Aceptamos para Fase 5 que esto pierde un poco de información histórica (no queda registro en el pedido de que originalmente fue DELIVERY). El rastro queda implícito en la tabla `solicitud_delivery`: si el pedido tiene solicitudes asociadas en estado `CANCELADO` o `SIN_REPARTIDOR`, originalmente fue DELIVERY. Si en una fase futura necesitamos saberlo explícitamente para métricas, agregamos un campo `tipoEntregaOriginal` sin tocar la lógica actual.

### Sin límite de reintentos

Decidimos no poner un tope al número de reintentos. Si el cliente quiere intentar 10 veces, puede hacerlo. La decisión queda en sus manos.

La razón es que cualquier número tope sería arbitrario (¿3 reintentos? ¿5?). Si en el futuro los datos muestran que hay clientes que reintentan compulsivamente y eso satura el sistema de notificaciones, evaluamos poner un límite con fundamento en datos reales.

### Endpoint de canje de QueuePoints

Exponemos `POST /api/me/queuepoints/canjear` con el DTO `CanjearPuntosRequest` que ya estaba implementado en el módulo. El service ya hace toda la lógica (validar saldo, idempotencia por `referenciaTipo` + `referenciaId`); lo que faltaba era el endpoint público.

El endpoint es del rol cliente porque cualquier usuario autenticado con saldo positivo puede canjear (no requiere rol específico). La integración con el flujo de pago (descontar puntos al pagar un pedido) queda para una fase futura.

### Cómo se vincula con QueuePoints

El listener `EntregaCompletadaListener` (en el módulo `queuepoints/`) reacciona a la transición del pedido a `ENTREGADO`. Si el pedido tenía `SolicitudDelivery` (es decir, era DELIVERY), llama a `QueuePointsService.registrarGanancia(repartidorId, 50, ...)` con la `referenciaId` del pedido. La idempotencia ya está cubierta por el SELECT-before-INSERT que existe en el service (ver ADR-0008).

Si el pedido era PICKUP, no hay `SolicitudDelivery`, el listener detecta el `Optional.empty()` y termina sin hacer nada. Eso refleja la regla de producto: solo el repartidor gana QueuePoints, no el cliente.

## Alternativas consideradas

### Alternativa 1 — Cancelar automáticamente el pedido al vencer el timeout

Al vencer los 4 minutos sin repartidor, el job cancelaría el pedido (con un estado nuevo `CANCELADO_AUTOMATICAMENTE` o reusando `CANCELADO_POR_COMERCIO`).

Descartado por dos razones:

- **Mete al comercio en un evento que no decidió**. El comercio nunca aceptó el pedido. Cancelarlo como `CANCELADO_POR_COMERCIO` sería atribuirle una acción que no realizó.
- **Quita agencia al cliente**. La propuesta original es clara en que el cliente debe poder reintentar o cambiar a pickup. Cancelar automáticamente fuerza una decisión que probablemente no quiera tomar.

### Alternativa 2 — Permitir al comercio aceptar pedidos DELIVERY desde `PAGADO_BUSCANDO_REPARTIDOR`

El comercio podría aceptar el pedido apenas el pago se confirme, sin esperar a que haya repartidor asignado. La preparación arrancaría antes y la comida estaría más fresca cuando el repartidor la recoja.

Descartado por el caso de "no aparece repartidor". Si el comercio aceptó y empezó a preparar, y después no llega ningún repartidor, la comida queda hecha sin que nadie la lleve. El comercio asumiría un costo (ingredientes usados) por una entrega que nunca ocurre.

El compromiso elegido prioriza al comercio: prefiere esperar a tener repartidor confirmado antes de gastar ingredientes. En la práctica, el timeout es de 4 minutos, así que la espera adicional es chica.

### Alternativa 3 — Crear la solicitud al construir el pedido

Crear la `SolicitudDelivery` en estado `BUSCANDO` ya durante `PedidoService.crear`, no esperando a la confirmación del pago.

Descartado porque la búsqueda activa de repartidor no tiene sentido si el pago todavía no se confirmó. Si el cliente abandona el pago, tendríamos una solicitud activa enviando push a repartidores por un pedido que nunca se va a cobrar. Crear la solicitud después de la confirmación del pago es más limpio.

### Alternativa 4 — Cambiar a pickup como UPDATE simple de `tipoEntrega`

Para "cambiar a pickup", simplemente hacer `UPDATE pedido SET tipo_entrega = 'PICKUP'` sin tocar nada más.

Descartado porque no contempla el estado actual del pedido (`PAGADO_BUSCANDO_REPARTIDOR`) ni la solicitud activa. Sin transicionar el pedido a `PAGADO_ESPERANDO_COMERCIO`, el comercio sigue sin poder aceptarlo. Sin cancelar la solicitud, sigue activa y podría recibir aceptación de un repartidor que ya no aplica. La operación tiene que hacer las tres cosas juntas: cambiar `tipoEntrega`, transicionar estado, cancelar solicitud.

### Alternativa 5 — Poner un límite a los reintentos

Por ejemplo, máximo 3 reintentos por pedido. Después del tercer fracaso, forzar al cliente a elegir entre cambiar a pickup o cancelar.

Descartado porque cualquier número tope sería arbitrario. Sin datos de uso real, no tenemos cómo justificar 3 vs 5 vs 10. Mejor dejar la decisión en el cliente y evaluar en una fase futura si la métrica muestra que hay abuso.

## Plan futuro: matching con coordenadas 3D del campus UTEC

El matching MVP notifica a todos los disponibles. Eso funciona para validar el flujo, pero a producción real va a generar mucha notificación irrelevante (un repartidor en el bloque A recibiendo push de una entrega en el bloque C, piso 8).

Implementar "cercanía real" en el campus UTEC tiene una complicación particular: **la universidad es más alta que ancha**. Tenemos 11 pisos verticales y solo 4 ascensores ubicados en las esquinas de cada piso. Una distancia 2D engañosa diría que dos locales separados por 11 pisos están "cerca" porque su posición horizontal coincide. La realidad es que ir de uno a otro toma varios minutos esperando ascensor.

### Modelo propuesto

En vez de coordenadas 2D, modelaríamos:

| Campo | Descripción |
|---|---|
| `bloque` | Letra o código del bloque del campus (A, B, C, etc.). |
| `piso` | Número del piso (1 a 11). |
| `zona` | Subdivisión opcional dentro del piso (norte, sur, centro), útil para pisos grandes. |

Estos campos van en `PuntoDeVenta` (la ubicación del local) y eventualmente en `PerfilRepartidor.ubicacionActual` (la ubicación reportada por el repartidor cuando se marca disponible).

### Función de distancia con costo vertical

La distancia entre dos puntos del campus se calcularía con una fórmula que pondere el costo de moverse en vertical más alto que el horizontal:

```
distancia(A, B) = costoHorizontal(bloqueA, zonaA, bloqueB, zonaB) +
                  costoVertical(pisoA, pisoB) * factorAscensor
```

Donde `factorAscensor` refleja que esperar y subir en ascensor toma del orden de 30-60 segundos por viaje, más que caminar el equivalente en horizontal.

### Ruteo por ascensores

El camino óptimo entre dos locales con pisos distintos siempre pasa por **un** ascensor (no se cruza el campus al ascensor más lejano). La heurística sería: usar el ascensor más cercano al origen, después caminar al destino.

Para mostrar ruta al repartidor o al cliente que va a recoger, el cálculo se haría en backend (no en cliente) porque la lógica de cuál ascensor conviene depende del estado del edificio (ascensores en mantenimiento, horarios).

### Trabajo de campo necesario

El equipo (Leonardo + Enrique) tiene que hacer un relevamiento físico de cada local del campus, capturando:

- Bloque (en qué torre o sección está).
- Piso exacto.
- Zona dentro del piso (referencia visual: norte, sur, "al lado del ascensor 2", etc.).

Ese relevamiento alimenta el seed de producción de `PuntoDeVenta`. Sin esa data, el matching real no se puede activar.

### Cuándo lo activamos

Esto NO se implementa en Fase 5. El trabajo pendiente para activarlo es:

1. Relevamiento de campo de los locales del campus.
2. Migración nueva en `db/migration/` agregando los 3 campos a `punto_de_venta` y `perfil_repartidor`.
3. Refactor del `RepartidorMatchingService` para filtrar y ordenar por distancia.
4. UI en la app móvil para que el repartidor pueda actualizar su ubicación.

Queda pendiente como issue de seguimiento que se abrirá al cerrar las fases de implementación principal del proyecto.

## Política de devolución de QueuePoints cuando un pedido se cancela

Cuando se implemente el endpoint de canje (`POST /api/me/queuepoints/canjear`, parte de Fase 5), aparece naturalmente una pregunta: ¿qué pasa con los puntos canjeados si el pedido al que se aplicaron termina cancelado?

La regla general es: **si el servicio prometido no se prestó por causa ajena al cliente, los puntos se devuelven**. La política completa con todos los casos (cancelación por comercio, por cliente, expiración, etc.) y su implementación con movimientos `REVERTIDO` queda documentada en la **actualización del ADR-0008**, sección "Estado actual y flujos futuros". Mantenemos la política en un solo lugar para evitar que se desincronicen las dos versiones.

En Fase 5 dejamos un TODO en el código del listener de QueuePoints que apunta a esa sección del ADR-0008. La implementación real se difiere a una fase posterior.

## Consecuencias

### Positivas

- **El flujo DELIVERY funciona end-to-end de verdad**. El test de integración valida el flujo real, no un workaround manual.
- **Comercio protegido de costos hundidos**. No empieza a preparar comida hasta que un repartidor esté confirmado.
- **Cliente con control real durante la espera**. Las tres opciones (reintentar, cambiar a pickup, cancelar) están disponibles en cualquier momento, no solo al vencer el timeout.
- **Patrón de eventos consistente**. El matching ahora sigue el mismo patrón que el listener de notificaciones, el de reembolsos y el de QueuePoints (ADR-0009). El módulo es uniforme.
- **Crédito limpio al repartidor**. Solo gana QueuePoints quien entregó realmente; los PICKUP no asignan puntos a nadie.

### Negativas

- **El comercio espera más en DELIVERY**. En el caso simple, 4 minutos adicionales después del pago antes de poder aceptar. Si el cliente reintenta varias veces, la espera puede ser bastante mayor (4 minutos por intento). Mitigación: la mayoría de las búsquedas reales debería resolver en menos de un minuto si hay repartidores disponibles, y el caso del cliente que reintenta múltiples veces es probablemente raro.
- **Sin filtro de cercanía, hay notificaciones irrelevantes**. Un repartidor en el bloque A recibe push de una entrega en el bloque C. Mitigación: documentado como plan futuro.
- **Pérdida menor de información histórica al cambiar a pickup**. El campo `tipoEntrega` del pedido se sobreescribe sin guardar el valor anterior. Mitigación: el rastro queda implícito en la tabla `solicitud_delivery`.

### Riesgos

- **Solicitudes huérfanas si el cliente abandona**. Si el cliente cierra la app y no decide nada después del timeout, la solicitud queda en `SIN_REPARTIDOR` y el pedido en `PAGADO_BUSCANDO_REPARTIDOR` para siempre. Mitigación: en una fase futura, un job de limpieza puede cancelar pedidos en `PAGADO_BUSCANDO_REPARTIDOR` que no tuvieron actividad en X horas (con reembolso automático). Por ahora se asume que el cliente cierra el ciclo.
- **Saturación del sistema de notificaciones por abuso de reintentos**. Sin límite, un usuario malicioso podría reintentar muchas veces seguidas; cada reintento manda push a todos los repartidores disponibles. Mitigación: si los datos reales muestran que ocurre, agregamos rate limiting al endpoint de reintento o un tope por pedido. No hay evidencia de que sea un problema real hoy.

## Anexo — Glosario de términos técnicos

**Máquina de estados (state machine).** Modelo que define los estados posibles de un objeto y las transiciones permitidas entre ellos. Cada transición tiene una condición que hay que cumplir para que sea válida.

Ejemplo concreto del proyecto: un pedido en `PENDIENTE_PAGO` solo puede pasar a `PAGADO_BUSCANDO_REPARTIDOR`, `PAGADO_ESPERANDO_COMERCIO` o `CANCELADO_POR_CLIENTE`. Cualquier intento de saltar a, digamos, `ENTREGADO` directamente lanza una excepción. El mapa de transiciones legales vive en `EstadoPedido.java`.

**Deadlock conceptual.** Situación donde dos partes esperan algo mutuamente y ninguna puede avanzar. No es el mismo deadlock técnico de bases de datos, sino una falla de diseño donde la lógica del sistema espera algo que nunca va a pasar.

Ejemplo concreto: el bug original del listener era un deadlock conceptual. El comercio esperaba que el pedido pasara a `PAGADO_ESPERANDO_COMERCIO` para poder aceptarlo; el listener esperaba que el comercio aceptara el pedido para crear la solicitud; nadie podía dar el primer paso.

**`@TransactionalEventListener` con fase `AFTER_COMMIT`.** Anotación de Spring que ejecuta el método solo cuando la transacción que publicó el evento se confirma con éxito en la base de datos. Si la transacción se cae a la mitad y se revierte, el método no corre. Esto garantiza que los efectos secundarios (notificaciones, reembolsos, registros de puntos) solo se aplican cuando el cambio que los causó es definitivo.

Cubierto en detalle en ADR-0009.

**`@Async("queuelessTaskExecutor")`.** Anotación de Spring que hace que un método se ejecute en un hilo separado del que lo llamó. El llamador no espera el resultado. En QueueLess esto se usa para que tareas como notificar a repartidores o registrar puntos no bloqueen la respuesta HTTP al usuario.

`queuelessTaskExecutor` es un `ThreadPoolTaskExecutor` configurado en `AsyncConfig` con un pool fijo de hilos dedicados a estas tareas asíncronas, separado del pool de Tomcat que atiende los requests HTTP.

Cubierto en detalle en ADR-0009.

**Idempotencia.** Propiedad de una operación que da el mismo resultado si se ejecuta una o múltiples veces con los mismos datos de entrada. Importante para sistemas con reintentos donde un mismo evento puede llegar dos veces.

Ejemplo concreto del proyecto: si el evento de "pedido pagado y buscando repartidor" se entrega dos veces al `CrearSolicitudDeliveryListener`, queremos que cree **una sola** solicitud, no dos. El service `crearParaPedido` valida la unicidad antes de insertar.

**Costo hundido (sunk cost).** Costo en el que ya se incurrió y no se puede recuperar. En el contexto del comercio, son los ingredientes ya usados o el tiempo del cocinero invertido en un pedido que termina sin entregarse.

Ejemplo concreto: si el comercio prepara una hamburguesa para un pedido DELIVERY que nunca encuentra repartidor, los ingredientes ya están usados y no se pueden devolver al stock. Por eso preferimos esperar a tener repartidor confirmado antes de aceptar la preparación.

**Bloque, piso, zona (modelo 3D del campus UTEC).** Estructura de coordenadas que refleja la arquitectura real de la universidad: torres verticales (bloques) divididas en pisos (1 a 11), cada uno con subdivisiones opcionales (zonas). Es la alternativa a las coordenadas 2D estándar (latitud, longitud), que serían engañosas en un edificio alto.

Ejemplo concreto: el "Café del Bloque A" en el piso 1 y "Sushi Express UTEC" en el bloque C planta baja están en el mismo piso (1), pero en bloques distintos. La distancia entre ellos depende del camino horizontal entre las dos torres. En cambio, un local en el bloque A piso 1 y otro en el bloque A piso 10 están en el mismo bloque pero separados por 9 pisos: hay que pasar por un ascensor.

**Movimiento `REVERTIDO` (en el ledger).** Tipo de movimiento que se inserta para deshacer un movimiento anterior sin borrar el registro original. Mantiene la trazabilidad completa: queda el registro de qué se hizo y el registro de qué se deshizo.

Ejemplo concreto: si un cliente canjeó 30 puntos para descuento en un pedido y ese pedido después se cancela (con derecho a devolución de puntos), el sistema NO borra el movimiento `CANJEADO`. En su lugar, inserta un movimiento `REVERTIDO` de 30 puntos referenciando al canje original. El saldo queda como estaba antes del canje, y la historia muestra ambos eventos.

Cubierto en detalle en ADR-0008.

## Referencias

- `backend/src/main/java/pe/edu/utec/queueless/delivery/service/SolicitudDeliveryService.java` — orquestación de la solicitud.
- `backend/src/main/java/pe/edu/utec/queueless/delivery/service/RepartidorMatchingService.java` — matching como listener.
- `backend/src/main/java/pe/edu/utec/queueless/delivery/listener/CrearSolicitudDeliveryListener.java` — listener del pedido pagado.
- `backend/src/main/java/pe/edu/utec/queueless/delivery/event/SolicitudDeliveryCreadaEvent.java` — evento del bounded context delivery.
- `backend/src/main/java/pe/edu/utec/queueless/scheduling/BusquedaTimeoutJob.java` — job de timeout de 4 minutos.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/controller/PedidoClienteController.java` — endpoints de reintento y cambio a pickup.
- `backend/src/main/java/pe/edu/utec/queueless/queuepoints/listener/EntregaCompletadaListener.java` — listener de puntos al entregar.
- `backend/src/main/java/pe/edu/utec/queueless/queuepoints/controller/QueuePointsController.java` — endpoint de canje.
- `backend/src/main/resources/application.yml` — `queueless.delivery.busqueda-timeout-minutos` (default 4).
- ADR-0003 — Modelo de 12 entidades (SolicitudDelivery como entidad separada).
- ADR-0008 — Ledger pattern para QueuePoints (idempotencia y movimientos `REVERTIDO`).
- ADR-0009 — Eventos de dominio (patrón `@TransactionalEventListener` + `@Async`).
- ADR-0013 — Integración con pasarela de pagos (política de reembolso y `CANCELABLES_POR_CLIENTE`).
- QueueLess Propuesta — Sección "Flujo del cliente con delivery comunitario" y mockups 8 y 16-19.
