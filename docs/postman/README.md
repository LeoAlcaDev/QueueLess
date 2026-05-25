# Colección Postman — QueueLess (E2E)

Colección para validar el flujo completo de la API de extremo a extremo.

## Archivos

- `QueueLess.postman_collection.json` — la colección (8 carpetas, 38 requests).
- `QueueLess.dev.postman_environment.json` — entorno de desarrollo (`baseUrl = http://localhost:8090`).

## Requisitos

1. Backend corriendo con perfil **dev** en `http://localhost:8090`
   (`cd backend && ./mvnw spring-boot:run`).
2. Base de datos de desarrollo con el seed cargado
   (`docker compose up -d` y las migraciones, incluido `V99` con los usuarios demo).

La colección usa los usuarios del seed:

| Rol | Email | Password |
|---|---|---|
| Cliente | `diego.martinez@utec.edu.pe` | `password123` |
| Comercio | `comercio.cafe@utec.edu.pe` | `password123` |
| Repartidor | `camila.rojas@utec.edu.pe` | `password123` |

## Cómo correrla

1. Importar los dos archivos en Postman.
2. Seleccionar el entorno **QueueLess - Dev**.
3. Ejecutar las carpetas **en orden** (1 → 8), o usar **Run collection** sobre toda
   la colección.

Cada request guarda en variables de colección lo que necesita el siguiente
(tokens por rol, id del local, del producto, del pedido, del pago y de la
solicitud de delivery), así que no hay que copiar nada a mano. Cada paso valida
el código de estado esperado.

## Qué cubre

1. **Auth** — registro, login de los tres roles, y un login fallido (401).
2. **Usuario y perfil** — datos del usuario autenticado y rechazo de acceso anónimo.
3. **Comercio** — alta de punto de venta y de producto.
4. **Catálogo público** — listado, detalle, productos, tiempo estimado y un 404.
5. **Flujo PICKUP** — crear pedido, pago simulado (dev), y el recorrido del comercio
   hasta `ENTREGADO`.
6. **Reseña** — el cliente reseña el local; lectura pública de reseñas.
7. **Flujo DELIVERY** — pago real (iniciar + webhook simulado) y el flujo del
   repartidor (tomar la solicitud, recoger, entregar).
8. **QueuePoints** — saldo y movimientos del repartidor tras la entrega.

## Para producción

Cambiar `baseUrl` en el entorno por la URL del deployment. El pago simulado y los
endpoints `/api/dev/**` solo existen con el perfil dev; en producción se usa el flujo
real de la pasarela.
