import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute, type RouteProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import { Icon, type IconName } from '@/components';
import { CartProvider } from '../cart/CartContext';
import {
  AsistenteScreen,
  CheckoutScreen,
  HomeScreen,
  MisPedidosScreen,
  PagoScreen,
  PerfilScreen,
  ProductoDetalleScreen,
  PuntoDetalleScreen,
  QrScreen,
  QueuePointsScreen,
  ReclamosScreen,
  ResenaScreen,
  SeguimientoScreen,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// pantallas del flujo de pedido que cuelgan de varios tabs (se navega dentro del
// stack actual, así que registrarlas en cada uno mantiene el back natural)
function orderFlowScreens() {
  return [
    <Stack.Screen key="PuntoDetalle" name="PuntoDetalle" component={PuntoDetalleScreen} />,
    <Stack.Screen key="ProductoDetalle" name="ProductoDetalle" component={ProductoDetalleScreen} />,
    <Stack.Screen key="Checkout" name="Checkout" component={CheckoutScreen} />,
    <Stack.Screen key="Pago" name="Pago" component={PagoScreen} />,
    <Stack.Screen key="Seguimiento" name="Seguimiento" component={SeguimientoScreen} />,
    <Stack.Screen key="Qr" name="Qr" component={QrScreen} />,
    <Stack.Screen key="Resena" name="Resena" component={ResenaScreen} />,
  ];
}

function InicioStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      {orderFlowScreens()}
    </Stack.Navigator>
  );
}

function PedidosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MisPedidos" component={MisPedidosScreen} />
      {orderFlowScreens()}
    </Stack.Navigator>
  );
}

function AsistenteStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AsistenteChat" component={AsistenteScreen} />
      {orderFlowScreens()}
    </Stack.Navigator>
  );
}

function PointsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PointsHome" component={QueuePointsScreen} />
    </Stack.Navigator>
  );
}

// Reclamos vive acá dentro para que navigate('Reclamos') desde el perfil abra la
// pantalla in-app del cliente y no el stub de cuenta del stack raíz
function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilHome" component={PerfilScreen} />
      <Stack.Screen name="Reclamos" component={ReclamosScreen} />
    </Stack.Navigator>
  );
}

const TAB_ICONS: Record<string, IconName> = {
  Inicio: 'house',
  Pedidos: 'receipt',
  Asistente: 'sparkles',
  Points: 'bolt',
  Perfil: 'userRound',
};

export function ClienteNavigator() {
  const t = useTheme();

  return (
    <CartProvider>
      <Tab.Navigator
        screenOptions={({ route }: { route: RouteProp<Record<string, object | undefined>, string> }) => {
          // ocultamos la barra en Pago: el pago no debe competir con la navegación
          const focused = getFocusedRouteNameFromRoute(route);
          const oculta = focused === 'Pago';
          return {
            headerShown: false,
            tabBarActiveTintColor: t.colors.brand,
            tabBarInactiveTintColor: t.colors.textMuted,
            tabBarLabelStyle: { fontFamily: t.fontFamily.medium, fontSize: 11 },
            tabBarIcon: ({ color, size }) => <Icon name={TAB_ICONS[route.name]} size={size} color={color} />,
            tabBarStyle: oculta
              ? { display: 'none' }
              : {
                  backgroundColor: t.colors.bgSurface,
                  borderTopWidth: 1,
                  borderTopColor: t.colors.borderDefault,
                },
          };
        }}
      >
        <Tab.Screen name="Inicio" component={InicioStack} />
        <Tab.Screen name="Pedidos" component={PedidosStack} />
        <Tab.Screen name="Asistente" component={AsistenteStack} />
        <Tab.Screen name="Points" component={PointsStack} options={{ tabBarLabel: 'Points' }} />
        <Tab.Screen name="Perfil" component={PerfilStack} />
      </Tab.Navigator>
    </CartProvider>
  );
}
