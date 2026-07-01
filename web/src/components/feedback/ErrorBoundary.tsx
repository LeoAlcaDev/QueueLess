import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Atrapa errores de render de su subarbol para que un fallo en una pantalla no tumbe toda
// la app. Es un class component porque los error boundaries todavia van asi en React.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // en dev queda en consola; en prod aca engancharia un servicio de logs
    console.error('Error no controlado en la UI:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <span
          className="grid place-items-center rounded-pill bg-error-bg text-error-fg"
          style={{ width: 72, height: 72 }}
        >
          <Icon name="alertTriangle" size={32} />
        </span>
        <div className="text-h2 font-bold text-ink">Algo se rompió</div>
        <p className="max-w-sm text-small text-ink-soft">
          Tuvimos un problema al mostrar esta parte. Puedes recargar la página para volver a intentarlo.
        </p>
        <Button icon="refresh" onClick={this.handleReload}>
          Recargar
        </Button>
      </div>
    );
  }
}
