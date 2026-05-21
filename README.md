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
- [Decisiones de diseño (ADRs)](#decisiones-de-diseño-adrs)
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
