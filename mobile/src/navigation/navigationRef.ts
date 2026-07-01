import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// referencia al contenedor para resetear navegación fuera de React (ej. cuando el
// interceptor cierra la sesión por un refresh fallido)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
