# QueueLess Web

Frontend web **responsive** de QueueLess para los **3 roles** (Cliente, Comercio,
Repartidor) en una sola SPA. React 18 + TypeScript (estricto) + Tailwind + Vite,
con axios + Context/hooks como capa de datos (sin TanStack Query).

Consume el backend Spring documentado en `../MAPA-FRONTEND.md` (fuente de verdad:
endpoints, 11 estados de pedido y el mapeo de errores). La estética sale del
design system en `../Design/` (tokens, tipografía Manrope, componentes de
referencia). Marca **naranja** por defecto + tema claro/oscuro.

El plan de trabajo por etapas vive en `PLAN-FRONTEND.md`.

## Arrancar

```bash
cp .env.example .env   # ajusta VITE_API_URL si hace falta
npm install
npm run dev            # http://localhost:5173
```

`VITE_API_URL` es el **origen** del backend, sin `/api` (cada llamada arma la ruta
completa: `/api/v1/...`, `/api/auth/...`). Por defecto `http://localhost:8090`
(perfil `dev`; prod usa `:8080`). El backend ya permite CORS desde `:5173`.

### Scripts

| Script           | Qué hace                                              |
| ---------------- | ----------------------------------------------------- |
| `npm run dev`     | Dev server con HMR en `:5173`.                       |
| `npm run build`   | `tsc` (estricto) + `vite build` → `dist/`.           |
| `npm run preview` | Sirve el bundle de producción.                       |
| `npm run lint`    | ESLint 9 (flat config: TS + react-hooks + react-refresh).   |
| `npm run format`  | Prettier sobre `src/`.                               |

## Estructura

```
src/
├── main.tsx              providers: Theme → Toast → Auth → Router
├── App.tsx               árbol de rutas (lazy por área)
├── app/
│   └── navigation.tsx    config de áreas/roles + helpers (rol activo = ruta)
├── api/
│   ├── client.ts         axios: envoltorio data, errores → ApiError, refresh-on-403
│   ├── index.ts          barrel namespaced (authApi, usuariosApi, …)
│   └── *.ts              endpoints por feature (auth, perfiles, pedidos, …)
├── auth/
│   ├── AuthContext.tsx   sesión JWT, roles, login/register/logout, activarRol
│   ├── ProtectedRoute.tsx  exige sesión
│   └── RoleRoute.tsx     exige un rol concreto
├── theme/
│   └── ThemeContext.tsx  tema claro/oscuro (data-theme + prefers-color-scheme)
├── components/
│   ├── ui/               primitivos del design system (Button, Input, Card,
│   │                     Badge, OrderStatusBadge, Modal, Toast, Spinner, …)
│   └── layout/           AppShell, Sidebar, BottomNav, Header, RoleSwitcher,
│                         OfflineBanner (aviso global sin conexión)
├── features/
│   ├── public/           LandingPage, PublicCatalogLayout (catálogo sin login)
│   ├── auth/             LoginPage, RegisterPage (+ AuthLayout)
│   ├── cuenta/           AccountPage, ProfilesPage (+ formularios por rol)
│   ├── cliente/          catálogo, detalle de local, carrito, pedidos +
│   │                     seguimiento SSE, pago, QR, reseña, points, reclamos,
│   │                     asistente (+ cart/CartContext)
│   ├── comercio/         cola en vivo (SSE), detalle de pedido, locales,
│   │                     productos (con foto), reclamos recibidos
│   ├── repartidor/       solicitudes disponibles, entrega activa (recogida +
│   │                     entrega con código), historial, points (reusa Cliente)
│   └── tyc/              TycGate (gating de términos y condiciones)
├── pages/                DesignDemo (/_design), Placeholder, NotFound
├── hooks/                useFetch, usePaginated, useSse, useOnline
├── lib/
│   ├── errors.ts         ApiError, fieldErrorMap, userFacingMessage
│   ├── sse.ts            SSE con header Authorization (fetch-event-source)
│   ├── qr.ts             PNG del QR como blob URL
│   ├── storage.ts        tokens (queueless.token / queueless.refresh)
│   ├── format.ts         moneda S/, minutos, fechas es-PE
│   ├── labels.ts         humanización de enums
│   └── cn.ts             clsx wrapper
├── types/                espejo de los DTOs y enums del backend
└── styles/
    ├── tokens.css        copia de Design/colors_and_type.css (marca + tema)
    └── index.css         tokens + directivas Tailwind
```

## Conceptos clave

- **Tokens, nunca hex crudo.** Tailwind cablea sus colores/radios/sombras a las
  variables CSS de `styles/tokens.css`, así `bg-brand` sigue la marca (`data-brand`)
  y el tema (`data-theme`) sin tocar valores. Estado nunca solo por color
  (píldoras con punto/ícono + texto), foco visible y áreas táctiles ≥ 44 px.
- **Sesión JWT.** `AuthContext` guarda los tokens en `localStorage` y expone
  `login/register/logout`, `roles`, `hasRole` y `activarRol` (que **refresca el
  token** para incluir la nueva autoridad). `logout` solo descarta tokens (no hay
  logout de servidor).
- **Cliente HTTP robusto.** `api/client.ts` desenvuelve `response.data.data`,
  normaliza todo error a `ApiError` y aplica **refresh-on-403** una sola vez (con
  cola para requests en vuelo); si el refresh falla, limpia la sesión y vuelve a Login.
- **Errores → UI.** `lib/errors.ts` mapea status a mensaje seguro (`MAPA §7`):
  400 `fieldErrors` inline, 401/409 en el formulario, 404 empty state, 422 muestra
  el `message` del backend, 500/offline genérico. Además `useOnline` + `OfflineBanner`
  avisan globalmente al perder conexión, sin esperar a que falle una petición.
- **Navegación por rol.** El **rol activo se deriva de la ruta** (`/cliente`,
  `/comercio`, `/repartidor`); `AppShell` es sidebar 240 px en escritorio (≥ `lg`)
  y bottom-nav en móvil, con un role switcher cuando hay más de un rol.
- **Gate de TyC.** Tras autenticarse se consulta `GET /me/tyc`; si la versión
  vigente no está aceptada, un modal bloqueante exige aceptarla (falla-abierto si
  la consulta falla, para no encerrar al usuario).
- **En vivo / QR.** `lib/sse.ts` y `lib/qr.ts` resuelven que `EventSource` y
  `<img>` no mandan headers: streams y PNG van por `fetch` con `Authorization`.
  El detalle de pedido (cliente y comercio) y la **cola del comercio** se suscriben
  al stream `pedido-estado` (vía `useSse`) y re-fetchean ante cada cambio; el QR se
  baja como blob URL en `LISTO_PARA_*`. Las acciones del comercio comparten un solo
  componente `AccionesPedido` (habilitado por estado, MAPA §4). El **repartidor** no
  tiene stream: refresca las solicitudes a mano y cierra cada entrega con el **código
  del QR** del cliente (mismo patrón que el pickup del comercio).
- **Datos y carrito.** Hooks propios `useFetch` / `usePaginated` / `useSse`
  (sin TanStack Query) y un `CartContext` persistido en `localStorage` (un local
  por pedido). El pago espera la confirmación **asíncrona** del webhook por
  polling de `GET /cliente/pagos/{id}` (en dev, botón para disparar el mock).

## Estado de avance

| Etapa | Alcance                                             | Estado |
| ----- | --------------------------------------------------- | ------ |
| 0     | Bootstrap, tokens y primitivos UI (demo en `/_design`) | ✅ |
| 1     | Núcleo de API, parsing, sesión (refresh-on-403), SSE/QR | ✅ |
| 2     | Layout responsive, rutas por rol, landing, login/registro, TyC, cuenta/perfiles | ✅ |
| 3     | Rol Cliente (catálogo, pedido, pago, seguimiento, QR, points, reclamos, asistente) | ✅ |
| 4     | Rol Comercio (cola en vivo por SSE, acciones por estado, CRUD locales/productos + foto, ocupación, reclamos) | ✅ |
| 5     | Rol Repartidor (tomar solicitudes, confirmar recogida/entrega con código, historial, points) | ✅ |
| 6     | Transversales: estado offline, ESLint 9, a11y AA, copy español neutro | ✅ |
| 7     | Build, entorno y deploy (env, nota de CORS, `preview`) | ✅ |

> `npm run build` (tsc estricto + vite) sale **limpio**, con code-splitting por
> área. La verificación end-to-end contra el backend dev (`:8090`) se hace a
> medida que llegan las pantallas de cada rol.

## Deploy

SPA estática: `npm run build` genera `dist/` (servible por cualquier CDN/host
estático). En **Vercel** (o similar) usa un proyecto con _framework preset_ Vite:

| Ajuste            | Valor                              |
| ----------------- | ---------------------------------- |
| Build command     | `npm run build`                    |
| Output directory  | `dist`                             |
| Env var           | `VITE_API_URL` = origen del backend de prod, sin `/api` ni barra final |

Backend de prod actual (AWS ALB):
`http://queueless-prod-alb-1673624815.us-east-1.elb.amazonaws.com`

`VITE_API_URL` se **inyecta en build** (Vite reemplaza `import.meta.env` al
compilar): si cambias el backend, hay que **rebuildear**, no basta con editar una
variable en runtime. Como es una SPA con rutas del lado del cliente, configura el
_rewrite_ de todas las rutas a `/index.html` (en Vercel es automático con el preset
Vite; en otros hosts, un fallback SPA a `index.html`).

> ⚠️ **Mixed content.** El ALB de prod responde por **`http://`**. Un front servido
> por **HTTPS** (Vercel lo hace siempre) **no puede** llamar a una API `http://`: el
> navegador bloquea la petición. Para producción real hay que ponerle **TLS al ALB**
> (certificado ACM + listener `:443`) y usar la URL `https://`. Para una prueba rápida
> sirve el front por `http` (no Vercel) y apunta `VITE_API_URL` al ALB tal cual.

> **Nota de CORS (backend).** El origen del front desplegado debe estar en la
> _allow-list_ de CORS del backend: `backend/.../config/CorsConfig.java` →
> `setAllowedOrigins(...)`. Hoy solo permite orígenes locales (`:5173`, `:3000`,
> Expo). Para producción hay que **sumar el dominio de Vercel** (p. ej.
> `https://queueless.vercel.app`) a esa lista y redeployar el backend. Es el único
> cambio que el deploy del front exige del backend.
