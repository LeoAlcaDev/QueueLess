import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Icon, type IconName } from '@/components';
import {
  CerrarEntregaScreen,
  ColaScreen,
  ComercioPerfilScreen,
  EscanearScreen,
  OcupacionScreen,
  PdvEditorScreen,
  ProductoEditorScreen,
  ProductosScreen,
  PuntosDeVentaScreen,
  ReclamosComercioScreen,
  VendorPedidoDetalleScreen,
} from '../screens';
import type {
  ColaStackParamList,
  ComercioPerfilStackParamList,
  LocalesStackParamList,
  OcupacionStackParamList,
  ProductosStackParamList,
} from './types';

const ColaStack = createNativeStackNavigator<ColaStackParamList>();
function ColaNavigator() {
  return (
    <ColaStack.Navigator screenOptions={{ headerShown: false }}>
      <ColaStack.Screen name="Cola" component={ColaScreen} />
      <ColaStack.Screen name="PedidoDetalle" component={VendorPedidoDetalleScreen} />
      <ColaStack.Screen name="CerrarEntrega" component={CerrarEntregaScreen} />
      <ColaStack.Screen name="Escanear" component={EscanearScreen} />
    </ColaStack.Navigator>
  );
}

const ProductosStack = createNativeStackNavigator<ProductosStackParamList>();
function ProductosNavigator() {
  return (
    <ProductosStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductosStack.Screen name="Productos" component={ProductosScreen} />
      <ProductosStack.Screen name="ProductoEditor" component={ProductoEditorScreen} />
    </ProductosStack.Navigator>
  );
}

const LocalesStack = createNativeStackNavigator<LocalesStackParamList>();
function LocalesNavigator() {
  return (
    <LocalesStack.Navigator screenOptions={{ headerShown: false }}>
      <LocalesStack.Screen name="PuntosDeVenta" component={PuntosDeVentaScreen} />
      <LocalesStack.Screen name="PdvEditor" component={PdvEditorScreen} />
    </LocalesStack.Navigator>
  );
}

const OcupacionStack = createNativeStackNavigator<OcupacionStackParamList>();
function OcupacionNavigator() {
  return (
    <OcupacionStack.Navigator screenOptions={{ headerShown: false }}>
      <OcupacionStack.Screen name="Ocupacion" component={OcupacionScreen} />
    </OcupacionStack.Navigator>
  );
}

const PerfilStack = createNativeStackNavigator<ComercioPerfilStackParamList>();
function PerfilNavigator() {
  return (
    <PerfilStack.Navigator screenOptions={{ headerShown: false }}>
      <PerfilStack.Screen name="ComercioPerfil" component={ComercioPerfilScreen} />
      <PerfilStack.Screen name="ReclamosComercio" component={ReclamosComercioScreen} />
    </PerfilStack.Navigator>
  );
}

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: string; size: number }) {
    return <Icon name={name} size={size} color={color} />;
  };
}

const Tab = createBottomTabNavigator();

// Tabs del comercio. La barra se oculta en el escáner a pantalla completa (cámara),
// el resto del tiempo queda fija con su estilo de marca.
export function ComercioNavigator() {
  const t = useTheme();

  const baseTabBarStyle: ViewStyle = {
    backgroundColor: t.colors.bgSurface,
    borderTopColor: t.colors.borderDefault,
    borderTopWidth: 1,
    paddingTop: 6,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.textBrand,
        tabBarInactiveTintColor: t.colors.textMuted,
        tabBarStyle: baseTabBarStyle,
        tabBarLabelStyle: { fontFamily: t.fontFamily.medium, fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="ColaTab"
        component={ColaNavigator}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'Cola';
          return {
            tabBarLabel: 'Cola',
            tabBarIcon: tabIcon('layoutGrid'),
            tabBarStyle: focused === 'Escanear' ? { display: 'none' } : baseTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="ProductosTab"
        component={ProductosNavigator}
        options={{ tabBarLabel: 'Productos', tabBarIcon: tabIcon('tag') }}
      />
      <Tab.Screen
        name="LocalesTab"
        component={LocalesNavigator}
        options={{ tabBarLabel: 'Locales', tabBarIcon: tabIcon('store') }}
      />
      <Tab.Screen
        name="OcupacionTab"
        component={OcupacionNavigator}
        options={{ tabBarLabel: 'Ocupación', tabBarIcon: tabIcon('trendUp') }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilNavigator}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: tabIcon('userRound') }}
      />
    </Tab.Navigator>
  );
}
