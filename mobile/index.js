// Punto de entrada explícito. Con pnpm (node-linker=hoisted) el AppEntry por
// defecto de Expo resuelve mal el App por su ruta relativa hacia el store .pnpm,
// así que registramos la app desde la raíz del proyecto.
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
