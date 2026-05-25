# ADR-0013 — Integración con pasarela de pagos: gateways, webhooks y reembolsos

## Contexto

QueueLess es una app donde los estudiantes pagan los pedidos antes de que el comercio empiece a prepararlos. Esto significa que el flujo de pago no es opcional: si el pago no se procesa correctamente, el pedido no avanza. Y como la app está pensada para Lima (Perú), necesitábamos una pasarela que los usuarios reconozcan y que tenga soporte local.

Cuando arrancamos la Fase 4 (Pagos y reembolsos), la base ya estaba puesta de fases anteriores:

- La tabla `pago` existe desde la migración V1, con su modelo de estados (`PENDIENTE`, `CONFIRMADO`, `FALLIDO`, `REEMBOLSADO`).
- La entidad `Pago` está mapeada con `referencia_externa` para el id de la pasarela.
- En el módulo `pago/` están las clases armadas (controllers, service, gateway) pero los métodos están vacíos, con un comentario `TODO Semana 2` que avisa que la lógica viene más tarde.
- El listener `PagoListener` existe pero solo deja un mensaje en el log, no dispara reembolsos.

Esta fase tenía que cerrar todo eso: integrar de verdad con una pasarela, manejar webhooks, activar reembolsos automáticos, y dejar un camino claro para cambiar de pasarela si en el futuro hace falta.

Varias decisiones se acumularon durante la implementación. Las documentamos acá porque algunas son sutiles (la rotación del campo `referencia_externa`), otras son políticas de negocio (qué estados gatillan reembolso), y otras son de seguridad (validación de firma del webhook). En conjunto, definen cómo funciona el bounded context de pagos.

## Decisión

### Una interfaz `PaymentGateway` con dos implementaciones intercambiables

Toda la integración con la pasarela vive detrás de una interfaz Spring:

```java
public interface PaymentGateway {
    IniciarCobroResult iniciarCobro(Pago pago);
    void reembolsar(Pago pago);
    String getMetodoPago();
}
```

Implementaciones:

- **`MockPaymentGateway`**: para dev y tests. Devuelve referencias del estilo `mock-{UUID}` y una URL local de checkout (`/api/pago/webhook/mock?referencia=mock-...`). No toca red.
- **`MercadoPagoGateway`**: para producción. Usa el SDK oficial de MercadoPago, llama a la API real.

Ambas tienen `@ConditionalOnProperty` sobre la propiedad `queueless.pago.gateway`. El mock se carga si el valor de la propiedad es `mock` o si no hay valor configurado (esto último funciona como segunda red de seguridad si alguien olvida poner la variable de entorno). El MercadoPago se carga solo si el valor es exactamente `mercadopago`. En el archivo `application.yml` el valor por defecto es `mock`. En producción la variable de entorno `PAGO_GATEWAY` la cambia a `mercadopago`.

El método `getMetodoPago()` devuelve el identificador que se persiste en `Pago.metodo`. Mock devuelve `"MOCK"`, MercadoPago devuelve `"MERCADOPAGO"`. Así evitamos tener los nombres fijos como constantes en el service y dejamos el camino abierto para agregar una implementación nueva (por ejemplo, `CulqiGateway`) sin tocar nada más.

### El `referencia_externa` rota su significado durante el ciclo de vida del pago

Esta es la decisión técnica más sutil del módulo. MercadoPago tiene **dos identificadores distintos** en el flujo:

1. **`preference_id`**: lo devuelve la API cuando se crea la "preferencia de pago" (el intento de cobro). Es el id que aparece en la URL del checkout que se le muestra al cliente.
2. **`payment_id`**: lo asigna MercadoPago cuando el cliente paga realmente. Llega a nuestro backend vía webhook.

Para emitir un reembolso, MercadoPago necesita el **`payment_id`**, no el `preference_id`.

En nuestro modelo hay un solo campo `referencia_externa` en la tabla `pago`. La decisión fue **rotar el contenido del campo** según el momento del ciclo de vida:

- **Tras `iniciarCobro`**: contiene el `preference_id`. Sirve para resolver el pago si la pasarela lo consulta antes del webhook.
- **Tras la confirmación por webhook**: se reemplaza por el `payment_id` real. A partir de ahí, el campo apunta al id que MercadoPago necesita para reembolsos.

La regla operativa que protege esto: **`reembolsar` solo se llama sobre pagos en estado `CONFIRMADO`**, lo que garantiza que la referencia externa ya rotó al `payment_id`.

La alternativa que descartamos era agregar un campo separado (`payment_id_externo`) para tener ambos identificadores históricos. La descartamos porque solo se usa el último, no aporta valor mantener el `preference_id` después del webhook, y un campo más en la tabla por algo que no aporta funcionalidad agrega complejidad sin razón.

### Webhook de MercadoPago: validación HMAC obligatoria en producción

Los webhooks de MercadoPago llegan a un endpoint público (`POST /api/pago/webhook/mercadopago`). Sin validación, cualquiera podría mandar peticiones falsas confirmando pagos que nunca ocurrieron. MercadoPago resuelve esto firmando cada webhook con HMAC-SHA256 usando un secret compartido.

El validador (`MercadoPagoSignatureValidator`) recibe tres datos del webhook: la cabecera `x-signature` (que contiene `ts=TIMESTAMP,v1=HASH`), el header `x-request-id`, y el `data.id` del payload. Calcula el HMAC sobre el template `id:{dataId};request-id:{requestId};ts:{ts};` con el secret y lo compara contra el `v1` que vino en la cabecera, usando comparación en tiempo constante (para evitar ataques de timing).

Decidimos dos protecciones adicionales:

1. **`@ConditionalOnProperty`** en `MercadoPagoSignatureValidator`: el bean solo se carga si el gateway activo es MercadoPago. En dev con mock, este validador ni existe.

2. **Bloqueo en arranque si el secret está vacío en perfil de producción**. Esto se hace en `@PostConstruct`:
   ```java
   if (secret está vacío && el perfil activo contiene "prod") {
       throw new IllegalStateException("MERCADOPAGO_WEBHOOK_SECRET vacío en prod ...");
   }
   ```
   Sin esto, un deploy en producción con el secret no configurado dejaría la app aceptando webhooks falsos. Mejor que falle al arrancar con mensaje claro que un agujero silencioso.

   En dev con secret vacío, la validación se relaja con un warning visible en el log. Sirve para correr el smoke check sin tener un secret real.

### Política de reembolso: cuatro estados gatillan reembolso, no dos

`EstadoPedido.GATILLAN_REEMBOLSO` lista los estados desde los que cancelar un pedido dispara el reembolso automático. La versión original (pre-Fase 4) tenía dos estados:

```java
GATILLAN_REEMBOLSO = EnumSet.of(
    PAGADO_BUSCANDO_REPARTIDOR,
    PAGADO_ESPERANDO_COMERCIO
);
```

La regla era "si el comercio ya aceptó, no hay reembolso". La idea era proteger al comercio de costos hundidos (ingredientes ya usados, repartidor ya despachado).

En Fase 4 decidimos ampliarla a cuatro estados:

```java
GATILLAN_REEMBOLSO = EnumSet.of(
    PAGADO_BUSCANDO_REPARTIDOR,
    PAGADO_ESPERANDO_COMERCIO,
    ACEPTADO,
    EN_PREPARACION
);
```

La regla nueva es **"si el servicio no se prestó, hay reembolso completo"**. Los argumentos a favor:

- En el campus UTEC, los pedidos son chicos (5–30 soles). El comercio prefiere reembolsar y mantener la relación con el cliente antes que quedarse con el dinero por algo que no entregó.
- Si el comercio cancela desde `ACEPTADO` o `EN_PREPARACION`, suele ser porque no puede cumplir (se acabó algo, no llegó un ingrediente, etc.). No es justo que el cliente pague por eso.
- Cuando el cliente cancela desde estos estados (algo que no se permite hoy según `CANCELABLES_POR_CLIENTE`, pero podría permitirse), el principio es el mismo: si no recibió el pedido, recupera su dinero.

Los argumentos en contra que evaluamos: en algunos casos el comercio sí incurre en costo (por ejemplo, un sandwich ya armado que no se puede vender a otro). Para esos casos, la fricción está en otra parte (el comercio aprende a no aceptar pedidos que no puede preparar). Y siempre podemos ajustar el set más adelante si los datos muestran que abusan del reembolso.

Esta decisión queda documentada en JavaDoc en `EstadoPedido.GATILLAN_REEMBOLSO` y en este ADR. Si en el futuro se quiere restringir, hay que: editar el `EnumSet`, ajustar los tests del listener, y comunicar el cambio a los comercios.

### `PagoService` orquesta la transición del pedido tras confirmar

Cuando llega la confirmación del pago (vía webhook real o vía endpoint mock), el `PagoService.confirmarInterno` hace dos cosas en la misma transacción:

1. Marca el pago como `CONFIRMADO` y guarda el `confirmadoAt`.
2. Llama a `pedidoService.cambiarEstado(pedidoId, siguiente)` para que el pedido transicione al estado que corresponde:
   - Si el pedido es `DELIVERY` → `PAGADO_BUSCANDO_REPARTIDOR`.
   - Si el pedido es `PICKUP` → `PAGADO_ESPERANDO_COMERCIO`.

La decisión clave acá es que **la transición del pedido la dispara `PagoService`, no el listener**. El listener reacciona a la transición ya hecha (para gatillar reembolsos en cancelaciones), pero el "después del pago" lo decide el módulo de pagos.

`PedidoService.cambiarEstado` se encarga de validar la transición, persistir el nuevo estado y publicar el `PedidoEstadoCambiadoEvent`. Esto cierra el ciclo: el evento se publica al final de la transacción, y los listeners reaccionan después del commit.

### Listener de reembolso asíncrono, después del commit

`PagoListener.onCambioEstadoPedido` está marcado con dos anotaciones que hay que entender juntas:

```java
@Async("queuelessTaskExecutor")
@TransactionalEventListener
public void onCambioEstadoPedido(PedidoEstadoCambiadoEvent event) { ... }
```

- **`@TransactionalEventListener`**: el método solo se ejecuta cuando la transacción que publicó el evento se confirma con éxito en la base de datos. Si esa transacción se cae a la mitad y se revierte, el listener no corre, así que no emitimos reembolsos por cancelaciones que no llegaron a quedar guardadas.
- **`@Async("queuelessTaskExecutor")`**: el método corre fuera del hilo principal de la petición HTTP, en un pool de hilos separado definido en `AsyncConfig.queuelessTaskExecutor`. El cliente que canceló el pedido recibe respuesta HTTP inmediata; el reembolso ocurre por detrás unos segundos después.

**Consecuencias de esta combinación**:

1. Si la llamada a MercadoPago para emitir el reembolso falla, el pedido **sigue cancelado** (no se revierte la cancelación). El `ReembolsoService` deja un mensaje de error en el log y el pago queda en estado `CONFIRMADO` con el campo `reembolsado_at` en `null`. Recuperarse de ese caso es manual (revisar el log, reintentar a mano).
2. El smoke check tiene que esperar a que el listener termine para verificar que el pago quedó como `REEMBOLSADO`. En la práctica, una pausa corta de 1-2 segundos o consultar el estado cada 500ms hasta que cambie alcanza.
3. Como el listener corre en otro hilo, la respuesta HTTP del endpoint que canceló el pedido no se queda esperando al reembolso. El cliente ve "Pedido cancelado" enseguida; el dinero vuelve por su cuenta.

El compromiso es: respuesta rápida al usuario + reembolso eventual. Si en algún momento hace falta esperar al reembolso para responderle al usuario (caso raro), se cambia a `@EventListener` sin la parte de `@Async`.

### Endpoint auxiliar `POST /api/pago/webhook/mock` para simular confirmación en dev

En producción, MercadoPago llama a `/api/pago/webhook/mercadopago` con el payload firmado. En dev con `MockPaymentGateway` no hay servicio externo que llame, entonces necesitamos una forma manual de simular la confirmación.

`MockWebhookController` expone `POST /api/pago/webhook/mock?referencia={ref}` con `@ConditionalOnProperty(name = "queueless.pago.gateway", havingValue = "mock", matchIfMissing = true)`. Solo se registra cuando el gateway activo es mock; en prod no existe.

El flujo dev queda:

1. Cliente: `POST /api/cliente/pagos/iniciar` → recibe `referencia` y `urlCheckout`.
2. Tester (vía curl o Postman): `POST /api/pago/webhook/mock?referencia={ref}` → simula que MercadoPago confirmó.
3. Sistema: `PagoService.confirmar` transiciona el pedido, publica el evento.

Esto desbloquea el smoke check completo sin necesidad de credenciales reales de MercadoPago ni de exponer nuestro `localhost` a internet con servicios como ngrok.

### Carga eager del pedido y el cliente al consultar un pago

El método `PagoRepository.findByIdWithPedido` usa `JOIN FETCH` para traer el `Pago`, su `Pedido` y el `cliente` del pedido en una sola query:

```java
@Query("SELECT p FROM Pago p JOIN FETCH p.pedido ped JOIN FETCH ped.cliente WHERE p.id = :id")
Optional<Pago> findByIdWithPedido(Long id);
```

Esto resuelve un problema sutil: el `PagoController.consultar` verifica si el pago es del cliente autenticado accediendo a `pago.getPedido().getCliente().getId()`. Sin el `JOIN FETCH`, esas dos relaciones (`@ManyToOne` perezosas por defecto) explotarían con `LazyInitializationException` al accederlas después de que la transacción del service ya cerró.

La alternativa era abrir otra transacción en el controller o pasar toda la verificación al service. El `JOIN FETCH` mantiene la responsabilidad de la consulta en el repositorio (donde corresponde, según el patrón del proyecto) y es más eficiente: una sola consulta a la base trae todo, en vez de tres consultas separadas.

### IDOR responde 404 (convención del proyecto)

Esta no es decisión nueva de Fase 4, pero la implementación inicial del módulo respondía 422, así que la corrección queda documentada acá para que no se repita.

Cuando un cliente intenta acceder a un pago que no le pertenece (por ejemplo, `GET /api/cliente/pagos/123` y el pago 123 es de otro cliente), la respuesta es **404 Not Found**, no 422 Unprocessable Entity ni 403 Forbidden.

El proyecto estableció esta convención en Fase 3 con el método `PedidoService.buscarPedidoDelCliente`. La regla es: **no revelar la existencia del recurso al usuario que no tiene acceso**. Devolver 403 ("existe pero no podés verlo") es una fuga de información sutil: un atacante podría iterar IDs y mapear el rango de recursos existentes en el sistema. 404 mantiene la ambigüedad.

En el código, esto se traduce en lanzar `ResourceNotFoundException` (que el `GlobalExceptionHandler` mapea a 404) en vez de `BusinessRuleException` (que mapea a 422).

### Idempotencia explícita en `confirmar`

Los webhooks no son confiables: la pasarela puede reentregar el mismo evento varias veces (si nuestro endpoint tardó en responder, si el servidor reinició a la mitad, etc.). El método `PagoService.confirmar` tiene que ser idempotente.

La implementación chequea el estado del pago al inicio:

```java
if (pago.getEstado() == EstadoPago.CONFIRMADO) {
    log.info("Pago {} ya estaba CONFIRMADO, ignorando reentrega del webhook", pago.getId());
    return pago;
}
if (pago.getEstado() != EstadoPago.PENDIENTE) {
    throw new BusinessRuleException("No se puede confirmar un pago en estado " + pago.getEstado());
}
```

Si el pago ya está confirmado, no se hace nada y se devuelve igual (HTTP 200 al webhook). Si está en otro estado raro (`FALLIDO`, `REEMBOLSADO`), se lanza error porque es una señal de bug.

### `PagoGatewayConfig` para fallar en arranque si la propiedad es inválida

Si alguien pone `PAGO_GATEWAY=culqui` (con un error de tipeo) o `PAGO_GATEWAY=stripe` (un valor que no soportamos), ninguna implementación de gateway coincide con la propiedad y por lo tanto no se carga ninguna. Spring tira un error críptico que dice "no bean of type PaymentGateway", sin más pistas para el que está deployando.

Para que el error sea accionable, agregamos un bean fallback:

```java
@Bean
@ConditionalOnMissingBean(PaymentGateway.class)
PaymentGateway gatewayNoDisponible(
        @Value("${queueless.pago.gateway:}") String valorConfigurado) {
    throw new IllegalStateException(
        "Gateway de pago desconocido: '" + valorConfigurado + "'. " +
        "Valores válidos: mock, mercadopago. Revisá la variable PAGO_GATEWAY.");
}
```

`@ConditionalOnMissingBean` hace que este bean solo se cree si no hay otro `PaymentGateway`. Si nadie lo cargó, este se instancia, su constructor falla, y Spring tira el error en el arranque del contexto con el mensaje accionable.

### Flujo completo del ciclo de vida de un pago

Para tener la vista de pájaro, así fluye un pago desde que el cliente lo inicia hasta que (eventualmente) se reembolsa:

```
1. Cliente: POST /api/cliente/pagos/iniciar { pedidoId: 42 }
   ↓
2. PagoController.iniciar
   ↓
3. PagoService.iniciar
   - valida que el pedido es del cliente, está en PENDIENTE_PAGO, sin pago previo
   - crea Pago en estado PENDIENTE
   - llama paymentGateway.iniciarCobro(pago) → preference_id, urlCheckout
   - guarda preference_id en pago.referenciaExterna
   - devuelve IniciarPagoResponse con urlCheckout
   ↓
4. Cliente: abre urlCheckout, paga
   ↓
5a. (prod) MercadoPago: POST /api/pago/webhook/mercadopago con firma
    → WebhookController valida firma, consulta Payment por id, llama confirmarPorId(pagoId, paymentId)
5b. (dev)  Tester: POST /api/pago/webhook/mock?referencia={preference_id}
    → MockWebhookController llama confirmar(referencia)
   ↓
6. PagoService.confirmar / confirmarPorId
   - chequea idempotencia (si ya está CONFIRMADO, return)
   - marca Pago como CONFIRMADO, rota referenciaExterna al payment_id
   - llama pedidoService.cambiarEstado(pedidoId, PAGADO_*)
   ↓
7. PedidoService.cambiarEstado
   - persiste el nuevo estado
   - publica PedidoEstadoCambiadoEvent (al final de la transacción)
   ↓
8. (commit de la transacción)
   ↓
9. PagoListener.onCambioEstadoPedido (ASYNC, en thread aparte)
   - si fue cancelación desde un estado en GATILLAN_REEMBOLSO
   - llama reembolsoService.emitirReembolso(pedidoId)
   ↓
10. ReembolsoService.emitirReembolso
    - busca el Pago confirmado del pedido
    - chequea idempotencia (si ya REEMBOLSADO, return)
    - llama paymentGateway.reembolsar(pago)
    - marca Pago como REEMBOLSADO, registra reembolsadoAt
```

Para entender por qué cada paso vive donde vive, mirar las decisiones individuales arriba. El punto clave es que **el bounded context de pagos coordina con el de pedidos a través del cambio de estado y los eventos, nunca tocando entidades de Pedido directamente** (más allá del id).

## Por qué MercadoPago y no Stripe o Culqi

Evaluamos tres pasarelas:

- **MercadoPago**: dominante en Perú, integrada con Yape y otros métodos locales, con SDK oficial en Java mantenido y sandbox documentado. Comisiones competitivas para el mercado local.
- **Stripe**: la opción global. Tiene la mejor documentación y API más limpia, pero la integración con métodos de pago locales (Yape, PagoEfectivo) es más débil, y el público de QueueLess son estudiantes universitarios peruanos que en su mayoría no tienen tarjeta internacional.
- **Culqi**: alternativa local, fuerte en Perú. SDK de Java menos mantenido. La compró Credicorp, y aunque sigue activa, las decisiones de roadmap están en manos del banco.

Elegimos MercadoPago por mejor encaje con el público objetivo (estudiantes con Yape) y por madurez del SDK Java.

La interfaz `PaymentGateway` está pensada para que cambiar de pasarela en el futuro sea barato: implementar `iniciarCobro`, `reembolsar` y `getMetodoPago` en una clase nueva, anotarla con `@ConditionalOnProperty`, y listo.

## Alternativas consideradas

### Alternativa 1 — Cliente HTTP genérico en vez de SDK oficial

Hacer las llamadas a MercadoPago con `RestTemplate` o `WebClient`, sin depender del SDK.

Descartada porque:

- El SDK ya resuelve la serialización de los objetos, los headers, los errores tipados (`MPApiException`).
- La pasarela tiene endpoints específicos para `Preference`, `Payment`, `PaymentRefund` que el SDK envuelve con clases dedicadas.
- Hacer todo a mano es 200-300 líneas más de código que nadie mantiene mejor que el SDK oficial.

### Alternativa 2 — Tabla `webhook_recibido` para deduplicar al nivel de base

Crear una tabla que registre cada webhook recibido (con su `payment_id` o `request_id` como UNIQUE) y rechazar duplicados a nivel base.

Descartada para esta fase porque:

- La idempotencia a nivel de service (chequear estado del pago) cubre el caso real.
- Agregar tabla y migración para un caso que ya se maneja en código es over-engineering.
- Si en el futuro aparece evidencia de webhooks problemáticos que el chequeo de estado no cubre, se puede agregar.

### Alternativa 3 — Reembolso manual desde un endpoint de admin

En vez de listener automático, exponer un endpoint admin tipo `POST /api/admin/pagos/{id}/reembolsar` que un humano dispare.

Descartada porque:

- La política del proyecto es UX simple: si cancelaste un pedido pagado, la plata vuelve sola.
- Tener un humano en el loop atrasa el reembolso entre minutos y horas, lo que genera reclamos.
- Si en algún momento hace falta intervención manual (caso borde), se puede agregar un endpoint admin aparte, sin matar el flujo automático.

### Alternativa 4 — `GATILLAN_REEMBOLSO` solo con los dos estados originales

Mantener la política original: si el comercio aceptó, no hay reembolso automático.

Descartada por las razones explicadas arriba (campus UTEC, pedidos chicos, mejor relación con el cliente). Pero la decisión queda documentada con sus argumentos para que, si el comportamiento real muestra problemas (clientes que abusan, comercios que pierden plata), se pueda revisar con datos.

### Alternativa 5 — IDOR responde 403 Forbidden

Cuando el cliente intenta acceder a un pago ajeno, devolver 403 ("existe pero no podés"), no 404.

Descartada por consistencia con el resto del proyecto (Fase 3 estableció 404) y por la razón técnica de no revelar existencia del recurso. Esta decisión NO es de Fase 4; ya estaba tomada en el proyecto. Lo documentamos porque la implementación inicial del módulo de pagos respondía 422, y hubo que corregirla a 404 para mantener coherencia.

## Consecuencias

### Positivas

- **Pago real en producción funciona** con la pasarela más usada en Perú. Es el feature crítico que faltaba para que QueueLess sea utilizable de verdad.
- **Tests sin tocar red**. El `MockPaymentGateway` hace que la suite de pruebas completa corra rápido y sin credenciales reales. Los nuevos miembros del equipo no necesitan configurar credenciales de MercadoPago para arrancar el proyecto en local.
- **Cambio de pasarela barato**. Si en el futuro hay que migrar a Culqi o Stripe, es una clase nueva y un valor de propiedad distinto. No se toca el service ni los controllers ni la entidad `Pago`.
- **Webhooks idempotentes y seguros**. Reentregas no causan doble cobro, firmas falsas no engañan al sistema.
- **Reembolso automático y trazable**. Las cancelaciones disparan el reembolso solas, queda registro en el log de cada paso, y los estados del `Pago` en la base reflejan la realidad.

### Negativas

- **Dependencia del SDK de MercadoPago**. Si MercadoPago cambia su API o el SDK queda discontinuado, hay que adaptar. Mitigación: el impacto del cambio queda contenido en una sola clase (`MercadoPagoGateway`); el resto del módulo no se entera.
- **El campo `referencia_externa` cambia de significado**. Es una decisión que ahorra un campo pero requiere disciplina (no llamar a `reembolsar` sobre pagos que no estén confirmados). Mitigación: la regla está documentada en JavaDoc de la entidad y el código la respeta por construcción.
- **Reembolso amplio puede costarle al comercio**. La política de cuatro estados es generosa con el cliente. Mitigación: queda documentada y es reversible si los datos muestran abuso.

### Riesgos

- **Webhook de MercadoPago cambia de formato sin avisar**. Improbable, pero pasa. Mitigación: tests del validador con payload realista, y los logs del backend marcan claramente cuándo un webhook se rechaza por firma inválida (línea `WARN` con `Webhook MP con firma inválida; rechazado`). En el futuro, si el volumen lo amerita, esos logs se pueden enganchar a un sistema de alertas, pero por ahora la revisión es manual.
- **Secret de webhook se filtra por error en un repo público**. Mitigación: el secret va en variable de entorno, nunca en el código ni en el `.env.example` (que solo lista la variable, no su valor). Para producción se rota desde el panel de MercadoPago si pasa.
- **`@PostConstruct` del validador asume que `getActiveProfiles()` no devuelve null**. Spring siempre llena el array (vacío si no hay perfiles activos, no null), pero si alguna versión futura cambia ese comportamiento, podría romper el arranque. Mitigación: cubierto por el test del bean.

## Anexo — Glosario de términos técnicos

**Pasarela de pagos**. Servicio externo que procesa transacciones con tarjetas, billeteras digitales, etc. Mantiene los datos sensibles del medio de pago (números de tarjeta, CVV) en su propia infraestructura, certificada por los estándares de seguridad del rubro, para que nuestra app no tenga que. En Perú las más usadas son MercadoPago, Culqi y Niubiz.

**Webhook**. Mecanismo por el que un servicio externo (en este caso MercadoPago) le avisa a nuestro backend que pasó algo (por ejemplo, que un pago se confirmó). Llega como una petición HTTP POST a una URL nuestra previamente registrada. Es la forma de evitar tener que andar preguntando "¿ya pagó? ¿ya pagó?" cada cinco segundos: el servicio externo nos avisa apenas tenga la noticia. La diferencia con un endpoint normal de nuestra API es que el webhook viene de fuera, sin sesión de usuario, así que necesita un mecanismo distinto para verificar que la petición es legítima.

**`preference_id` vs `payment_id` (MercadoPago)**. La pasarela tiene dos conceptos: la `preference` es la "intención de cobro" (lo que se le muestra al cliente como botón de pagar), tiene su id. El `payment` es la transacción real, una vez que el cliente paga, tiene otro id. Para emitir un reembolso se necesita el `payment_id`.

**HMAC-SHA256**. Algoritmo para firmar mensajes con una clave compartida (el "secret"). La pasarela y nosotros tenemos el mismo secret; ella firma cada webhook con ese secret usando este algoritmo, y nosotros calculamos la firma con la misma fórmula y comparamos. Si coinciden, el webhook viene realmente de la pasarela y no de un atacante.

**Comparación en tiempo constante**. Forma especial de comparar dos cadenas de caracteres que tarda lo mismo sin importar si son iguales o en qué posición empiezan a diferir. La comparación normal de strings termina apenas encuentra una diferencia, y un atacante puede medir esos tiempos para deducir qué bytes acertó. La comparación en tiempo constante elimina esa pista midiendo siempre lo mismo.

**Idempotencia**. Propiedad de una operación que da el mismo resultado si se ejecuta una o múltiples veces con los mismos datos de entrada. Confirmar un pago dos veces tiene que dejar el sistema en el mismo estado que confirmarlo una vez (sin cobrar dos veces ni romper nada).

**IDOR (Insecure Direct Object Reference)**. Vulnerabilidad de seguridad clásica donde un usuario accede a recursos de otros usuarios cambiando un id en la URL. Ejemplo: `GET /api/cliente/pagos/123` cuando el pago 123 es de otra persona. La defensa es validar siempre que el recurso pertenece al usuario autenticado antes de devolverlo.

**`@ConditionalOnProperty`**. Anotación de Spring Boot que carga una clase (un "bean", en jerga de Spring) solo si una propiedad de configuración tiene cierto valor. Nos permite tener varias implementaciones de una misma interfaz y elegir cuál usar según el ambiente (mock en dev, MercadoPago en producción).

**`@ConditionalOnMissingBean`**. Variante de la anotación anterior: carga la clase solo si no hay otra del mismo tipo ya cargada. La usamos para crear una red de seguridad: "si nadie cargó un `PaymentGateway`, cargá este que dispara error claro al arrancar".

**`@PostConstruct`**. Anotación que marca un método para que Spring lo ejecute apenas termine de armar la clase y antes de que esté lista para usarse. La usamos para validar la configuración al arrancar (si falta un secret crítico, fallar ahora, no a los cinco minutos cuando llegue el primer webhook).

**`@Async`**. Anotación de Spring que hace que un método se ejecute en un hilo separado del que lo llamó. El llamador no espera el resultado. La usamos para que el reembolso no bloquee la respuesta HTTP al cliente que canceló el pedido.

**`@TransactionalEventListener`**. Variante de `@EventListener` que solo dispara el método cuando la transacción que publicó el evento se confirma con éxito en la base de datos. Si la transacción se cae a la mitad y se revierte, el evento se descarta y el listener no corre. Garantiza que no reaccionamos a "cambios que no llegaron a ocurrir".

**`JOIN FETCH`**. Cláusula del lenguaje de consultas de Hibernate que carga una relación junto con la consulta principal, en una sola consulta a la base. Sin esto, cada vez que el código accede a una relación se dispara una consulta nueva (el famoso problema de "N+1 consultas"), y si lo hace fuera de transacción explota con `LazyInitializationException`.

**`LazyInitializationException`**. Error típico de Hibernate cuando se intenta acceder a una relación marcada como "perezosa" (que no se carga junto con la entidad principal) después de que la transacción donde se cargó la entidad ya cerró. Se evita cargando los datos por adelantado con `JOIN FETCH`, o manteniendo la transacción abierta hasta que se usan.

**Sandbox (pasarela)**. Ambiente de pruebas que ofrecen las pasarelas, con tarjetas falsas que simulan distintos resultados (aprobada, rechazada, fondos insuficientes). MercadoPago tiene su sandbox con un access token diferente al de producción; el código es el mismo, solo cambia el token.

**Refund (reembolso)**. Devolver el dinero al cliente. En MercadoPago se hace contra el `payment_id`, devuelve el monto total a la misma tarjeta o medio que usó el cliente. Cambia el estado del pago a `REEMBOLSADO` de nuestro lado.

**Bounded context (DDD)**. Concepto de Diseño Guiado por el Dominio (Domain-Driven Design). Es una zona del sistema con sus propias entidades, reglas y vocabulario, que se comunica con otras zonas a través de interfaces bien definidas y no toca sus internos. El módulo `pago/` es un bounded context: no conoce los detalles de cómo el módulo `pedido/` modela sus estados o sus items; solo recibe el id del pedido cuando necesita cobrar y publica/escucha eventos para coordinarse.

## Referencias

- ADR-0001 — Estructura feature-first.
- ADR-0003 — Modelo de 12 entidades (`Pago` como entidad y bounded context).
- ADR-0009 — Eventos de dominio (cómo el `PagoListener` se engancha a las cancelaciones).
- ADR-0010 — Postgres puerto y env (de dónde sale `MERCADOPAGO_WEBHOOK_SECRET`).
- `backend/src/main/java/pe/edu/utec/queueless/pago/gateway/PaymentGateway.java` — interfaz.
- `backend/src/main/java/pe/edu/utec/queueless/pago/gateway/MercadoPagoGateway.java` — implementación productiva.
- `backend/src/main/java/pe/edu/utec/queueless/pago/gateway/MockPaymentGateway.java` — implementación de dev.
- `backend/src/main/java/pe/edu/utec/queueless/pago/gateway/MercadoPagoSignatureValidator.java` — validación HMAC.
- `backend/src/main/java/pe/edu/utec/queueless/pago/gateway/PagoGatewayConfig.java` — fallback de configuración inválida.
- `backend/src/main/java/pe/edu/utec/queueless/pago/service/PagoService.java` — orquestación.
- `backend/src/main/java/pe/edu/utec/queueless/pago/service/ReembolsoService.java` — reembolsos.
- `backend/src/main/java/pe/edu/utec/queueless/pago/listener/PagoListener.java` — listener de cancelaciones.
- `backend/src/main/java/pe/edu/utec/queueless/pago/controller/WebhookController.java` — endpoint público del webhook MP (solo se carga con gateway mercadopago).
- `backend/src/main/java/pe/edu/utec/queueless/pago/controller/MockWebhookController.java` — endpoint auxiliar para simular confirmación en dev.
- `backend/src/main/java/pe/edu/utec/queueless/pago/repository/PagoRepository.java` — consultas con `JOIN FETCH` para evitar accesos perezosos fuera de transacción.
- `backend/src/main/java/pe/edu/utec/queueless/pago/entity/Pago.java` — entidad con la rotación documentada.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/entity/EstadoPedido.java` — `GATILLAN_REEMBOLSO`.
- `backend/src/main/java/pe/edu/utec/queueless/config/AsyncConfig.java` — define el `queuelessTaskExecutor` que usa el listener.
