# ADR-0001 — Estructura feature-first del backend

## Contexto

Cuando uno arranca un proyecto Spring Boot, la forma "tradicional" de organizar las carpetas es por capa técnica:

```
src/main/java/.../queueless/
├── controllers/
│   ├── AuthController.java
│   ├── UsuarioController.java
│   ├── PedidoController.java
│   └── ...
├── services/
│   ├── AuthService.java
│   ├── UsuarioService.java
│   ├── PedidoService.java
│   └── ...
├── repositories/
│   ├── UsuarioRepository.java
│   ├── PedidoRepository.java
│   └── ...
├── entities/
│   ├── Usuario.java
│   ├── Pedido.java
│   └── ...
└── dto/
    └── ...
```

Es la organización que aparece en la mayoría de los tutoriales. Funciona para proyectos chicos. Pero a medida que crece, todo lo relacionado con un feature (por ejemplo, pedidos) queda esparcido en 5 carpetas distintas. Para entender cómo funciona el módulo pedido, hay que abrir `controllers/PedidoController.java`, `services/PedidoService.java`, `repositories/PedidoRepository.java`, `entities/Pedido.java`, `dto/CrearPedidoRequest.java`, etc.

La alternativa es organizar por feature: todo lo relacionado con pedidos vive junto.

Este ADR fija qué estructura usamos.

## Decisión

Adoptamos **estructura feature-first**. Cada feature del dominio es un paquete top-level dentro de `pe.edu.utec.queueless`, y dentro de ese paquete viven sus propios subpaquetes técnicos (controller, service, dto, entity, repository, etc.).

Estructura real del backend:

```
pe.edu.utec.queueless/
├── auth/              JWT, login, register
│   ├── controller/
│   ├── service/
│   ├── dto/
│   └── jwt/
├── usuario/           Usuario y los 3 perfiles
│   ├── entity/
│   ├── repository/
│   ├── service/
│   ├── controller/
│   └── dto/
├── puntoventa/        PuntoDeVenta y Producto
├── pedido/            Pedido, ItemPedido, máquina de estados
│   ├── controller/
│   ├── service/
│   ├── entity/
│   ├── repository/
│   ├── dto/
│   ├── event/
│   └── resena/        Subpaquete: Resena vive con su agregado raíz
├── pago/              Pago + gateway abstracto + impls
│   ├── controller/
│   ├── service/
│   ├── entity/
│   ├── gateway/
│   ├── listener/
│   └── repository/
├── delivery/          SolicitudDelivery, matcher
├── queuepoints/       MovimientoQueuePoints (ledger)
├── waittime/          Estrategia de tiempo de espera
│   ├── strategy/
│   ├── ml/
│   ├── service/
│   └── controller/
├── notification/      Firebase adapter, NotificationService, listeners
│   ├── adapter/
│   ├── dto/
│   ├── listener/
│   └── service/
├── scheduling/        Jobs @Scheduled
├── shared/            BaseEntity, exceptions, DTOs comunes, storage
│   ├── domain/
│   ├── dto/
│   ├── exception/
│   └── storage/
└── config/            Security, Async, CORS, OpenAPI, ModelMapper
```

**Reglas que definen la convención:**

1. Cada feature top-level es un paquete dentro de `queueless/`.
2. Dentro de cada feature, los subpaquetes técnicos son consistentes: `controller`, `service`, `entity`, `repository`, `dto`, etc.
3. Si un agregado tiene una entidad satélite muy ligada (como Resena dentro de Pedido), va como subpaquete del feature padre.
4. `shared/` contiene cosas usadas por varios features (BaseEntity, excepciones globales, DTOs genéricos).
5. `config/` contiene configuración de Spring que aplica al sistema entero.

## Por qué feature-first y no layer-first

**Cohesión alta.** Cuando trabajamos en una funcionalidad, todos los archivos que vamos a tocar están en la misma carpeta. Para implementar "crear pedido" abrimos el paquete `pedido/` y vemos todo: el controller, el service, el repo, los DTOs, los eventos. No hace falta navegar 5 carpetas distintas.

**Acoplamiento bajo entre módulos.** El paquete `pedido/` no tiene por qué saber lo que pasa dentro de `pago/`. La comunicación entre módulos es por interfaces públicas (DTOs, eventos), no por internals. Esto refuerza los bounded contexts del ADR-0003.

**Escalable.** En layer-first, cuando el proyecto crece, las carpetas `services/` o `entities/` se vuelven enormes (50+ archivos). Es difícil navegar. Con feature-first, cada feature mantiene un tamaño razonable.

**Refactor por feature trivial.** Si en algún momento decidimos extraer el módulo de pagos a un microservicio, mover el paquete `pago/` entero es una operación clara. En layer-first, tendríamos que cherry-pickear archivos de 5 carpetas distintas.

**Reconocimiento visual.** Abrir el árbol del proyecto y ver `pedido/`, `pago/`, `delivery/` da una idea inmediata de qué hace el sistema. Layer-first muestra "controllers, services, repos" que no dicen nada del dominio.

## Por qué subpaquetes técnicos dentro de cada feature

Una variante de feature-first es no usar subpaquetes técnicos. Es decir:

```
pedido/
├── PedidoController.java
├── PedidoService.java
├── Pedido.java
├── PedidoRepository.java
└── ...
```

Todo plano. Funciona en módulos chicos. Pero cuando un feature crece, también se hace difícil de navegar. El módulo `pedido/` actual tiene ~15 archivos; si los pusiéramos planos, encontrar el `PedidoService` entre los DTOs sería molesto.

Subpaquetes técnicos dentro de cada feature dan estructura local:

```
pedido/
├── controller/
│   ├── PedidoClienteController.java
│   └── PedidoComercioController.java
├── service/PedidoService.java
├── entity/
│   ├── Pedido.java
│   ├── ItemPedido.java
│   ├── EstadoPedido.java
│   └── TipoEntrega.java
├── dto/...
├── event/PedidoEstadoCambiadoEvent.java
├── repository/...
└── resena/...
```

Hereda la legibilidad de layer-first **dentro** del feature, sin perder la cohesión de feature-first.

## Convenciones de naming

- **Paquete del feature en singular y minúscula:** `pedido`, no `pedidos`, no `Pedido`.
- **Subpaquetes técnicos consistentes:** siempre `controller`, `service`, `entity`, `repository`, `dto`. Nunca `controllers` (plural).
- **Clases en PascalCase:** `PedidoService`, `CrearPedidoRequest`.
- **Naming en español para dominio:** `Pedido`, `Usuario`, `Resena`. NO `Order`, `User`, `Review`.
- **Naming en inglés para internals técnicos:** `Repository`, `Service`, `Filter`, `Config`.

## Alternativas consideradas

### Alternativa 1 — Layer-first puro

Todo organizado por capa técnica, como en los tutoriales clásicos. Descartado por las razones de arriba: poca cohesión, mal escalable, no transmite el dominio.

### Alternativa 2 — Hexagonal estricto (Ports and Adapters)

Separar el dominio puro (sin Spring, sin JPA) de los adapters (web, persistence, mensajería) en módulos físicos. Muy popular en proyectos enterprise serios.

Descartado por overhead. Para un proyecto de 3 semanas con 2 personas, la disciplina de hexagonal es desproporcionada. Sí adoptamos algunas ideas de hexagonal puntualmente (la interface `PaymentGateway` con implementaciones intercambiables), pero no estructuramos todo el proyecto así.

### Alternativa 3 — Vertical slice architecture al extremo

Cada caso de uso (no cada feature, cada caso de uso individual) es una carpeta. "CrearPedido" es una carpeta con su controller, su handler, sus DTOs, su lógica.

Descartado porque para nuestro tamaño es fragmentar demasiado. Un feature como `pedido` tiene una decena de casos de uso relacionados; mantenerlos en una sola carpeta tiene más sentido que dispersarlos en 10 carpetas separadas.

## Consecuencias

### Positivas

- **Onboarding rápido.** Quien entra al proyecto entiende qué hace mirando los top-level packages.
- **Trabajo concentrado.** Al implementar un feature, todos los archivos relevantes están juntos.
- **Bounded contexts respetados.** Cada feature es un módulo aislado que comunica con otros vía eventos y DTOs públicos.
- **Refactor por feature simple.** Mover un módulo a otro repo o servicio es factible sin cherry-picking.

### Negativas

- **Tentación de duplicar.** Cuando un DTO o un util es necesario en dos features, hay que decidir si va en `shared/` o se duplica. Mitigación: regla práctica de "duplicá hasta que pase 3 veces, después extraé a shared".
- **Curva inicial.** Devs acostumbrados a layer-first tardan un poco en adaptarse.

### Riesgos

- **Riesgo de paquetes circulares.** Si `pedido/` importa de `pago/` y `pago/` importa de `pedido/`, hay ciclo y JPA puede romper en runtime. Mitigación: la comunicación entre módulos es vía eventos y DTOs públicos, no imports cruzados de implementaciones internas. ADR-0009 explica cómo.
- **Riesgo de `shared/` que crezca demasiado.** Si todo lo "común" termina en `shared/`, ese paquete se vuelve un cajón de sastre. Mitigación: revisar periódicamente si lo que está en `shared/` realmente lo usan varios features, y si no, mover de vuelta al feature original.

## Anexo — Glosario de términos técnicos

**Feature-first (también package-by-feature).** Forma de organizar el código donde el primer nivel de paquetes refleja los conceptos del dominio (pedido, pago, usuario), y dentro de cada uno viven sus archivos técnicos (controller, service, etc.).

**Layer-first (también package-by-layer).** Forma tradicional donde el primer nivel de paquetes refleja las capas técnicas (controllers, services, repositories, entities). Los archivos de un mismo feature quedan dispersos en varias capas.

Ejemplo concreto comparando ambos enfoques para "agregar un endpoint de pedido":

- Feature-first: se abre `pedido/` y se editan 3 archivos en esa misma carpeta.
- Layer-first: se edita 1 archivo en `controllers/`, 1 en `services/`, 1 en `dto/`. 3 carpetas distintas.

**Bounded context (DDD).** Concepto que cubrimos en ADR-0003. Es una zona del sistema con su propio vocabulario y reglas, comunicada con otras zonas por interfaces bien definidas. En QueueLess, cada feature top-level (`pedido`, `pago`, `delivery`) es un bounded context.

**Cohesión.** Medida de cuánto las partes de un módulo están relacionadas entre sí. Cohesión alta es buena: significa que todo en el módulo trabaja hacia el mismo propósito. Feature-first tiene cohesión más alta que layer-first porque agrupa lo que está conceptualmente cerca.

**Acoplamiento.** Medida de cuánto un módulo depende de los detalles internos de otro. Acoplamiento bajo es bueno: significa que podés cambiar un módulo sin romper a los demás. Feature-first ayuda a bajar el acoplamiento porque desincentiva las dependencias cruzadas entre features.

**Hexagonal architecture (Ports and Adapters).** Arquitectura propuesta por Alistair Cockburn donde el dominio puro vive en el centro, aislado del mundo exterior. Las interacciones con el mundo (web, base de datos, mensajería) son adapters que conectan con ports (interfaces) del dominio. Buena para sistemas muy complejos con muchos canales de entrada/salida. Para QueueLess es overkill.

**Vertical slice architecture.** Variante extrema de feature-first donde cada caso de uso individual es una unidad organizativa. Útil en sistemas con CQRS y muchos handlers independientes. Para nuestro tamaño, demasiado granular.

**Bean (en Spring).** Cualquier clase manejada por el contenedor de Spring. Los marcamos con `@Component`, `@Service`, `@Repository`, `@Controller`, `@RestController`, `@Configuration`. Spring las instancia, gestiona su ciclo de vida e inyecta dependencias. La estructura feature-first no afecta a cómo Spring las encuentra: Spring escanea todo el classpath bajo la package root.

## Referencias

- `backend/src/main/java/pe/edu/utec/queueless/` — el árbol del backend.
- ADR-0003 — Modelo de 12 entidades (cada entidad vive en su feature).
- ADR-0007 — Multi-rol y composición (organización del módulo `usuario/`).
- ADR-0009 — Eventos de dominio (cómo se comunican los features sin acoplarse).
