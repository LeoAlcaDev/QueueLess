# Plan de desarrollo — Frontend Web de QueueLess

> Documento de trabajo para desarrollar la web de QueueLess de forma ordenada.
> Marca los checkboxes (`[ ]` → `[x]`) a medida que avances. La especificación
> funcional completa (endpoints, estados, errores) vive en `MAPA-FRONTEND.md`
> (raíz del repo) y la estética en `Design/`.

## Contexto

QueueLess necesita un **frontend web responsive** (React 18 + TypeScript + Vite + Tailwind)
que consuma el backend Spring ya documentado en `MAPA-FRONTEND.md` (la fuente de verdad:
67 endpoints, 11 estados de pedido, ~90 escenarios de error verificados contra el código).

El directorio `web/` ya está **andamiado** (React 18, TS estricto, Tailwind, Vite, axios,
react-router) pero prácticamente vacío (carpetas con `.gitkeep`, `App.tsx` placeholder, un
`tailwind.config.js` con hex verdes hardcodeados y un `client.ts` con un interceptor mínimo).

El diseño de referencia vive en `Design/` y está pensado **mobile-first (390 px)** para la app
Expo, más un panel `web_admin` (1280 px). El objetivo de este trabajo es **adaptar esa estética
a una web única y responsive** que se vea correcta tanto en desktop como en móvil, manteniendo
coherencia visual con la app mobile (mismos tokens, tipografía Manrope, componentes equivalentes),
sin tener que ser idéntica pixel a pixel.

**Decisiones de alcance:**
- **Roles:** los **3 roles** (Cliente, Comercio, Repartidor) en una sola web responsive.
- **Capa de datos:** **axios + Context/hooks** (sin TanStack Query); hooks de fetch propios.
- **Marca/tema:** **naranja por defecto** + dark, cableando los tokens semánticos de
  `Design/colors_and_type.css` a Tailwind. Verde legacy queda disponible vía `data-brand` pero no es foco.

**Resultado esperado:** una SPA navegable por rol, con sesión JWT (refresh-on-403), seguimiento
en vivo por SSE, QR de entrega, y manejo uniforme de errores según `MAPA-FRONTEND.md §7`.

---

## Reglas de oro (de `Design/README.md` + `SKILL.md` — respetar siempre)

- **Tokens semánticos, nunca hex crudo** (`var(--color-brand)`, `--color-points`, `--color-status-*`).
- Acción primaria = `--color-brand-strong`. **Morado = exclusivo de QueuePoints.**
- **Estado nunca solo por color**: cada píldora lleva punto/ícono + texto. Foco visible. Touch ≥ 44 px.
- **Manrope**, sentence case, sin emoji. Iconos **Lucide** outline 2 px.
- Radios por token (naranja 10/14/16, pills 999). Borders 1 px. Sombras solo en flotantes.
- Moneda `S/ 12.50`, tiempo `15 min` / `≈ 15 min`. Botones en imperativo.
- `OrderStatusBadge` = fuente de verdad de los 11 estados.
- Mobile ref 390 px / Web admin ref 1280 px → **responsive entre ambos**.

---

## Stack y dependencias a añadir

- Ya instalado: `react`, `react-dom`, `react-router-dom@6`, `axios`, `tailwindcss`, `vite`, TS estricto.
- **Añadir:** `lucide-react` (iconografía del design system), `clsx` (composición de clases).
- Opcional: `@microsoft/fetch-event-source` para **SSE con header `Authorization`**
  (el `EventSource` nativo no manda headers — ver `MAPA §8.3`). Alternativa: polyfill propio con `fetch`+stream.

---

## Etapas

> Cada etapa es entregable y verificable de forma independiente.

### Etapa 0 — Bootstrap y fundamentos de diseño

Objetivo: la app arranca, tiene los tokens del design system y los primitivos UI.

- [x] Copiar `Design/colors_and_type.css` a `web/src/styles/tokens.css` e importarlo en `src/styles/index.css`
      (antes de las directivas Tailwind). Mantener `@import` de Manrope.
- [x] Reescribir `web/tailwind.config.js`: mapear `colors` a los **tokens CSS** (p. ej.
      `brand: 'var(--color-brand)'`, `points: 'var(--color-points)'`, neutros, estados) en vez de los hex verdes actuales. `borderRadius` por token. `fontFamily.sans = Manrope`.
- [x] Definir breakpoints/contenedores responsive (mobile-first; `lg` ≈ 1024 px para layout desktop).
- [x] Setear `data-brand="orange"` por defecto en `<html>` (`web/index.html`) y soporte `data-theme="dark"`
      vía un `ThemeContext` simple (toggle + `prefers-color-scheme`).
- [x] Instalar `lucide-react` + `clsx`. Copiar logos de `Design/assets/` a `web/public/`.
- [x] Crear primitivos en `src/components/ui/` (TSX tipados, portando specs de `Design/components/`):
      `Button` (variants primary/secondary/ghost/destructive/points, sizes, loading, full),
      `Input`/`Field` (label + error inline), `Card`, `Badge`, `OrderStatusBadge` (11 estados),
      `WaitTimeBadge`, `QueuePointsBadge`, `PickupDeliveryToggle`, `Modal`/`Sheet`, `Toast`,
      `Spinner`/`Skeleton`, `EmptyState`. Referencia visual: `Design/components/*` y `Design/ui_kits/`.
- [x] Actualizar `App.tsx` para renderizar el router (placeholder de rutas; demo en `/_design`).

**Verificación:** `npm run dev` levanta en `:5173`; una página demo (`/_design`) muestra los primitivos en
light/dark y se ven naranjas con la tipografía Manrope. ✔ `npm run build` (tsc estricto + vite) limpio.

> **Nota (pendiente para Etapa 6):** el andamiaje trae el script `lint` pero **no** un `eslint.config.js`
> (ESLint 9 exige flat config). `npm run lint` falla por falta de config, no por el código. La config se
> define en Etapa 6. También se añadió `src/vite-env.d.ts` (faltaba; sin él `import.meta.env` no tipa).

### Etapa 1 — Núcleo de API, parsing y sesión

Objetivo: toda llamada al backend pasa por un cliente robusto que respeta el envoltorio y los errores.

- [x] `src/types/`: tipos espejo de los DTOs y enums (de `MAPA §3` y la nota de enums): `ApiResponse<T>`,
      `Page<T>`, `ErrorResponse` (`status`, `message`, `fieldErrors[]`), `AuthResponse`, `Rol`, `TipoEntrega`,
      `EstadoPedido` (11), `Alergeno`, `MotivoCancelacion`, etc. → `enums.ts`, `api.ts`, `auth.ts`, `dtos.ts`
      (todos los Response/Request del backend, verificados leyendo los DTOs reales).
- [x] `src/api/client.ts`: reescribir interceptores.
      - Request: inyectar `Bearer <access>` desde storage (clave `queueless.token` + `queueless.refresh`).
      - Response: **desenvolver `response.data.data`** vía helpers `http.get/post/...` (paginados = `Page<T>`);
        normalizar errores a `ApiError`. Casos sin envoltorio: QR/SSE en `lib/`, DELETE→`http.del` (void), webhook mock tipado.
- [x] **Estrategia refresh-on-403** (`MAPA §2.3/§7`): ante 403 inesperado, intenta `POST /api/auth/refresh`
      una vez (con **cola** `refreshing` para requests en vuelo), reemplaza **ambos** tokens y reintenta; si el refresh
      falla → `clearTokens()` → `onSessionCleared` → Login. Excluye rutas `/api/auth/*`.
- [x] `src/api/` por feature (funciones tipadas): `auth.ts`, `usuarios.ts`, `perfiles.ts`, `catalogo.ts`,
      `pedidosCliente.ts`, `pagos.ts`, `pedidosComercio.ts`, `locales.ts`, `productos.ts`, `repartidor.ts`,
      `queuepoints.ts`, `resenas.ts`, `reclamos.ts`, `tyc.ts`, `asistente.ts`, `ocupacion.ts` (barrel namespaced en `index.ts`).
- [x] `src/lib/sse.ts`: helper de **SSE con header `Authorization`** (`@microsoft/fetch-event-source`),
      con `close()` (AbortController) al desmontar y reconexión automática (`MAPA §8.3`).
- [x] `src/lib/qr.ts`: `fetch` del PNG con `Authorization` → **blob URL** + `revokeBlobUrl` (no `<img src=endpoint>`) (`MAPA §8.4`).
- [x] `src/auth/`: `AuthContext` + `useAuth` (login/register/logout=descartar tokens, usuario actual, roles, `activarRol`),
      `ProtectedRoute` (auth) y `RoleRoute` (exige rol; `activarRol` **refresca token** antes de entrar).
- [x] `src/lib/errors.ts` (`ApiError`, `fieldErrorMap`, `userFacingMessage`) + `useToast`: mapeo status→UI de
      `MAPA §7.1` (400 fieldErrors inline, 401, 403, 404 empty, 409 inline, 422 `message` tal cual, 500 genérico, offline).

**Verificación:** login real contra backend dev (`http://localhost:8090`), token persistido, una ruta
protegida accesible; forzar un 422 y ver el `message` del backend; expirar el access y ver el refresh automático.

> **Estado:** plomería completa y `npm run build` (tsc estricto + vite) **limpio**; el dev server levanta.
> La verificación **end-to-end contra el backend** (login real, 422, refresh) queda para cuando existan las
> pantallas de Login/Registro (Etapa 2) y el backend dev corra en `:8090` — las funciones de API y el flujo
> de sesión ya están listos para esa prueba. Dependencias añadidas: `@microsoft/fetch-event-source`.

### Etapa 2 — Layout, navegación y acceso compartido

Objetivo: shell responsive por rol + flujos de entrada comunes.

- [x] `src/components/layout/`: `AppShell` responsive — **sidebar 240 px en desktop** / **bottom-nav en móvil**
      (`MAPA Design layout rules`); `Header` sticky con título + acción; navegación según rol activo; **role switcher**.
- [x] Rutas con `react-router` por área (`/`, `/auth/*`, `/cliente/*`, `/comercio/*`, `/repartidor/*`), lazy load.
- [x] Landing / splash pública.
- [x] **Registro** (`POST /api/auth/register`) con selector multi-rol; 409 → "correo en uso" inline en email.
- [x] **Login** (`POST /api/auth/login`); 401 → "Credenciales inválidas" en el form.
- [x] **Banner/modal de TyC** (`GET /me/tyc`, `POST /me/tyc/aceptacion`) si `aceptoVersionVigente=false` (gating en front).
- [x] **Mi cuenta / roles** (`GET /usuarios/me`, `GET /me/perfiles`, `POST /usuarios/me/activar-rol` → refrescar token).
- [x] Edición de perfiles (`PUT /me/perfiles/{cliente|comercio|repartidor}`).
- [x] Actualizar web/README.md
**Verificación:** registro→login→navegación entre áreas; sidebar↔bottom-nav al redimensionar; TyC y activar-rol.

> **Estado:** UI completa y `npm run build` (tsc estricto + vite) **limpio** (code-split por área). Decisiones tomadas
> (todas con defaults recomendados): **rol activo = derivado de la ruta** (sin estado extra), la **landing redirige**
> al área del primer rol si hay sesión, y las áreas de rol traen **home real + Placeholder** para sub-rutas de Etapas 3–5.
> El **TyC gate** falla-abierto si `GET /me/tyc` falla (no encierra al usuario). La verificación **e2e contra backend**
> (registro→login→TyC→activar-rol con refresh de token) queda para correr con el backend dev en `:8090`.

### Etapa 3 — Rol Cliente (responsive, mobile-leaning)

Objetivo: flujo completo de pedido, pago, seguimiento en vivo y extras.

- [x] Home cliente + **Catálogo público** (`GET /puntos-de-venta`, solo abiertos) — sin login.
- [x] **Detalle de local** (`/{id}` + `/productos` + `/tiempo-estimado` + `/resenas` + `/cliente/ocupacion/{id}` si logueado):
      menú con `disponibleAhora`/`razonNoDisponible`, tiempo estimado, reseñas, curva de ocupación.
- [x] **Armar pedido / carrito**: items + cantidades (≥1), `PickupDeliveryToggle`, `zonaEntrega` si DELIVERY, programado.
- [x] **Crear pedido** (`POST /cliente/pedidos`); 404 → refrescar catálogo; 422 → toast con `message`.
- [x] **Pago** (`POST /cliente/pagos/iniciar` → abrir `urlCheckout`); confirmación **asíncrona** vía SSE o polling
      `GET /cliente/pagos/{id}`/detalle hasta salir de PENDIENTE_PAGO; **409 ya tiene pago** → ir al pago existente.
      En dev disparar el webhook mock (`POST /api/pago/webhook/mock?referencia=`).
- [x] **Mis pedidos** (`GET /cliente/pedidos` paginado) con `OrderStatusBadge`.
- [x] **Detalle + seguimiento en vivo**: `GET /cliente/pedidos/{id}` + **SSE `pedido-estado`** + acciones por estado
      (`MAPA §4`): pagar/cancelar, reintentar búsqueda, cambiar a pickup, **mostrar QR**.
- [x] **QR de entrega** (`GET /cliente/pedidos/{id}/qr` como blob) en `LISTO_PARA_*`.
- [x] **Dejar reseña** (`POST /cliente/pedidos/{id}/resenas`) solo si ENTREGADO; 422 si ya reseñó → ocultar botón.
- [x] **QueuePoints** (`GET /me/queuepoints/saldo` + `/movimientos`, `POST /canjear`); 422 saldo insuficiente.
- [x] **Reclamos** (`GET /reclamos/mios`, `POST /reclamos`; contra COMERCIO exige `puntoDeVentaId`).
- [x] **Asistente (chat)** (`POST /cliente/asistente`, **siempre 200**); si `asistenteDisponible=false` mostrar `aviso` + lista igual.
- [x] Actualizar web/README.md

**Verificación:** pedido end-to-end PICKUP en dev (crear → pagar con webhook mock → ver transición por SSE → QR);
reseña tras ENTREGADO; canje de puntos con saldo insuficiente muestra el mensaje del backend.

> **Estado:** UI completa y `npm run build` (tsc estricto + vite) **limpio** (code-split por pantalla). Decisiones
> tomadas (defaults recomendados, confirmadas): **catálogo público** en `/locales` + espejo in-shell en `/cliente`
> (agregar al carrito exige login → redirige); **nav cliente** Inicio·Pedidos·Carrito·Points (+ Cuenta) según el
> bottom-nav de 5 tabs del design system; **Inicio = catálogo** (sin dashboard aparte). Nuevos cimientos: hooks
> `useFetch`/`usePaginated`/`useSse`, `lib/format.ts` y `CartContext` (carrito persistido, un local por pedido).
> El **canje de QueuePoints** usa una referencia manual (`CANJE_MANUAL` + id único) — verificado contra el
> `QueuePointsService` (referenciaTipo es string libre, idempotente por referencia). La verificación **e2e contra
> el backend dev** (`:8090`, webhook mock, SSE) queda para correr con el backend levantado.

### Etapa 4 — Rol Comercio (desktop-leaning, panel)

Objetivo: panel de mostrador/cocina, CRUD y reclamos.

- [x] **Cola de pedidos en vivo** (`GET /comercio/pedidos/cola` + **SSE** + re-fetch ante 422 por carrera) — centro del panel.
- [x] Detalle de pedido (`GET /comercio/pedidos/{id}`).
- [x] Acciones: `aceptar`/`iniciar-preparacion`/`marcar-listo`/`rechazar`/`cancelar`
      (`rechazar`/`cancelar` con `MotivoCancelacionRequest`); 422 transición ilegal → refrescar cola.
- [x] **Cerrar entrega (pickup)** (`POST /{id}/marcar-entregado {codigo}`); 400 falta código / 422 no coincide.
- [x] **Gestión de locales** (`GET/POST/PUT`, `PATCH /{id}/estado` abrir/cerrar, `DELETE` con 409 si dependencias).
- [x] **Gestión de productos** (`GET ?puntoDeVentaId=`, `POST`, `PUT`, `PATCH /{id}/disponibilidad`, `DELETE`,
      `POST /{id}/foto` **multipart `file`** ≤2MB jpg/png/webp; 422 formato/tamaño).
- [x] Ocupación del local (`GET /comercio/ocupacion/{id}`) — analytics por franja.
- [x] **Reclamos recibidos** (`GET /comercio/reclamos`, `POST /{id}/responder`); 422 si ya respondido.
- [x] Perfil comercio (`GET/PUT /me/perfiles/comercio`, RUC obligatorio; tasa cumplimiento solo lectura). _(ya cubierto en `cuenta/perfiles` desde Etapa 2)_
- [x] Actualizar web/README.md
**Verificación:** cola refresca por SSE al crear un pedido desde el lado cliente; ciclo aceptar→preparar→listo→
marcar-entregado con el código del QR del cliente; alta de producto con foto.

> **Estado:** UI completa y `npm run build` (tsc estricto + vite) **limpio** (code-split por pantalla). La **cola**
> (`/comercio`) ordena por prioridad de atención y se refresca por SSE (`pedido-estado` del stream de comercio) y tras
> cada acción (evita carreras → 422). Las **acciones por estado** se centralizan en `AccionesPedido` (reusado por la
> cola y el detalle): aceptar/rechazar, iniciar-preparación, marcar-listo, marcar-entregado (modal de código) y
> cancelar (modal de motivo; `OTRO` exige detalle). **Locales** con alta/edición, abrir/cerrar, baja (409 si tiene
> dependencias) y ocupación (reusa `OcupacionCurva` del cliente). **Productos** por local con CRUD, disponibilidad,
> ventanas/vigencia opcionales y **foto** multipart (valida ≤2 MB y jpg/png/webp en el front antes de subir). El
> **perfil de comercio** ya se edita en `cuenta/perfiles`. Copy en **español neutro** (cambio de estilo pedido por el
> usuario). La verificación **e2e contra el backend dev** (`:8090`, SSE, foto) queda para correr con el backend levantado.

### Etapa 5 — Rol Repartidor (responsive, mobile-leaning)

Objetivo: tomar y cerrar entregas.

- [x] **Solicitudes disponibles** (`GET /repartidor/pedidos-disponibles`, `POST /solicitudes/{id}/aceptar`);
      422 si otro la tomó → refrescar lista.
- [x] Entrega activa (`GET /repartidor/solicitudes/{id}`).
- [x] Confirmar recogida (`POST /{id}/confirmar-recogida`).
- [x] **Confirmar entrega** (`POST /{id}/confirmar-entrega {codigo}`); 422 si no coincide; +50 QueuePoints.
- [x] Mis entregas / historial (`GET /repartidor/mis-entregas` paginado).
- [x] Perfil repartidor (`GET/PUT /me/perfiles/repartidor`, toggle `disponible`; calificación/entregas solo lectura).
      _(ya cubierto en `cuenta/perfiles` con `RepartidorProfileForm` desde Etapa 2)._
- [x] QueuePoints ganados (reusa pantalla de puntos de Cliente).

**Verificación:** tomar una solicitud, confirmar recogida, confirmar entrega con el código y ver +50 QPts.

> **Etapa 5 — hecha.** Decisiones: `DisponiblesPage` (índice de `/repartidor`) lista los
> `BUSCANDO` y al aceptar navega al detalle (`/repartidor/solicitudes/:id`); el 422 "otro la
> tomó" hace _refetch_ de la lista. El detalle confirma recogida y cierra con el código del
> cliente (modal; 422 código incorrecto mantiene el modal abierto). `MisEntregasPage`
> (`/repartidor/entregas`, paginada) lista todo el historial y enlaza al detalle ("Continuar
> entrega" si está activa). La pantalla de **Points** reusa `PointsPage` del cliente (el
> repartidor es quien gana QPts). El **perfil repartidor** ya vivía en `cuenta/perfiles`
> (toggle `disponible`), así que no se duplicó. No hay SSE de repartidor en el backend:
> refresco manual + _refetch_ tras cada acción. Copy en español neutro. `npm run build` limpio.

### Etapa 6 — Transversales, accesibilidad y responsive QA

Objetivo: pulir lo común y garantizar que funcione en toda pantalla y en ambos temas.

- [x] Estados vacíos con copy útil + acción (`Design content fundamentals`); skeletons en carga; estado offline.
- [x] Manejo global de errores consistente con `MAPA §7.2` por acción (matriz pantalla→error→reacción).
- [x] Accesibilidad AA: foco visible, áreas táctiles ≥44 px, estado con ícono+texto, contraste, navegación por teclado.
- [x] Responsive QA en 390 / 768 / 1280 px y light/dark; sidebar↔bottom-nav; CTA en zona del pulgar en móvil.
- [x] Copy: español neutro, sentence case, moneda `S/`, tiempos abreviados.
- [x] `lint` + `format` pasan; TS estricto sin errores (`noUnusedLocals` etc.).
- [x] Actualizar web/README.md

> **Etapa 6 — hecha.** `eslint.config.js` (flat config de ESLint 9: `@eslint/js` +
> `typescript-eslint` + `react-hooks` + `react-refresh`); `npm run lint` sale con **0 errores**
> (solo warnings idiomáticos de Fast Refresh en context/provider y el contador `reqId`).
> Nuevo **estado offline** global: hook `useOnline` (eventos online/offline) + `OfflineBanner`
> sticky en el `AppShell`. Barrido completo de copy a **español neutro** (se eliminó todo el
> voseo de Etapas 2–5: login, landing, cuenta/perfiles, carrito, catálogo, pedido, reseña, QR,
> asistente, errores). A11y verificada: `lang="es"`, foco visible (`shadow-focus`), estado con
> ícono+texto (badges con punto), `aria-label` en controles de solo ícono, CTAs md = 48 px.
> Estados vacíos/skeletons ya cubiertos por `EmptyState`/`Skeleton` en cada pantalla. `npm run
> build` (tsc estricto + vite) y `npm run format` limpios.
### Etapa 7 — Build, entorno y deploy

- [x] `web/.env.example`: ajustar `VITE_API_URL` a dev `http://localhost:8090` (prod `:8080`). Documentar en `web/README.md`.
- [x] Documentar nota de **CORS**: para deploy (Vercel) hay que sumar el origen en `backend .../config/CorsConfig.java`.
- [x] `npm run build` (tsc + vite build) limpio; `npm run preview` sirve el bundle.
- [x] README de `web/` actualizado a la estructura real y a los 3 roles (hoy dice "Panel del comercio").
- [x] Actualizar web/README.md

> **Etapa 7 — hecha.** `.env.example` ya apunta a `VITE_API_URL=http://localhost:8090` (el
> cliente lo lee en `client.ts` con fallback a `:8090`; `import.meta.env` se inyecta en build).
> `npm run build` sale limpio y `npm run preview` sirve el bundle (HTTP 200 en `:4173`,
> verificado). Se agregó al README la sección **Deploy** (preset Vite en Vercel: build
> `npm run build`, output `dist/`, env `VITE_API_URL` = origen del backend de prod, rewrite SPA
> a `index.html`) y la **nota de CORS**: el dominio desplegado debe sumarse a
> `setAllowedOrigins(...)` en `backend/.../config/CorsConfig.java` (hoy solo orígenes locales).
> No se tocó el backend (la nota es documentación; el cambio de allow-list se hará al desplegar).
> `.gitignore` ya ignora `.env*` y `dist/`. Las 7 etapas del plan quedan completas.
---

## Archivos clave a crear/modificar

- `web/tailwind.config.js` — mapear a tokens CSS (reemplaza hex verdes).
- `web/src/styles/tokens.css` (copia de `Design/colors_and_type.css`) + `web/src/styles/index.css`.
- `web/src/api/client.ts` — reescribir (envoltorio + refresh-on-403) + `web/src/api/*.ts` por feature.
- `web/src/types/*` — DTOs/enums espejo.
- `web/src/auth/*` — `AuthContext`, `ProtectedRoute`, `RoleRoute`.
- `web/src/lib/{sse,qr,errors}.ts`, `web/src/hooks/*` (useFetch/usePaginated/useSse).
- `web/src/components/ui/*` — primitivos portados de `Design/components/*`.
- `web/src/components/layout/*` — `AppShell`, `Sidebar`, `BottomNav`, `Header`.
- `web/src/features/{auth,cliente,comercio,repartidor,cuenta}/*` — pantallas por rol.
- `web/src/App.tsx`, `web/index.html` (`data-brand="orange"`, favicon/logo).
- [ ] Actualizar web/README.md
## Reuso (no reinventar)

- **Especificación funcional completa:** `MAPA-FRONTEND.md` (endpoints, estados, errores) — seguirlo al pie.
- **Tokens y tipografía:** `Design/colors_and_type.css` (importar, no duplicar hex).
- **Componentes de referencia:** `Design/components/{Button,OrderStatusBadge,WaitTimeBadge,QueuePointsBadge,PickupDeliveryToggle}`
  (specs + `.d.ts`) y los prototipos `Design/ui_kits/{mobile,web_admin}` para layout/interacción.
- **Iconos/logos:** Lucide (`lucide-react`) + `Design/assets/queueless-*.svg`.

## Verificación end-to-end (global)

1. Backend dev en `:8090` (CORS ya permite `:5173`). `cd web && npm install && npm run dev`.
2. **Cliente:** registro multi-rol → login → catálogo → armar pedido PICKUP → iniciar pago → disparar webhook
   mock → ver transición por SSE → mostrar QR → (tras entrega) reseñar.
3. **Comercio:** ver el pedido entrar en la cola por SSE → aceptar→preparar→listo→marcar-entregado con el código del QR.
4. **Repartidor:** pedido DELIVERY → tomar solicitud → confirmar recogida → confirmar entrega con código → +50 QPts.
5. Forzar errores clave (422 transición ilegal, 409 correo en uso, 403 token vencido→refresh) y verificar el
   mapeo de `MAPA §7`. Probar en 390/768/1280 px y en light/dark.
6. `npm run lint` y `npm run build` limpios.

## Fuera de alcance (límites del backend actual)

- **No hay** recuperar/cambiar contraseña ni logout de servidor (logout = descartar tokens). No planificar esas pantallas.
- Webhook de MercadoPago real: el front no lo consume; en dev se usa el mock.
- **No tocar el esquema de DB** ni el backend salvo la nota de CORS para deploy.
