# QueueLess

> Tu almuerzo, sin cola, sin estrés.

Plataforma móvil y web que elimina las colas de almuerzo en UTEC permitiendo pre-ordenar comida en cualquier punto de venta del campus, recogerla con un QR, y coordinar entregas entre compañeros que se ayudan ganando QueuePoints.

Proyecto académico del curso **CS2031 — Desarrollo Basado en Plataformas**, ciclo 2026-1, UTEC.

## Equipo

- **Leonardo Alca** ([@LeoAlcaDev](https://github.com/LeoAlcaDev))
- **Enrique Zheng** ([@EnriqueZheng](https://github.com/EnriqueZheng))

Equipo de 2, autorizado por excepción de la directiva del curso.

## Tabla de contenidos

- [Estructura del repositorio](#estructura-del-repositorio)
- [¿Qué es esto y cómo está organizado?](#qué-es-esto-y-cómo-está-organizado)
- [Descripción de la Solución](#descripción-de-la-solución)
- [Decisiones de diseño (ADRs)](#decisiones-de-diseño-adrs)
- [Eventos y Asincronía](#eventos-y-asincronía)
- [Cómo arrancar en local](#cómo-arrancar-en-local)
- [Cronograma de entrega](#cronograma-de-entrega)
- [Convenciones del proyecto](#convenciones-del-proyecto)
- [Licencia](#licencia)

## Estructura del repositorio

```
QueueLess/
├── backend/              Spring Boot 3 + Java 21 + PostgreSQL
├── web/                  React + TypeScript + Tailwind (panel del comercio)
├── mobile/               React Native + Expo (app cliente / repartidor / comercio)
├── docs/
│   ├── decisiones/       ADRs (Architecture Decision Records)
│   ├── propuesta/        Documento de propuesta entregado en P0
│   ├── diagramas/        Diagramas de arquitectura y flujos
│   └── api/              Snapshots del contrato OpenAPI
├── scripts/              Utilidades de desarrollo (seed, dump, etc.)
├── docker-compose.yml    Postgres local para desarrollo
└── .github/workflows/    CI/CD: tests + deploy
```

## ¿Qué es esto y cómo está organizado?

QueueLess es un sistema con tres clientes (web del comercio, app móvil del cliente, app móvil del repartidor) y un backend Spring Boot que sirve a los tres. Todo el código vive en este único repositorio monorepo.

**El backend** es un proyecto Maven con Java 21 y Spring Boot 3.3. Está organizado **feature-first**: cada concepto del dominio (`pedido`, `pago`, `usuario`, `delivery`, etc.) es un paquete top-level con sus propios controllers, services, entidades y repositorios. Dentro de cada feature hay subpaquetes técnicos consistentes (`controller`, `service`, `entity`, `repository`, `dto`). Esa decisión está documentada en el [ADR-0001](docs/decisiones/ADR-0001-estructura-feature-first.md).

**El frontend web** (`web/`) está pensado para el panel del comercio: cola de pedidos, marcar como listo, gestionar productos. **La app móvil** (`mobile/`) sirve a clientes (hacer pedidos) y repartidores (aceptar entregas). Ambas apps se construyen sobre el contrato OpenAPI que el backend genera automáticamente (ver [ADR-0004](docs/decisiones/ADR-0004-swagger-openapi.md)).

**La carpeta `docs/`** contiene la documentación viva del proyecto. La subcarpeta más importante es `docs/decisiones/`, que tiene los ADRs.

## Descripción de la Solución

QueueLess es una plataforma para pre-ordenar comida en los puntos de venta del campus de UTEC. Tres tipos de usuario conviven en el mismo backend (`cliente`, `comercio`, `repartidor`), cada uno con su perfil y sus permisos. El flujo principal es: el cliente arma su pedido en la app, paga por la pasarela, el local lo prepara, y se entrega — sea por recojo en tienda o por delivery interno entre compañeros que ganan **QueuePoints** por ayudar.

Sobre ese flujo, el sistema cubre los siguientes aspectos transversales:

- **Pedidos con máquina de estados.** Cada `Pedido` recorre estados explícitos (`PENDIENTE_PAGO → PAGADO_… → ACEPTADO → EN_PREPARACION → LISTO → ENTREGADO`) con transiciones validadas. Cualquier cambio dispara un evento de dominio que los demás módulos escuchan (ver [ADR-0009](docs/decisiones/ADR-0009-eventos-de-dominio.md)).
- **Pagos.** Integración con MercadoPago en sandbox, con webhook idempotente y posibilidad de reembolso ante cancelación. La pasarela está abstraída detrás de un puerto para poder cambiarla sin tocar el dominio.
- **Delivery.** Si el pedido es DELIVERY, se levanta una `SolicitudDeliveryEvento` que los repartidores disponibles ven por push; cuando alguien la toma, el pedido pasa a `ACEPTADO_POR_REPARTIDOR`. Si nadie la toma en 4 minutos, el cliente puede cambiar a recojo en tienda.
- **QueuePoints como ledger.** Los puntos no se guardan como saldo sino como movimientos (`GANADO`, `CANJEADO`), idempotentes por referencia al evento que los generó.
- **Notificaciones por dos canales complementarios.**
  - **Push (FCM)** es la vía principal. Llega al instante a la app móvil del cliente y del repartidor, y cubre todas las transiciones del pedido (ver [ADR-0016](docs/decisiones/ADR-0016-notificaciones-push-firebase.md)).
  - **Email transaccional** lo suma para dos comunicaciones formales que el usuario espera tener en su buzón: la **confirmación de registro** y el **recibo del pedido entregado** (items, total, fecha). El correo es complementario, no reemplaza al push: se manda asíncrono, es best-effort, y si SMTP no está configurado o falla, el flujo del negocio (registro o entrega) sigue normal (ver [ADR-0021](docs/decisiones/ADR-0021-email-complementario-al-push.md)).
- **Tiempos de espera (diferenciador técnico).** Predicción de espera en dos fases: fórmula manual hasta acumular datos, y modelo entrenable después.
- **Despliegue en AWS.** Backend en ECS Fargate, base en RDS PostgreSQL, secretos en Secrets Manager. Detalle completo en [`infra/README.md`](infra/README.md).

El backend está pensado para que cada uno de estos aspectos pueda evolucionar de forma independiente: los pedidos no conocen FCM ni SMTP, las notificaciones no conocen MercadoPago, los puntos no conocen el flujo de pedidos. Todo se coordina por eventos (próxima sección).

## Decisiones de diseño (ADRs)

### ¿Qué es un ADR?

Un **ADR (Architecture Decision Record)** es un documento corto que registra una decisión de diseño importante que tomamos en el proyecto, junto con su contexto y consecuencias. La idea fue popularizada por [Michael Nygard en 2011](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) y hoy es práctica estándar en la industria.

Un ADR responde tres preguntas:

1. **¿Qué decidimos?** La decisión concreta tomada.
2. **¿Por qué?** El contexto, las alternativas consideradas y las razones por las que esta opción ganó.
3. **¿Qué implica?** Las consecuencias positivas, negativas y los riesgos que asumimos.

La diferencia entre un ADR y comentarios en el código o entradas de wiki es que **un ADR captura la decisión en el momento en que se toma**, con toda la información disponible en ese momento. Si en el futuro alguien lee el código y se pregunta "¿por qué hicieron esto así y no de otra manera?", el ADR responde sin tener que reconstruir el razonamiento original.

### ¿Por qué los tenemos en este proyecto?

Tres razones:

- **Memoria del equipo.** Dentro de 3 meses, ninguno de nosotros se va a acordar de por qué decidimos modelar QueuePoints como ledger en lugar de un campo simple. El ADR-0008 lo explica.
- **Onboarding.** Si en algún momento se suma alguien más al proyecto, leer los ADRs es la forma más rápida de entender la arquitectura.
- **Sustento académico.** Para la defensa del proyecto, podemos explicar cualquier decisión con un documento concreto que la respalda, no solo decir "porque sí".

### Estructura de cada ADR

Todos siguen el mismo formato:

- **Contexto**: la situación y la pregunta que enfrentamos.
- **Decisión**: lo que decidimos concretamente.
- **Defensa / Razones**: por qué esta opción y no otras.
- **Alternativas consideradas**: las opciones que descartamos y por qué.
- **Consecuencias**: positivas, negativas y riesgos.
- **Anexo / Glosario**: términos técnicos explicados con ejemplos concretos del propio proyecto.
- **Referencias**: paths a los archivos del código relacionados.

Todos los ADRs están escritos en **tono semiformal hablado**, en primera persona plural. La idea es que sean legibles de corrido, no como documentos burocráticos.

### Índice de ADRs

| # | Título | Tema |
|---|---|---|
| [0001](docs/decisiones/ADR-0001-estructura-feature-first.md) | Estructura feature-first del backend | Cómo organizamos los paquetes Java |
| [0002](docs/decisiones/ADR-0002-flyway-y-ddl-auto-validate.md) | Migraciones con Flyway y `ddl-auto: validate` | Cómo manejamos el schema de la base |
| [0003](docs/decisiones/ADR-0003-modelo-de-12-entidades.md) | Modelo de 12 entidades del dominio | Por qué tenemos 12 entidades y no menos ni más |
| [0004](docs/decisiones/ADR-0004-swagger-openapi.md) | Swagger UI / OpenAPI como contrato de la API | Cómo documentamos los endpoints |
| [0005](docs/decisiones/ADR-0005-estrategia-de-testing.md) | Estrategia de testing | Unit tests, integration tests, TestContainers |
| [0006](docs/decisiones/ADR-0006-github-flow-y-ci.md) | GitHub Flow y CI con GitHub Actions | Cómo trabajamos en Git y qué se corre en CI |
| [0007](docs/decisiones/ADR-0007-multi-rol-y-composicion.md) | Multi-rol y composición de perfiles | Por qué un usuario puede tener varios roles |
| [0008](docs/decisiones/ADR-0008-ledger-pattern-queuepoints.md) | Ledger pattern para QueuePoints | Por qué no guardamos saldo, guardamos movimientos |
| [0009](docs/decisiones/ADR-0009-eventos-de-dominio.md) | Eventos de dominio con `ApplicationEventPublisher` | Cómo se comunican los módulos sin acoplarse |
| [0010](docs/decisiones/ADR-0010-postgres-puerto-y-env.md) | Postgres en puerto 5467 y configuración con `.env` | Por qué no usamos el puerto 5432 |
| [0016](docs/decisiones/ADR-0016-notificaciones-push-firebase.md) | Notificaciones push con Firebase Cloud Messaging | Canal principal de avisos al cliente y al repartidor |
| [0021](docs/decisiones/ADR-0021-email-complementario-al-push.md) | Email transaccional complementario al push | Por qué bienvenida y recibo van por correo y no reemplazan al push |
| [0022](docs/decisiones/ADR-0022-versionado-api-v1-y-autorizacion-por-metodo.md) | Versionado API v1 y autorización por método | Cómo congelamos el contrato público y dónde van los `@PreAuthorize` |

## Eventos y Asincronía

QueueLess usa **eventos de dominio sincrónicos transaccionales** (`ApplicationEventPublisher` + `@TransactionalEventListener` en fase `AFTER_COMMIT` + `@Async("queuelessTaskExecutor")`) para conectar el módulo que tira el evento con todos los que reaccionan, sin acoplarlos directamente. La racional completa vive en [ADR-0009](docs/decisiones/ADR-0009-eventos-de-dominio.md); acá un resumen práctico de qué se dispara y quién escucha.

### Bus de eventos

Hay dos eventos principales hoy:

| Evento | Quién lo publica | Cuándo |
|---|---|---|
| `PedidoEstadoCambiadoEvent` | `PedidoService.cambiarEstado` (y la creación inicial) | Cualquier transición del pedido. Trae `pedidoId`, `estadoAnterior`, `estadoNuevo` |
| `UsuarioRegistradoEvent` | `AuthService.register` | Al final de un alta exitosa. Trae el `usuarioId` |

### Listeners registrados

Todos los listeners corren en el `queuelessTaskExecutor` (4 threads core, 16 máx, cola 100, ver [`AsyncConfig`](backend/src/main/java/pe/edu/utec/queueless/config/AsyncConfig.java)). Eso garantiza que el thread HTTP responde rápido y los efectos derivados pasan en background.

| Listener | Evento que escucha | Acción | Canal |
|---|---|---|---|
| `PedidoNotificationListener` | `PedidoEstadoCambiadoEvent` | Push al cliente según el estado nuevo (catálogo de mensajes en `MensajesPedidoCatalogo`) | **Push (FCM)** |
| `EntregaCompletadaListener` | `PedidoEstadoCambiadoEvent` (filtra `ENTREGADO` + delivery) | Registra movimiento `GANADO` de QueuePoints al repartidor | Interno |
| `PagoListener` | `PedidoEstadoCambiadoEvent` (filtra cancelaciones desde estado pagado) | Inicia reembolso vía la pasarela | Externo |
| `CrearSolicitudDeliveryListener` | `PedidoEstadoCambiadoEvent` (filtra `PAGADO_BUSCANDO_REPARTIDOR` + delivery) | Crea la solicitud y avisa al pool de repartidores | Interno + Push |
| `PedidoEntregadoEmailListener` | `PedidoEstadoCambiadoEvent` (filtra `ENTREGADO`) | Manda el recibo al buzón del cliente (items, total, fecha) | **Email** |
| `UsuarioRegistradoEmailListener` | `UsuarioRegistradoEvent` | Manda el correo de bienvenida | **Email** |

### Canales de comunicación con el usuario

Sobre el bus, el sistema se comunica con el usuario por dos canales **complementarios**:

- **Push (Firebase Cloud Messaging)** — canal principal, en tiempo real, cubre todas las transiciones del pedido. Es la mejor UX para mobile y el medio que el cliente y el repartidor consumen en el momento. Si FCM no está configurado en producción, el backend corta el arranque (`fail-fast`, ver [ADR-0016](docs/decisiones/ADR-0016-notificaciones-push-firebase.md)).
- **Email transaccional (SMTP)** — canal complementario, asincrónico, best-effort. Solo se usa para las dos comunicaciones formales que el usuario espera tener archivadas en su buzón: **confirmación de registro** y **recibo del pedido entregado** (items, total, fecha). Si SMTP no está configurado (caso default en dev y test), el `EmailService` se autodeshabilita y deja un `INFO` con prefijo `[EMAIL DEV]` en el log. Si SMTP falla por una razón transitoria, queda un `WARN` y el flujo del negocio (registro o entrega del pedido) sigue normal. La racional completa, incluyendo por qué no reemplazamos push por email y por qué no usamos Thymeleaf para los templates, vive en [ADR-0021](docs/decisiones/ADR-0021-email-complementario-al-push.md).

Las dos fachadas (`NotificationService` para push, `EmailService` para correo) resuelven sus adapters con `ObjectProvider`, lo que les permite estar deshabilitadas en dev/test sin que el resto del sistema se entere. El código que dispara el evento es idéntico con o sin notificaciones reales activadas; solo cambia si el aviso sale por el cable o queda en el log.

### Garantías

- **AFTER_COMMIT.** Los listeners corren *después* de que la transacción que tiró el evento se commiteó. Si la transacción falla, los listeners no se ejecutan: nunca mandamos un recibo de un pedido que se rolloeó.
- **Best-effort por canal.** Una falla del canal externo (FCM caído, SMTP rebotando) no rompe el flujo del negocio. Los errores quedan en el log para revisarlos.
- **Sin orden garantizado entre listeners.** Cada listener es independiente; no hay dependencias entre lo que hace `PedidoNotificationListener` y lo que hace `PedidoEntregadoEmailListener`.

## Cómo arrancar en local

### Prerequisitos

- Java 21 (Temurin recomendado)
- Maven 3.9+ (o usar el `./mvnw` incluido)
- Docker + Docker Compose (para Postgres local)
- Node 20+ y pnpm (solo si se va a tocar `web/` o `mobile/`)

### Backend

```bash
# 1. Levantar Postgres
docker compose up -d

# 2. Arrancar backend en perfil dev (carga datos seed)
cd backend
./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev"

# 3. La API queda en http://localhost:8090
# 4. Swagger UI:    http://localhost:8090/swagger-ui.html
```

Más detalles en [`backend/README.md`](backend/README.md), incluyendo el setup de Docker Desktop en Windows para que TestContainers funcione.

### Tests

```bash
cd backend
./mvnw verify     # corre unit + integration tests con TestContainers
```

## Cronograma de entrega

| Semana | Foco |
|---|---|
| Semana 1 (4-10 mayo) | Fundación: auth multi-rol JWT, modelo de datos, CRUDs básicos |
| Semana 2 (11-17 mayo) | Core de pedidos, pagos sandbox, panel comercio, FCM |
| Semana 3 (18-24 mayo) | Delivery, QueuePoints, polish, deploy AWS |

**Entrega del backend (P1):** domingo 25 de mayo de 2026, 17:00.

## Convenciones del proyecto

### Lenguaje

- **Dominio en español:** entidades, servicios y conceptos del negocio en español (`Pedido`, `Usuario`, `Resena`). Refleja el dominio real, sin traducción innecesaria.
- **Internals técnicos en inglés:** sufijos y nombres de framework (`Repository`, `Service`, `Controller`, `Config`). Es la convención de Spring y Java.
- **SQL en snake_case:** nombres de tablas y columnas en `snake_case` (`perfil_cliente`, `nombre_completo`).
- **Java en camelCase:** atributos y métodos en `camelCase` (`nombreCompleto`, `perfilCliente`).

### Commits

Seguimos Conventional Commits. Detalle completo en el [ADR-0006](docs/decisiones/ADR-0006-github-flow-y-ci.md).

```
<tipo>(<ámbito>): <descripción imperativa>

<cuerpo opcional>
```

Tipos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`.

### Ramas

GitHub Flow: solo `main` como rama permanente, todo lo demás son feature branches cortas con prefijo:

- `feat/X` — funcionalidad nueva
- `fix/X` — corrección de bug
- `chore/X` — cambios de infra/config
- `refactor/X` — reorganización sin cambio de comportamiento
- `docs/X` — solo documentación
- `test/X` — solo tests

### Tests

- Unit tests: `*Test.java`, corren con `mvn test`.
- Integration tests: `*IT.java`, corren con `mvn verify` (requieren Docker).

Detalle completo en el [ADR-0005](docs/decisiones/ADR-0005-estrategia-de-testing.md).

## Licencia

Proyecto académico. Uso restringido a evaluación del curso CS2031.
