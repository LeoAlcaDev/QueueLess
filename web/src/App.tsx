import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth';
import { ThemeProvider } from '@/context/ThemeContext';
import { ErrorBoundary, ToastProvider } from '@/components/feedback';
import { router } from '@/routes';

// Arbol de providers de la app. El ErrorBoundary envuelve todo para que un fallo de render
// no deje la pantalla en blanco; debajo van tema, sesion, toasts y el router.
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
