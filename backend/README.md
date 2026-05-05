# QueueLess Backend

Backend del proyecto QueueLess. Spring Boot 3 + Java 21 + PostgreSQL.

## Arrancar en local

```bash
# Desde la raíz del repo
docker compose up -d                      # levanta Postgres en :5432

# Desde backend/
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

API disponible en `http://localhost:8080`.
Swagger UI en `http://localhost:8080/swagger-ui.html`.

## Perfiles

- **dev** — Postgres local (docker-compose), datos seed cargados, logging detallado.
- **test** — TestContainers levantan Postgres efímero.
- **prod** — RDS, secretos por variables de entorno, logging WARN+.

## Variables de entorno requeridas en producción

| Variable | Descripción |
|---|---|
| `DB_URL` | jdbc:postgresql://host:5432/queueless |
| `DB_USERNAME` | Usuario de la base de datos |
| `DB_PASSWORD` | Password de la base de datos |
| `JWT_SECRET` | Llave HMAC para firmar tokens (mín. 32 bytes) |
| `JWT_EXPIRATION_MS` | Tiempo de vida del token (ms) |
| `FIREBASE_CREDENTIALS_JSON` | Service account JSON en base64 |
| `AWS_REGION` | Región del bucket S3 |
| `AWS_S3_BUCKET` | Nombre del bucket para imágenes |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de la pasarela (sandbox o prod) |

## Tests

```bash
./mvnw test            # solo unit tests
./mvnw verify          # unit + integration (TestContainers)
```

## Estructura

Ver [`docs/decisiones/ADR-0001-feature-first.md`](../docs/decisiones/ADR-0001-feature-first.md)
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
