import { useEffect, useState } from 'react';
import { useAuth } from '@/auth';
import { endpoints, http } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { cn } from '@/lib/cn';
import { usePageChrome } from '@/components/layout';
import { Avatar, Card, EmptyState, Icon, Skeleton, StateBanner, Stars, Toggle } from '@/components/ui';
import type { PerfilRepartidorResponse, PerfilesResponse } from '@/types';
import { ErrorState, useToastOnError } from '../components';

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}

// Perfil del repartidor: calificacion, entregas hechas y el interruptor de disponibilidad.
// Al activarlo o apagarlo se guarda en el backend y reflejamos el valor que este devuelve.
export default function Profile() {
  usePageChrome('Perfil de repartidor', {
    sub: 'Tu disponibilidad y desempeño como repartidor',
    maxWidth: 520,
  });
  const toast = useToast();
  const { user } = useAuth();

  const { data, loading, error, refetch } = useApi<PerfilesResponse>(
    (signal) => http.get<PerfilesResponse>(endpoints.perfiles.base, { signal }),
    [],
  );

  const repartidor = data?.repartidor ?? null;
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    if (repartidor) setDisponible(repartidor.disponible);
  }, [repartidor]);

  const guardar = useAsyncAction((next: boolean) =>
    http.put<PerfilRepartidorResponse>(endpoints.perfiles.repartidor, { disponible: next }),
  );

  useToastOnError(guardar.error);

  const onToggle = (next: boolean) => {
    guardar.run(next).then((result) => {
      if (result) {
        setDisponible(result.disponible);
        toast.success(
          result.disponible ? 'Estás disponible para entregas.' : 'Ya no recibirás solicitudes.',
        );
      }
    });
  };

  if (loading) {
    return (
      <Card className="flex flex-col gap-4">
        <Skeleton width="50%" height={20} />
        <Skeleton width="35%" />
        <Skeleton height={44} rounded="rounded-input" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!repartidor) {
    return <EmptyState icon="bike" title="No tienes perfil de repartidor" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <Avatar initials={user ? iniciales(user.nombreCompleto) : 'R'} size={64} />
        <div className="min-w-0">
          <div className="truncate text-h3 font-bold text-ink">{user?.nombreCompleto ?? 'Repartidor'}</div>
          <div className="text-small text-ink-muted">Repartidor · UTEC</div>
        </div>
      </div>

      <Card className={cn('flex flex-col gap-3', disponible && 'border-success-dot bg-success-bg')}>
        <Toggle
          checked={disponible}
          onChange={onToggle}
          disabled={guardar.loading}
          label={disponible ? 'Disponible para entregas' : 'No disponible'}
          sub={disponible ? 'Recibirás solicitudes cercanas' : 'Actívate para recibir solicitudes'}
        />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col gap-1.5">
          <div className="ql-section-label">Calificación</div>
          {repartidor.calificacionPromedio != null ? (
            <div className="flex items-center gap-2">
              <span className="text-h2 font-bold tabular-nums text-ink">
                {repartidor.calificacionPromedio.toFixed(1)}
              </span>
              <Stars value={Math.round(repartidor.calificacionPromedio)} size={18} />
            </div>
          ) : (
            <p className="text-small text-ink-soft">Sin calificaciones aún</p>
          )}
        </Card>
        <Card className="flex flex-col gap-1.5">
          <div className="ql-section-label">Entregas</div>
          <div className="flex items-center gap-2">
            <Icon name="bike" size={20} className="text-brand" />
            <span className="text-h2 font-bold tabular-nums text-ink">{repartidor.totalEntregas}</span>
          </div>
        </Card>
      </div>

      <StateBanner tone="info">
        Tu calificación y total de entregas se actualizan solos con cada entrega completada.
      </StateBanner>
    </div>
  );
}
