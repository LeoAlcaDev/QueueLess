# QueueLess

> Tu almuerzo, sin cola, sin estrés.

Plataforma móvil y web que elimina las colas de almuerzo en UTEC: los estudiantes pre-ordenan
comida en cualquier punto de venta del campus, la recogen con un código, y pueden coordinar
entregas entre compañeros ganando **QueuePoints**.

Proyecto del curso **CS2031 — Desarrollo Basado en Plataformas**, ciclo 2026-1, UTEC.

**Equipo (2, autorizado por excepción):** Leonardo Alca ([@LeoAlcaDev](https://github.com/LeoAlcaDev))
· Enrique Zheng ([@EnriqueZheng](https://github.com/EnriqueZheng)).

## Tabla de contenidos

- [Introducción](#introducción)
- [Identificación del problema](#identificación-del-problema)
- [Descripción de la solución](#descripción-de-la-solución)
- [Modelo de entidades](#modelo-de-entidades)
- [Arquitectura](#arquitectura)
- [Testing y manejo de errores](#testing-y-manejo-de-errores)
- [Medidas de seguridad](#medidas-de-seguridad)
- [Eventos y asincronía](#eventos-y-asincronía)
- [GitHub y management](#github-y-management)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Endpoints documentados](#endpoints-documentados)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Conclusión](#conclusión)
- [Apéndices](#apéndices)

## Introducción

En UTEC, la hora de almuerzo se superpone con el cambio de clases: cientos de estudiantes
caen sobre los mismos locales en la misma media hora. El resultado es una cola que se come el
tiempo de descanso y, del lado del comercio, ventas que se pierden porque la gente no alcanza
a esperar. QueueLess ataca eso con tres objetivos: **eliminar la cola física** mediante
pre-pedidos con tiempo de espera estimado, **dar al comercio un panel** para gestionar su cola
de pedidos, y **coordinar entregas entre compañeros** —un estudiante libre lleva el pedido de
otro— recompensadas con QueuePoints. El detalle del dominio está en la propuesta original
([`docs/propuesta/QueueLess_Propuesta_.pdf`](docs/propuesta/)).

## Identificación del problema

El problema concreto tiene tres caras. **Para el estudiante:** pierde parte de su descanso en
la cola y no tiene visibilidad de cuánto va a esperar. **Para el comercio:** en hora punta no
da abasto, atiende desordenado y pierde ventas de clientes que se van. **Para el campus:** no
hay forma de repartir la demanda en el tiempo. QueueLess convierte la espera en un pre-pedido
con tiempo estimado, ordena la cola del comercio en una lista de estados, y abre un canal de
delivery interno gratuito entre estudiantes. El pago se resuelve antes de llegar al local,
sacando esa fricción del momento de mayor congestión. Y como la entrega entre compañeros es
gratuita, los **QueuePoints** son el incentivo que la vuelve sostenible: el repartidor
ocasional gana puntos por cada entrega completada y luego los canjea como descuento en sus
propios pedidos, sin que el sistema tenga que cobrar comisión.

## Descripción de la solución

QueueLess es un backend Spring Boot que sirve a tres roles —`cliente`, `comercio`,
`repartidor`— que conviven en un mismo usuario multi-rol. El flujo central: el cliente arma su
pedido, paga por la pasarela, el local lo prepara, y se entrega por recojo (PICKUP) o por
delivery interno (DELIVERY). Funcionalidades principales (el detalle vive en los ADRs citados):

- **Autenticación multi-rol JWT** con access (15 min) + refresh (30 días) y claims `uid` y
  `roles`. Ref: [ADR-0007](docs/decisiones/ADR-0007-multi-rol-y-composicion.md),
  [ADR-0020](docs/decisiones/ADR-0020-refresh-tokens-y-claims-jwt.md),
  [ADR-0022](docs/decisiones/ADR-0022-versionado-api-v1-y-autorizacion-por-metodo.md).
- **Catálogo público** de locales y productos, con disponibilidad por horarios y ventanas.
- **Flujo PICKUP** completo (cliente → comercio → cliente) sobre una máquina de estados
  explícita: el `Pedido` recorre 11 estados (`PENDIENTE_PAGO → PAGADO_… → ACEPTADO →
  EN_PREPARACION → LISTO_PARA_RECOGER → ENTREGADO`) con un mapa de transiciones válidas; una
  transición ilegal lanza `BusinessRuleException` (422), no un estado corrupto.
- **Flujo DELIVERY** con matching automático de repartidor y QueuePoints. Ref:
  [ADR-0014](docs/decisiones/ADR-0014-flujo-delivery-matching-y-opciones-del-cliente.md),
  [ADR-0008](docs/decisiones/ADR-0008-ledger-pattern-queuepoints.md).
- **Pago** con pasarela externa (MercadoPago, mockeable). Ref:
  [ADR-0013](docs/decisiones/ADR-0013-integracion-con-pasarela-de-pagos.md).
- **Tiempos de espera** en dos fases (manual + predictivo). Ref:
  [ADR-0015](docs/decisiones/ADR-0015-modelo-de-tiempos-de-espera.md).
- **Notificaciones**: push (FCM) como canal principal + correo transaccional complementario.
  Ref: [ADR-0016](docs/decisiones/ADR-0016-notificaciones-push-firebase.md),
  [ADR-0021](docs/decisiones/ADR-0021-email-complementario-al-push.md).
- **Reseñas** con verificación de pedido entregado, y **storage** de fotos en S3 con fallback
  local ([ADR-0017](docs/decisiones/ADR-0017-almacenamiento-de-archivos.md)).

**Tecnologías:** Java 21, Spring Boot 3.3, PostgreSQL 16 + Flyway, JWT (jjwt) + BCrypt,
MercadoPago / AWS S3 / Firebase Admin / JavaMail, JUnit 5 + AssertJ + Mockito + TestContainers,
Docker, GitHub Actions, ECS Fargate + RDS + ALB.

## Modelo de entidades

El dominio son **12 entidades**. El diagrama Entidad-Relación completo, con tipos, FKs, UKs y
las referencias polimórficas, está en [`docs/diagramas/entidades.md`](docs/diagramas/entidades.md).

| Entidad | Para qué |
|---|---|
| `Usuario` + `PerfilCliente`/`Comercio`/`Repartidor` | Identidad y los 3 perfiles opcionales (multi-rol) |
| `PuntoDeVenta`, `Producto` | Locales del campus y su menú |
| `Pedido`, `ItemPedido` | El pedido y sus líneas, con máquina de estados |
| `Pago` | Integración con la pasarela (1:1 con `Pedido`) |
| `SolicitudDelivery` | Solo para pedidos DELIVERY: matching del repartidor |
| `Resena` | Reseña del local o del repartidor tras la entrega |
| `MovimientoQueuePoints` | Ledger de puntos (no hay campo saldo) |

Decisiones clave: perfiles separados con `@MapsId` (multi-rol genuino, ADR-0007), referencias
polimórficas blandas en `Resena` y `MovimientoQueuePoints`, soft delete con flag `activo`, y
QueuePoints como ledger ([ADR-0008](docs/decisiones/ADR-0008-ledger-pattern-queuepoints.md)).

## Arquitectura

El backend es feature-first: cada concepto del dominio (`pedido`, `pago`, `usuario`,
`delivery`…) es un paquete con sus controllers, services, entidades y repositorios
([ADR-0001](docs/decisiones/ADR-0001-estructura-feature-first.md)). El diagrama de capas, el
bus de eventos y el despliegue están en
[`docs/diagramas/arquitectura.md`](docs/diagramas/arquitectura.md). En una línea: una request
pasa por la cadena de seguridad → controller `/api/v1` → service → repositorio JPA → Postgres,
y los efectos derivados salen por eventos hacia listeners asíncronos.

## Testing y manejo de errores

Probamos en varios niveles: **unit** con Mockito + AssertJ (`*Test.java`, sin Docker),
**integración** con TestContainers contra un Postgres real (`*IT.java`), `@DataJpaTest` para
repositorios y MockMvc para el contrato HTTP. La nomenclatura es BDD: `shouldXxxWhenYyy`. La
estrategia completa está en [ADR-0005](docs/decisiones/ADR-0005-estrategia-de-testing.md).

El manejo de errores es centralizado: un `@RestControllerAdvice` global mapea una jerarquía de
excepciones de dominio a códigos HTTP (400 validación, 401 credenciales, 403 sin permiso, 404
no encontrado, 409 conflicto/duplicado, 422 regla de negocio, 500 inesperado). La prevención de
IDOR responde **404, no 403**, para no revelar la existencia de recursos ajenos. Detalle en
[ADR-0019](docs/decisiones/ADR-0019-taxonomia-de-excepciones-y-codigos-http.md).

## Medidas de seguridad

- **Spring Security stateless** con JWT; cada request se autentica solo con el token.
- **Access + refresh tokens** con rotación soft y claims `uid`/`roles`/`type`
  ([ADR-0020](docs/decisiones/ADR-0020-refresh-tokens-y-claims-jwt.md)).
- **Autorización en dos capas** (defense-in-depth): reglas por URL en `SecurityConfig` **y**
  `@PreAuthorize` en los controllers, bajo `/api/v1`
  ([ADR-0022](docs/decisiones/ADR-0022-versionado-api-v1-y-autorizacion-por-metodo.md)).
- **BCrypt** para passwords; **prevención de IDOR** verificada en los services (404 ante
  acceso cruzado).
- **Webhooks** de pago validados por firma HMAC; **secret de JWT** validado al arrancar en prod
  ([ADR-0018](docs/decisiones/ADR-0018-hardening-perfil-produccion.md)); CORS configurado.

> Nota conocida: una request **sin token** a un endpoint protegido responde **403** (no 401):
> la cadena de seguridad la corta antes del dispatcher. Es comportamiento esperado.

## Eventos y asincronía

Los módulos se comunican por **eventos de dominio** (`ApplicationEventPublisher` +
`@TransactionalEventListener` en `AFTER_COMMIT` + `@Async("queuelessTaskExecutor")`), sin
acoplarse ([ADR-0009](docs/decisiones/ADR-0009-eventos-de-dominio.md)). Los pedidos no conocen
FCM ni SMTP; las notificaciones no conocen MercadoPago; los puntos no conocen el flujo de
pedidos. Cuando un `Pedido` cambia de estado se publica `PedidoEstadoCambiadoEvent`, y cada
listener filtra lo que le toca: push al cliente, matching de repartidor, ganancia de
QueuePoints, recibo por correo, reembolso. El alta de usuario publica `UsuarioRegistradoEvent`,
que dispara el correo de bienvenida. Todo corre en un `ThreadPoolTaskExecutor` (4 core, 16 máx)
para que el hilo HTTP responda al instante. La garantía `AFTER_COMMIT` asegura que nunca se
notifica un cambio que la transacción terminó revirtiendo, y cada canal es best-effort: si FCM
o SMTP fallan, el flujo del negocio sigue.

## GitHub y management

Trabajamos con **GitHub Flow**: `main` siempre desplegable, todo lo demás en ramas cortas con
prefijo (`feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`) y **Conventional Commits**
en español. Cada issue lleva sus criterios de aceptación. La **CI** (GitHub Actions) corre
`./mvnw verify` con TestContainers en cada PR, y un workflow `Power (start/stop demo)` enciende
y apaga el deployment de AWS bajo demanda. Detalle en
[ADR-0006](docs/decisiones/ADR-0006-github-flow-y-ci.md).

## Variables de entorno

En dev casi todo tiene default seguro (las integraciones externas vacías se autodeshabilitan).
La lista exhaustiva, con sus defaults, está en [`DEVELOPMENT.md`](DEVELOPMENT.md). Las
principales: `JWT_SECRET`, `JWT_ACCESS_EXPIRATION_MS`, `JWT_REFRESH_EXPIRATION_MS`,
`POSTGRES_HOST_PORT`, `PAGO_GATEWAY`, `MERCADOPAGO_ACCESS_TOKEN`, `STORAGE_IMPL`,
`AWS_REGION`/`AWS_S3_BUCKET`, `FIREBASE_ENABLED`/`FIREBASE_CREDENTIALS_JSON`, y el bloque de
correo `MAIL_HOST`/`MAIL_PORT`/`MAIL_USERNAME`/`MAIL_PASSWORD`/`MAIL_FROM`/`MAIL_FROM_NAME`. En
producción se suman `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`, inyectadas desde Secrets Manager.

## Instalación y ejecución local

```bash
git clone https://github.com/CS2031-DBP/proyecto-1-queueless.git
cd proyecto-1-queueless
docker compose up -d                 # Postgres en :5467
cd backend && ./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev"
```

- API: `http://localhost:8090` · Swagger: `http://localhost:8090/swagger-ui.html`
- Postman: importá `postman_collection.json` + `QueueLess.dev.postman_environment.json`.

La guía completa (perfiles, tests, setup de Docker en Windows, troubleshooting) está en
[`DEVELOPMENT.md`](DEVELOPMENT.md).

## Endpoints documentados

El contrato vive como código: **Swagger UI** en `/swagger-ui.html` lista todos los endpoints
con sus esquemas y permite probarlos ([ADR-0004](docs/decisiones/ADR-0004-swagger-openapi.md)).
Para validación end-to-end, la **colección Postman** en la raíz recorre los 8 flujos completos
(auth, catálogo, PICKUP, reseña, DELIVERY, QueuePoints); ver
[`docs/postman/README.md`](docs/postman/README.md).

## Decisiones de diseño

Cada decisión de arquitectura está registrada como un **ADR** (Architecture Decision Record) en
[`docs/decisiones/`](docs/decisiones/), en tono semiformal y con su contexto, alternativas y
consecuencias. Algunas representativas:

| ADR | Decisión |
|---|---|
| [0001](docs/decisiones/ADR-0001-estructura-feature-first.md) | Estructura feature-first |
| [0002](docs/decisiones/ADR-0002-flyway-y-ddl-auto-validate.md) | Flyway + `ddl-auto: validate` |
| [0007](docs/decisiones/ADR-0007-multi-rol-y-composicion.md) | Multi-rol y composición de perfiles |
| [0008](docs/decisiones/ADR-0008-ledger-pattern-queuepoints.md) | Ledger pattern para QueuePoints |
| [0009](docs/decisiones/ADR-0009-eventos-de-dominio.md) | Eventos de dominio sincrónicos |
| [0013](docs/decisiones/ADR-0013-integracion-con-pasarela-de-pagos.md) | Pasarela de pagos abstraída |
| [0019](docs/decisiones/ADR-0019-taxonomia-de-excepciones-y-codigos-http.md) | Taxonomía de errores y HTTP |
| [0020](docs/decisiones/ADR-0020-refresh-tokens-y-claims-jwt.md) | Refresh tokens y claims |
| [0021](docs/decisiones/ADR-0021-email-complementario-al-push.md) | Email complementario al push |
| [0022](docs/decisiones/ADR-0022-versionado-api-v1-y-autorizacion-por-metodo.md) | Versionado `/api/v1` + `@PreAuthorize` |

## Conclusión

QueueLess resuelve un problema real del campus con un backend que no se quedó en CRUDs: máquina
de estados explícita para el pedido, eventos de dominio para desacoplar módulos, dos canales de
notificación complementarios, un ledger auditable para los puntos y un modelo de seguridad en
capas. Lo que más nos costó —y más aprendimos— fue afinar TestContainers en Windows, razonar
las decisiones de seguridad (refresh tokens, IDOR como 404) y diseñar la asincronía sin
introducir un broker. Como trabajo futuro queda la app móvil productiva, el modelo predictivo
de tiempos entrenado con datos reales, y la integración con medios de pago del campus.

## Apéndices

**Licencia.** Proyecto académico; uso restringido a la evaluación del curso CS2031.

**Referencias.**

- Repositorio (classroom): https://github.com/CS2031-DBP/proyecto-1-queueless
- Repositorio público (mirror de respaldo): https://github.com/LeoAlcaDev/QueueLess
- **Deployment AWS:** http://queueless-prod-alb-1673624815.us-east-1.elb.amazonaws.com/
  > Está **apagado por defecto** para no gastar créditos. Para activarlo: pestaña **Actions**
  > → workflow **`Power (start/stop demo)`** → `start`, esperar ~3 min a que el ECS Fargate
  > quede `running`, y verificar con
  > `curl http://queueless-prod-alb-1673624815.us-east-1.elb.amazonaws.com/actuator/health`
  > (200). La colección Postman corre verde contra esa URL cambiando solo `baseUrl`. Al
  > terminar, ejecutar el workflow con `stop`.
- Propuesta original: [`docs/propuesta/QueueLess_Propuesta_.pdf`](docs/propuesta/)
- Decisiones técnicas: [`docs/decisiones/`](docs/decisiones/)
- Diagramas: [entidades](docs/diagramas/entidades.md) · [arquitectura](docs/diagramas/arquitectura.md)
- Guía de desarrollo: [`DEVELOPMENT.md`](DEVELOPMENT.md)

**Equipo.** Leonardo Alca — [@LeoAlcaDev](https://github.com/LeoAlcaDev) · Enrique Zheng —
[@EnriqueZheng](https://github.com/EnriqueZheng).
