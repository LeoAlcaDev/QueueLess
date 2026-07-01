import { Component, type ReactNode } from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/components/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Atrapa errores de render de su subárbol y muestra una salida amable con reintento,
// en vez de tumbar toda la app.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // mandamos el error y el árbol donde ocurrió a la consola para ubicar la
    // pantalla que falló; al usuario igual le mostramos la salida amable de abajo
    console.error('El ErrorBoundary atrapó un error de render:', error?.message, info?.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="alertTriangle"
            title="Algo salió mal"
            message="Ocurrió un error inesperado. Intenta de nuevo."
            action={{ label: 'Reintentar', onPress: this.reset }}
          />
        </View>
      );
    }
    return this.props.children;
  }
}
