# QueueLess Mobile

App móvil multi-rol (cliente, repartidor, comercio) con Expo + React Native.

## Arrancar

```bash
pnpm install   # o npm install
pnpm start     # luego escanea el QR con Expo Go o presiona 'i' / 'a'
```

Antes de arrancar, copia `.env.example` a `.env` y ajusta `EXPO_PUBLIC_API_URL`.

## Estructura

```
src/
├── api/                 cliente Axios
├── auth/                AuthContext, useAuth
├── navigation/          RootNavigator + navegadores por rol
├── components/ui/       Button, Badge, Card adaptados al design system
├── features/
│   ├── auth/screens/        Login, Registro
│   ├── cliente/screens/     Inicio, Carrito, Pedidos, Points, Perfil (15 pantallas)
│   ├── repartidor/screens/  Pedidos disponibles, Entrega activa, Completada (4)
│   └── comercio/screens/    Panel del comercio (3 vistas)
├── hooks/
├── lib/
├── theme/               tokens del design system
└── types/
```
