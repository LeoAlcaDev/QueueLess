# Colección Postman de QueueLess

Recorrido **end-to-end** del backend: registra los tres roles, da de alta un local
y un producto, recorre el catálogo público, completa un pedido PICKUP, deja una
reseña, completa un pedido DELIVERY con matching de repartidor y revisa los
QueuePoints. Las requests **se encadenan solas** (los tokens y los ids se guardan
en variables de colección con scripts), así que se corre toda de un solo click sin
copiar nada a mano.

Esta carpeta es la **fuente de verdad** de la colección: `postman_collection.json` (la
colección) y `QueueLess.dev.postman_environment.json` (el environment), junto con esta guía.

## Cómo usarla

1. Levantá el backend en perfil dev con el seed cargado (ver `DEVELOPMENT.md`):
   ```bash
   cd backend && docker compose up -d   # Postgres
   ./mvnw spring-boot:run               # backend en http://localhost:8090
   ```
2. En Postman, **Import** → arrastrá `postman_collection.json` y
   `QueueLess.dev.postman_environment.json`.
3. Seleccioná el environment **QueueLess dev** (arriba a la derecha).
4. Abrí el **Collection Runner** (botón *Run*), elegí la colección y *Run QueueLess API - E2E*.
   Las carpetas **01–08** son el recorrido end-to-end encadenado y corren en orden; cada
   request valida su código de estado.

> La colección es **idempotente**: cada corrida usa emails con `{{$timestamp}}`, así
> que se puede correr varias veces sin chocar con correos duplicados.

## Qué cubre cada carpeta

| Carpeta | Qué valida |
|---|---|
| **01 Auth** | Login inválido (401), registro de cliente/comercio/repartidor (201) y refresco de tokens (200). Guarda los `accessToken` de cada rol. |
| **02 Usuario y perfil** | Lectura de los perfiles y de la cuenta del autenticado (200). |
| **03 Comercio: alta** | El comercio crea un punto de venta y un producto (201). Guarda `puntoDeVentaId` y `productoId`. |
| **04 Catálogo público** | Listado, detalle, productos y tiempo estimado (200) y un id inexistente (404), sin token. |
| **05 Flujo PICKUP** | Pedido → pago → webhook → el comercio lo acepta, prepara, marca listo y entregado (todo 200/201). |
| **06 Reseña** | El cliente reseña el local del pedido entregado (201). |
| **07 Flujo DELIVERY** | Pedido delivery → pago → webhook → el repartidor toma la solicitud, el comercio la prepara, y el repartidor confirma recogida y entrega (200). |
| **08 QueuePoints** | Saldo y movimientos del cliente (200), y un canje rechazado con **422**: el cliente no gana QueuePoints (solo el repartidor, por entrega completada). |

Las carpetas **09–24** son **cobertura del contrato**: una request por cada endpoint del
backend (actualización de perfiles, lecturas y acciones del cliente, gestión y acciones del
comercio, CRUD de puntos de venta y productos, reseñas públicas, reclamos, términos, ocupación,
asistente, consulta de pago, helpers de dev y los streams SSE), más algunos casos negativos
(propiedad ajena → 404, duplicado → 409). Reutilizan los tokens e ids que el recorrido 01–08
dejó en variables, así que conviene correr primero el end-to-end. No todas pasan en una sola
corrida —algunas mutan estado o dependen del momento—; su objetivo es documentar el contrato
que consume el frontend, no ser un segundo happy-path.

## Notas sobre el flujo de delivery

La solicitud de delivery se crea de forma **asíncrona** después de confirmar el pago
(ver ADR-0009 y ADR-0014). La request *Repartidor lista solicitudes disponibles* espera
~1.5 s antes de consultar para darle tiempo al listener, y busca la solicitud por
`pedidoId`. Si en una máquina lenta llegara a fallar por timing, basta con re-ejecutar
esa carpeta.

El orden del flujo delivery no es casual: el **repartidor acepta la solicitud primero**
(eso pasa el pedido a `PAGADO_ESPERANDO_COMERCIO`), después el comercio lo acepta,
prepara y marca `LISTO_PARA_DELIVERY`, y recién entonces el repartidor confirma recogida
y entrega. Es la máquina de estados real del pedido (ver `EstadoPedido`).

## 403 vs 401

Una request a un endpoint protegido **sin token** responde **403**, no 401: la cadena de
seguridad la corta antes del controlador. Es comportamiento conocido del proyecto desde el
versionado de la API (ADR-0022), no un bug.

## Correrla contra el deployment de AWS

Cambiá la variable `baseUrl` del environment (o de la colección) por la URL del ALB —por
ejemplo `http://queueless-prod-alb-...elb.amazonaws.com`— y corré la colección igual. El
deployment está apagado por defecto; cómo encenderlo está en el `README.md` raíz.
