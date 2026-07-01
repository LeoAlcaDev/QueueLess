import { type ReactNode } from 'react';
import { PublicHeader, PUBLIC_CONTENT_MAX_WIDTH } from './PublicHeader';

// Cascarón de las pantallas públicas: monta la barra superior propia y centra el contenido.
// Cumple el papel del AppShell, que aquí no aplica porque no hay sesión ni navegación por rol.
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <PublicHeader />
      <main
        className="mx-auto max-w-6xl px-4 py-7 lg:px-8"
        style={{ maxWidth: PUBLIC_CONTENT_MAX_WIDTH }}
      >
        {children}
      </main>
    </div>
  );
}
