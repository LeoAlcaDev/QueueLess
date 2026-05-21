# ADR-0009 — Eventos de dominio con `ApplicationEventPublisher`

## Contexto

Cuando un Pedido cambia de estado, pasan muchas cosas en cadena:

- Si pasa a `ENTREGADO`, hay que asignar QueuePoints al repartidor (si fue delivery).
- Si pasa a `CANCELADO_POR_CLIENTE` desde un estado pagado, hay que iniciar un reembolso con la pasarela.
- En cualquier transición, hay que mandar una notificación push al cliente.
- Posiblemente actualizar estadísticas del comercio (tiempo promedio, total de pedidos).

La pregunta de diseño es: **¿cómo conectamos el cambio de estado del pedido con todas estas acciones derivadas, sin que el código del módulo `pedido` se llene de dependencias hacia los otros módulos?**

Si `PedidoService.cambiarEstado` llamara directamente a `QueuePointsService.registrarGanancia`, `ReembolsoService.emitirReembolso` y `NotificationService.notificar`, entonces el módulo `pedido` dependería de `queuepoints`, `pago` y `notification`. Y mañana, si agregamos un módulo de "loyalty" o "marketing", también tendríamos que tocar `pedido` para agregar la nueva llamada. Acoplamiento creciente.

Este ADR fija cómo resolvemos esto.

## Decisión

Usamos **eventos de dominio sincrónicos transaccionales** con la infraestructura nativa de Spring (`ApplicationEventPublisher` + `@TransactionalEventListener`). El módulo `pedido` no llama a nadie: solo publica un evento. Los demás módulos escuchan ese evento y reaccionan.

Concretamente:

- Un único evento global: `PedidoEstadoCambiadoEvent`. Contiene `pedidoId`, `estadoAnterior`, `estadoNuevo`.

- Cada vez que un Pedido cambia de estado, `PedidoService.cambiarEstado` publica el evento usando `ApplicationEventPublisher.publishEvent(...)`.

- Cada módulo interesado tiene un listener anotado con `@TransactionalEventListener` que reacciona al evento. Los listeners filtran por `estadoNuevo` para procesar solo las transiciones que les interesan.

- Los listeners corren `@Async("queuelessTaskExecutor")` para no bloquear la respuesta HTTP del request original.

- Los listeners se ejecutan **después de que la transacción del pedido se commitea** (`AFTER_COMMIT`, que es el default). Eso garantiza que si la transacción falla, los listeners no corren con datos que después no existirán.

## Por qué un solo evento global y no muchos eventos específicos

Una alternativa común es tener un evento por tipo de transición: `PedidoCreadoEvent`, `PedidoPagadoEvent`, `PedidoAceptadoEvent`, `PedidoEntregadoEvent`, `PedidoCanceladoEvent`, etc.

Lo descartamos porque para QueueLess es overkill:

- Tendríamos 8-10 clases evento con casi el mismo contenido (pedidoId + algún dato de contexto).
- Cada listener tendría que registrarse a varios eventos distintos, duplicando código de configuración.
- La granularidad fina del evento no aporta valor: los listeners ya filtran por `estadoNuevo` adentro.

Con un solo evento, el código es uniforme. El listener de notificaciones ve todos los cambios y filtra los relevantes. El listener de QueuePoints ve todos los cambios y solo reacciona a `ENTREGADO` con delivery. El listener de reembolsos ve todos los cambios y solo reacciona a cancelaciones desde estados pagados.

Si en el futuro necesitamos eventos más específicos (por ejemplo, un evento para "pedido aceptado por el comercio" con datos extra que no caben en `PedidoEstadoCambiadoEvent`), los agregamos sin remover el global. Pero por ahora, uno solo cubre todo.

## Por qué `@TransactionalEventListener` y no `@EventListener` simple

`@EventListener` simple ejecuta el listener inmediatamente cuando se publica el evento, dentro de la misma transacción. Eso tiene un problema: si la transacción del pedido falla por algún motivo después de publicar el evento, los listeners ya ejecutaron lógica con un estado que va a deshacerse.

Ejemplo: imaginate que `PedidoService.cambiarEstado` publica el evento, el `EntregaCompletadaListener` registra el movimiento de QueuePoints, y después la transacción del pedido falla y se hace rollback. Resultado: el pedido queda en su estado anterior, pero los puntos ya están registrados. Inconsistencia.

`@TransactionalEventListener(phase = AFTER_COMMIT)` espera a que la transacción se commitee antes de ejecutar el listener. Si la transacción falla, el listener nunca corre. Eso garantiza que los efectos secundarios solo se aplican cuando el cambio original es definitivo.

El `AFTER_COMMIT` es el default, no hace falta declararlo explícitamente.

## Por qué `@Async`

Los listeners hacen tareas que **no deberían bloquear la respuesta HTTP** del request original:

- Enviar una push notification puede tardar 500ms si Firebase está lento.
- Llamar a la pasarela para iniciar un reembolso puede tardar segundos.
- Registrar un movimiento en QueuePoints es rápido, pero ¿para qué hacer esperar al cliente?

Marcamos los listeners con `@Async("queuelessTaskExecutor")`. Eso hace que cada listener se ejecute en un thread distinto del thread que está atendiendo el request HTTP. El controller responde 200 OK al cliente al instante; los listeners trabajan en background.

`queuelessTaskExecutor` es un `ThreadPoolTaskExecutor` configurado en `AsyncConfig`. Tiene un pool fijo de threads dedicados a estos trabajos asíncronos, separado del pool de Tomcat que atiende requests.

## Listeners actuales

Al cierre de Semana 1 tenemos 3 listeners registrados al evento:

| Listener | Módulo | Reacciona a | Acción |
|---|---|---|---|
| `PedidoNotificationListener` | notification | Cualquier cambio de estado | Manda push al cliente con el estado nuevo |
| `PagoListener` | pago | Cancelaciones desde estados pagados | Inicia reembolso vía la pasarela |
| `EntregaCompletadaListener` | queuepoints | Transición a ENTREGADO con delivery | Registra movimiento GANADO al repartidor |

Todos siguen el mismo patrón:

```java
@Component
@Slf4j
@RequiredArgsConstructor
public class XListener {

    private final ServicioRelevante servicio;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onCambioEstado(PedidoEstadoCambiadoEvent event) {
        if (event.getEstadoNuevo() != ESTADO_RELEVANTE) {
            return;
        }
        servicio.hacerLoQueCorresponda(event.getPedidoId());
    }
}
```

Si en el futuro agregamos un módulo (loyalty, marketing, analytics, lo que sea), solo crea su propio listener al mismo evento. Ni `pedido` ni los otros listeners se enteran.

## Garantía de consistencia entre módulos

Esta es la propiedad clave del modelo: el cambio del Pedido se commitea, y **después** los listeners reaccionan. Si un listener falla (excepción no manejada), eso no rolloea el cambio del Pedido (el pedido queda en su nuevo estado), pero sí queda registrado en el log. Mitigación de fallos:

- Listeners deben ser idempotentes (procesar el mismo evento dos veces no debe duplicar efectos). Ver ADR-0008 sobre idempotencia en QueuePoints.
- Errores en listeners se loggean. En producción esto se conecta con un sistema de alertas.
- Reintentos manuales: si un listener falló, el operador puede re-disparar el efecto a mano (ejecutar el reembolso manualmente, por ejemplo). El sistema no se cuelga.

Si en el futuro la criticidad aumenta y necesitamos reintentos automáticos, agregaríamos una capa con Spring Retry o moveríamos los eventos a un broker tipo RabbitMQ/Kafka. Pero al MVP, eventos en proceso son suficientes.

## Alternativas consideradas

### Alternativa 1 — Llamadas directas service-a-service

`PedidoService.cambiarEstado` llama directamente a `QueuePointsService`, `ReembolsoService`, `NotificationService`.

Descartado porque:

- Acopla `pedido` con todos los otros módulos.
- Cada módulo nuevo requiere modificar `pedido`.
- Difícil de testear: para testear `cambiarEstado` necesitás mockear 4 servicios distintos.

### Alternativa 2 — Broker externo (RabbitMQ, Kafka, AWS SQS)

Publicar los eventos en un broker fuera del proceso del backend. Listeners corren como consumers, posiblemente en otros procesos.

Descartado porque:

- Infraestructura extra (RabbitMQ/Kafka/SQS para mantener).
- Complejidad de configuración, especialmente en dev local.
- No aporta valor real para nuestra escala. Los eventos no necesitan persistir más allá del proceso porque los listeners son rápidos y no críticos.

Esta alternativa sí cobra sentido cuando el sistema crece a múltiples instancias del backend (ej. autoscaling con N réplicas), porque hace falta coordinar entre instancias. Para el MVP con una sola instancia, eventos en proceso bastan.

### Alternativa 3 — `@EventListener` sincrónico simple, sin `@Async` ni `@Transactional`

Publicar y ejecutar todo dentro de la transacción del request HTTP, sincrónicamente.

Descartado porque:

- El cliente espera toda la cadena de listeners antes de recibir respuesta (lentitud).
- Si un listener falla, rollbackea todo (mala separación de responsabilidades).

### Alternativa 4 — Inversión total: ningún acoplamiento ni eventos, módulos puramente independientes

Cada módulo polea periódicamente la base buscando pedidos que requieran su acción.

Descartado porque:

- Latencia alta (polling cada N segundos).
- Carga innecesaria a la base.
- Complica la lógica de "ya procesé este pedido, no lo proceses de nuevo".

## Consecuencias

### Positivas

- **Acoplamiento mínimo entre módulos.** `pedido` no conoce a `queuepoints`, `pago`, ni `notification`. Solo emite eventos.
- **Extensibilidad.** Agregar un módulo nuevo es crear su listener, sin tocar nada existente.
- **No bloquea el request HTTP.** El cliente recibe respuesta rápida; el trabajo derivado pasa en background.
- **Consistencia transaccional.** Los listeners solo corren si el cambio original se commiteó. Sin race conditions.
- **Testeable.** Cada listener se puede testear aislado, mockeando solo su propio service.

### Negativas

- **Eventualmente consistente.** El cliente recibe 200 OK antes de que los listeners terminen. Si pregunta inmediatamente "¿ya me llegaron mis QueuePoints?", podría ver "no" durante unos milisegundos.
- **Errores silenciosos posibles.** Si un listener falla por una excepción no manejada, el request original ya respondió OK. El operador se entera por logs, no por el cliente.
- **Debugging más difícil.** El flujo "cambio de pedido → notificación" no es lineal en el código; hay que saber que existe el listener para entender qué pasa.

### Riesgos

- **Riesgo de listener no idempotente.** Si Spring reintentea procesamiento del evento (raro pero posible), un listener no idempotente duplica efectos. Mitigación: idempotencia explícita en cada listener (verificar que no se haya hecho ya el efecto antes de hacerlo).
- **Riesgo de orden no determinístico entre listeners.** Si dos listeners reaccionan al mismo evento, no hay garantía de en qué orden corren. Mitigación: los listeners son independientes entre sí; no debe haber dependencias entre lo que hacen.
- **Riesgo de perder eventos si el proceso cae.** Como los eventos viven en memoria, si el backend se reinicia entre el commit y la ejecución de los listeners, los listeners no corren. Mitigación a futuro: outbox pattern (persistir el evento en la misma transacción y un job lo procesa después). No implementado en el MVP.

## Anexo — Glosario de términos técnicos

**Evento de dominio.** Un objeto que representa "algo que pasó" en el sistema, en términos del dominio. No es un comando ("hacé X"), es un hecho ("X pasó"). Se publica una vez y puede ser escuchado por cero o muchos receptores.

Ejemplo concreto en QueueLess: `PedidoEstadoCambiadoEvent(pedidoId=42, estadoAnterior=PENDIENTE_PAGO, estadoNuevo=PAGADO_ESPERANDO_COMERCIO)`. Es un hecho: "el pedido 42 pasó de pendiente de pago a esperando al comercio".

**`ApplicationEventPublisher`.** Bean de Spring que permite publicar eventos. Es la infraestructura nativa, no requiere instalar nada extra. Cualquier componente que quiera publicar eventos lo inyecta y llama `publishEvent(evento)`.

**`@EventListener`.** Anotación de Spring que marca un método como receptor de eventos de un tipo específico (inferido del parámetro). Spring registra automáticamente todos los `@EventListener` y los invoca cuando se publica un evento del tipo correspondiente.

**`@TransactionalEventListener`.** Variante de `@EventListener` que se integra con el manejo de transacciones de Spring. Permite especificar en qué fase de la transacción se ejecuta el listener: `BEFORE_COMMIT`, `AFTER_COMMIT` (default), `AFTER_ROLLBACK`, `AFTER_COMPLETION`. El más común es `AFTER_COMMIT`, que garantiza que el listener solo corre si la transacción original se commiteó exitosamente.

**`@Async`.** Anotación de Spring que hace que un método se ejecute en otro thread, distinto del que lo llama. Requiere `@EnableAsync` en una clase de configuración y un `TaskExecutor` configurado. En QueueLess usamos `@Async("queuelessTaskExecutor")` apuntando al executor configurado en `AsyncConfig`.

**`ThreadPoolTaskExecutor`.** Implementación de `TaskExecutor` que mantiene un pool de threads. En lugar de crear un thread nuevo por cada tarea (costoso), reutiliza threads del pool. Configurable: tamaño core, máximo, cola de espera. El nuestro está en `AsyncConfig`.

**Consistencia eventual.** Propiedad de un sistema distribuido donde, después de un cambio, no todas las vistas del estado están sincronizadas inmediatamente, pero **eventualmente** llegan a estarlo. Lo opuesto a consistencia fuerte (todo sincronizado instantáneamente).

Ejemplo concreto: cuando el comercio marca un pedido como ENTREGADO, el cliente recibe 200 OK del API. La push notification llega al cliente unos milisegundos después. Los puntos del repartidor se registran unos milisegundos después. Durante esa ventana de pocos ms, el sistema está "eventualmente consistente": la verdad final todavía no llegó a todas partes.

**Outbox pattern.** Patrón para garantizar que los eventos se procesen incluso si el proceso del backend se cae. Consiste en persistir el evento en una tabla "outbox" dentro de la misma transacción que el cambio de negocio. Un job separado lee la outbox y dispara los efectos. Si el backend se reinicia, el job retoma. Lo mencionamos como mitigación futura pero no lo implementamos al MVP.

**Idempotencia (en el contexto de listeners).** Propiedad de que un listener, al recibir el mismo evento más de una vez, produzca el mismo resultado que si lo recibiera una sola vez. Importante en sistemas con reintentos. En QueuePoints, idempotencia significa: si el `EntregaCompletadaListener` procesa dos veces el mismo evento, NO duplica el movimiento (porque verifica que no exista ya).

## Referencias

- `backend/src/main/java/pe/edu/utec/queueless/pedido/event/PedidoEstadoCambiadoEvent.java` — el evento.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/service/PedidoService.java` — donde se publica.
- `backend/src/main/java/pe/edu/utec/queueless/notification/listener/PedidoNotificationListener.java` — listener de notificaciones.
- `backend/src/main/java/pe/edu/utec/queueless/pago/listener/PagoListener.java` — listener de reembolsos.
- `backend/src/main/java/pe/edu/utec/queueless/queuepoints/listener/EntregaCompletadaListener.java` — listener de QueuePoints.
- `backend/src/main/java/pe/edu/utec/queueless/config/AsyncConfig.java` — configuración del `ThreadPoolTaskExecutor`.
- ADR-0008 — Ledger pattern para QueuePoints (idempotencia detallada).
