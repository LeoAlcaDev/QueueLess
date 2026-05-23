# QueueLess Backend

Backend del proyecto QueueLess. Spring Boot 3 + Java 21 + PostgreSQL.

## Arrancar en local

```bash
# Desde la raíz del repo
docker compose up -d                      # levanta Postgres en :5467

# Desde backend/
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

API disponible en `http://localhost:8090`.
Swagger UI en `http://localhost:8090/swagger-ui.html`.

## Perfiles

- **dev** — Postgres local (docker-compose), datos seed cargados, logging detallado.
- **test** — TestContainers levantan Postgres efímero.
- **prod** — RDS, secretos por variables de entorno, logging WARN+.

## Variables de entorno requeridas en producción

| Variable | Descripción                                   |
|---|-----------------------------------------------|
| `DB_URL` | jdbc:postgresql://host:5467/queueless         |
| `DB_USERNAME` | Usuario de la base de datos                   |
| `DB_PASSWORD` | Password de la base de datos                  |
| `JWT_SECRET` | Llave HMAC para firmar tokens (mín. 32 bytes) |
| `JWT_EXPIRATION_MS` | Tiempo de vida del token (ms)                 |
| `FIREBASE_CREDENTIALS_JSON` | Service account JSON en base64                |
| `AWS_REGION` | Región del bucket S3                          |
| `AWS_S3_BUCKET` | Nombre del bucket para imágenes               |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de la pasarela (sandbox o prod)         |

## Tests

```bash
./mvnw test            # solo unit tests
./mvnw verify          # unit + integration (TestContainers)
```

## Tests con TestContainers

Los tests de integración (los que heredan de `AbstractIntegrationTest`,
incluido `QueuelessApplicationIT`) levantan un Postgres efímero con
TestContainers. Requiere **Docker Desktop corriendo**.

### Setup en Windows (una vez por máquina)

`docker-java` — la librería que TestContainers usa por debajo — tiene un
problema conocido conectándose al named pipe de Docker Desktop reciente
(backend WSL2): el `docker` CLI funciona, pero el handshake HTTP-sobre-pipe
de Java falla con un `BadRequestException` con campos vacíos. Para evitarlo,
exponemos el daemon vía TCP local:

1. Abre **Docker Desktop**.
2. Click en el ícono de engranaje (arriba a la derecha) → **Settings**.
3. Pestaña **General** (menú izquierdo).
4. Activa **"Expose daemon on tcp://localhost:2375 without TLS"**.
5. Click **Apply & restart**.

Verifica que quedó expuesto:

```powershell
Test-NetConnection -ComputerName localhost -Port 2375 -InformationLevel Quiet
# True

Invoke-RestMethod http://localhost:2375/_ping
# OK
```

`backend/pom.xml` ya define un perfil Maven `windows-docker-desktop`
auto-activado en Windows que inyecta `DOCKER_HOST=tcp://localhost:2375` solo
en los plugins de test (surefire/failsafe). No necesitas variables de
entorno globales ni tocar `~/.testcontainers.properties`.

### Setup en Linux / WSL2 nativo / macOS

Nada. El perfil de Windows no se activa y TestContainers usa
`/var/run/docker.sock` por defecto.

### Seguridad

El endpoint `tcp://localhost:2375` solo escucha en la interfaz loopback
(no es accesible desde la red), pero **cualquier proceso local puede
controlar Docker sin autenticación**. Es aceptable en una máquina personal
de desarrollo, **no lo actives en máquinas compartidas o de un servidor**.
Si te preocupa el modelo de amenaza (p. ej. una pestaña web maliciosa
emitiendo requests al puerto), apaga el toggle cuando no estés corriendo
tests.

### Correr los tests

```powershell
./mvnw test       # solo unit tests, no requiere Docker
./mvnw verify     # unit + integration; requiere el setup de arriba
```

`mvn test` corre solo los unit tests y pasa sin Docker (entre ellos los 5
de `PedidoStateMachineTest`). `mvn verify` agrega los tests de integración,
entre ellos `QueuelessApplicationIT.contextLoads()`, que arranca el contexto
completo con TestContainers; por eso necesita Docker corriendo o se ejecuta
en CI Linux.

## Estructura

Ver [`docs/decisiones/ADR-0001-estructura-feature-first.md`](../docs/decisiones/ADR-0001-estructura-feature-first.md)
para la racional de la organización por feature.

```
src/main/java/pe/edu/utec/queueless/
├── config/             config global (Security, Async, ModelMapper, etc.)
├── shared/             clases transversales (excepciones, BaseEntity, storage)
├── auth/               JWT, login, registro
├── usuario/            Usuario, Rol, perfiles
├── puntoventa/         PuntoDeVenta, Producto
├── pedido/             Pedido, ItemPedido + máquina de estados + reseñas
├── pago/               Pago, integración pasarela, webhook
├── delivery/           SolicitudDelivery, matcher de repartidores
├── queuepoints/        MovimientoQueuePoints
├── waittime/           Diferenciador técnico — predicción 2 fases
├── notification/       FCM
└── scheduling/         Jobs @Scheduled (expiración, retraining)
```
