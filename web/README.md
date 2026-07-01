# QueueLess Web

Panel del comercio (y administración) — React 18 + TypeScript + Tailwind + Vite.

## Arrancar

```bash
pnpm install   # o npm install
pnpm dev       # http://localhost:5173
```

Antes de arrancar, copia `.env.example` a `.env` y ajusta `VITE_API_URL` si tu
backend corre en un puerto distinto.

## Estructura

```
src/
├── api/                 cliente Axios + endpoints por feature
├── auth/                AuthContext, useAuth, ProtectedRoute
├── components/ui/       Button, Input, Badge, Card (Tailwind)
├── features/
│   ├── auth/            login y registro web
│   ├── comercio/        dashboard, cola de pedidos, menú, reportes
│   └── admin/
├── hooks/
├── lib/
├── types/               mirror de los DTOs del backend
└── styles/
```
