# QueueLess

> Tu almuerzo, sin cola, sin estrés.

Plataforma móvil y web que elimina las colas de almuerzo en UTEC permitiendo
pre-ordenar comida en cualquier punto de venta del campus, recogerla con un
QR, y coordinar entregas entre compañeros que se ayudan ganando QueuePoints.

Proyecto académico del curso **CS2031 — Desarrollo Basado en Plataformas**,
ciclo 2026-1, UTEC.

---

## Estructura del repositorio

```
queueless/
├── backend/              Spring Boot 3 + Java 21 + PostgreSQL
├── web/                  React + TypeScript + Tailwind (panel del comercio)
├── mobile/               React Native + Expo (app cliente / repartidor / comercio)
├── docs/                 Propuesta, diagramas, ADRs, contrato OpenAPI
├── scripts/              Utilidades de desarrollo (seed, dump, etc.)
├── docker-compose.yml    Postgres local para desarrollo
└── .github/workflows/    CI/CD: tests + deploy
```

## Arrancar en local

### Prerequisitos

- Java 21 (Temurin recomendado)
- Maven 3.9+ (o usar el `./mvnw` incluido)
- Docker + Docker Compose (para Postgres local)
- Node 20+ y pnpm (solo si vas a tocar `web/` o `mobile/`)

### Backend

```bash
# 1. Levantar Postgres
docker compose up -d

# 2. Arrancar backend en perfil dev (carga datos seed)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 3. La API queda en http://localhost:8080
# 4. Swagger UI:    http://localhost:8080/swagger-ui.html
```

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

**Entrega del backend:** domingo 24 de mayo, 11:59 p.m.

## Equipo

- Leonardo Alca
- Enrique Zheng

Equipo de 2, autorizado por excepción de la directiva del curso.

## Licencia

Proyecto académico. Uso restringido a evaluación del curso CS2031.
