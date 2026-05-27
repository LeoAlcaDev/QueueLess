# Guía de desarrollo — QueueLess

Todo lo que necesitás para correr, probar y desplegar QueueLess en tu máquina. El
[`README.md`](README.md) es el informe del proyecto; este documento es la guía técnica de
onboarding. El backend tiene además su propia nota operativa en
[`backend/README.md`](backend/README.md).

## Requisitos

- **Java 21** (Temurin recomendado).
- **Maven 3.9+** (o el wrapper `./mvnw` incluido).
- **Docker Desktop** (Postgres local y TestContainers).
- **Node 20+ y pnpm** — solo si vas a tocar `web/` o `mobile/`.

## Clonar y arrancar

```bash
git clone https://github.com/CS2031-DBP/proyecto-1-queueless.git
cd proyecto-1-queueless

# 1. Postgres local (expuesto en el host en :5467)
docker compose up -d

# 2. Backend en perfil dev (carga datos seed)
cd backend
./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev"
```

- API: `http://localhost:8090`
- Swagger UI: `http://localhost:8090/swagger-ui.html`

## Perfiles

| Perfil | Para qué | Base de datos |
|---|---|---|
| **dev** (default) | Desarrollo local con seed | Postgres de docker-compose (`localhost:5467`) |
| **test** | Tests de integración | Postgres efímero de TestContainers |
| **prod** | Despliegue AWS | RDS PostgreSQL, secretos por env var, logging WARN+ |

## Variables de entorno

En **dev** casi todo tiene default seguro: copiá `.env.example` a `.env` y arrancá. Las
integraciones externas vacías se autodeshabilitan (correo, Firebase, S3) o usan un mock (pago).

| Variable | Para qué | Default dev |
|---|---|---|
| `POSTGRES_HOST_PORT` | Puerto del host para Postgres (no 5432 para no chocar con pgAdmin) | `5467` |
| `JWT_SECRET` | Llave HMAC para firmar los JWT (mín. 32 bytes) | valor de ejemplo |
| `JWT_ACCESS_EXPIRATION_MS` | TTL del access token | `900000` (15 min) |
| `JWT_REFRESH_EXPIRATION_MS` | TTL del refresh token | `2592000000` (30 días) |
| `PAGO_GATEWAY` | Pasarela activa: `mock` o `mercadopago` | `mock` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token sandbox de MercadoPago | vacío |
| `MERCADOPAGO_WEBHOOK_SECRET` | Firma del webhook (en dev se relaja con warning) | vacío |
| `STORAGE_IMPL` | Almacenamiento: `local` o `s3` | `local` |
| `AWS_REGION` / `AWS_S3_BUCKET` | S3 para fotos de productos | vacío |
| `FIREBASE_ENABLED` | Activa el push real | `false` |
| `FIREBASE_CREDENTIALS_JSON` | Service account de Firebase en base64 | vacío |
| `MAIL_HOST` | Host SMTP — **vacío deshabilita el correo** (modo `[EMAIL DEV]`) | vacío |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Credenciales SMTP (App Password de Gmail o token de SES) | vacío |
| `MAIL_FROM` / `MAIL_FROM_NAME` | Remitente de los correos | `no-reply@queueless.local` / `QueueLess` |

En **producción** se agregan `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (RDS); todo viene de AWS
Secrets Manager, nunca del código.

## Correr los tests

```bash
cd backend
./mvnw test       # solo unit tests (*Test.java) — rápido, sin Docker
./mvnw verify     # unit + integración (*IT.java) — requiere Docker
```

Convención: `*Test.java` = unit (Mockito/AssertJ); `*IT.java` = integración con TestContainers
(Postgres real). Detalle en [ADR-0005](docs/decisiones/ADR-0005-estrategia-de-testing.md).

### Setup de Docker Desktop en Windows (para TestContainers)

`docker-java` (lo que usa TestContainers) tiene un problema conocido con el named pipe de
Docker Desktop reciente sobre WSL2: el CLI funciona pero el handshake HTTP de Java falla. La
solución es exponer el daemon por TCP local, **una vez por máquina**:

1. Docker Desktop → **Settings** → **General**.
2. Activá **"Expose daemon on tcp://localhost:2375 without TLS"** → **Apply & restart**.

`backend/pom.xml` ya tiene un perfil Maven auto-activado en Windows que inyecta
`DOCKER_HOST=tcp://localhost:2375` solo en los plugins de test. En Linux/macOS no hace falta
nada. Detalle y nota de seguridad en [`backend/README.md`](backend/README.md). Por este límite,
los `*IT` se validan sobre todo en la **CI del classroom** (Linux), donde corren siempre.

## Correr la colección Postman

Importá `postman_collection.json` y `QueueLess.dev.postman_environment.json` (raíz del repo),
elegí el environment **QueueLess dev** y corré la colección con el Collection Runner. Recorre
los 8 flujos end-to-end. Guía completa en [`docs/postman/README.md`](docs/postman/README.md).

## Encender el deployment de AWS

El deployment está **apagado por defecto** para no gastar créditos. Para encenderlo:

1. Pestaña **Actions** del repo → workflow **`Power (start/stop demo)`**.
2. Ejecutalo con `start` y esperá ~3 min a que el ECS Fargate quede `running`.
3. Verificá: `curl http://queueless-prod-alb-1673624815.us-east-1.elb.amazonaws.com/actuator/health` → 200.
4. Al terminar, corré el workflow con `stop`.

## Troubleshooting típico

| Síntoma | Causa / solución |
|---|---|
| El backend no levanta, error de conexión a la base | Postgres no está arriba: `docker compose up -d`. Verificá el puerto `5467`. |
| `Port 8090 already in use` | Otro proceso ocupa el puerto. Matalo o cambiá `server.port`. |
| Arranque falla en prod por `JWT_SECRET inseguro` | El secret es el de ejemplo o tiene menos de 32 bytes. Configurá uno propio. |
| Los `*IT` fallan en local en Windows | Falta el toggle TCP 2375 de Docker Desktop (ver arriba). |
| No llegan correos en dev | Es lo esperado: sin `MAIL_HOST` el correo queda en modo `[EMAIL DEV]` (solo log). |
