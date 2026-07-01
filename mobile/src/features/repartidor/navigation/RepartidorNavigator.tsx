import { createBottomTabNavigator, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute, type RouteProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import { Icon, type IconName } from '@/components';
import { RepartidorProvider } from '../state/RepartidorContext';
import {
  ActivaScreen,
  ConfirmarEntregaScreen,
  DisponiblesScreen,
  MisEntregasScreen,
  PerfilScreen,
  QueuePointsScreen,
} from '../screens';

// Tabs del repartidor; cada una es su propio stack para poder empujar pantallas de
// detalle (ej. el escáner de QR dentro de la entrega activa).
type RepartidorTabParamList = {
  Disponibles: undefined;
  Activa: undefined;
  Entregas: undefined;
  Points: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<RepartidorTabParamList>();
const Stack = createNativeStackNavigator();

function DisponiblesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DisponiblesHome" component={DisponiblesScreen} />
    </Stack.Navigator>
  );
}

function ActivaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ActivaHome" component={ActivaScreen} />
      <Stack.Screen name="ConfirmarEntrega" component={ConfirmarEntregaScreen} />
    </Stack.Navigator>
  );
}

function EntregasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntregasHome" component={MisEntregasScreen} />
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

function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilHome" component={PerfilScreen} />
    </Stack.Navigator>
  );
}

const TAB_ICONS: Record<keyof RepartidorTabParamList, IconName> = {
  Disponibles: 'list',
  Activa: 'bike',
  Entregas: 'receipt',
  Points: 'bolt',
  Perfil: 'userRound',
};

export function RepartidorNavigator() {
  const t = useTheme();

  return (
    <RepartidorProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: t.colors.brandStrong,
          tabBarInactiveTintColor: t.colors.textMuted,
          tabBarStyle: { backgroundColor: t.colors.bgSurface, borderTopColor: t.colors.borderDefault, borderTopWidth: 1 },
          tabBarLabelStyle: { fontFamily: t.fontFamily.medium, fontSize: 11 },
          tabBarIcon: ({ color }) => <Icon name={TAB_ICONS[route.name]} size={22} color={color} />,
        })}
      >
        <Tab.Screen name="Disponibles" component={DisponiblesStack} />
        <Tab.Screen name="Activa" component={ActivaStack} options={ocultarTabBarEnEscaner} />
        <Tab.Screen name="Entregas" component={EntregasStack} />
        <Tab.Screen name="Points" component={PointsStack} />
        <Tab.Screen name="Perfil" component={PerfilStack} />
      </Tab.Navigator>
    </RepartidorProvider>
  );
}

// El escáner de QR va a pantalla completa: cuando la pila de la entrega activa está
// en esa pantalla, escondemos la barra de tabs.
function ocultarTabBarEnEscaner({ route }: { route: RouteProp<RepartidorTabParamList, 'Activa'> }): BottomTabNavigationOptions {
  const focused = getFocusedRouteNameFromRoute(route) ?? 'ActivaHome';
  if (focused === 'ConfirmarEntrega') return { tabBarStyle: { display: 'none' } };
  return {};
}
