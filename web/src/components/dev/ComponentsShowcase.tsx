import { useState, type ReactNode } from 'react';
import { http, endpoints, type ApiError } from '@/api';
import { useApi, useToast } from '@/hooks';
import { useTheme } from '@/context/ThemeContext';
import { Logo } from '@/components/layout';
import type { EstadoPedido } from '@/types/enums';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Chip,
  ChipMultiSelect,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Pagination,
  Price,
  QueuePointsBadge,
  SearchBar,
  Segmented,
  Select,
  Skeleton,
  StateBanner,
  StatusPill,
  Stars,
  Stepper,
  Tabs,
  TextArea,
  Toggle,
  WaitTimeBadge,
} from '@/components/ui';

// Catalogo visual de la libreria, solo en dev. Sirve para revisar de un vistazo que todas
// las piezas se ven bien en claro y oscuro, y que la capa de API conecta con el backend.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="ql-section-label">{title}</h2>
      <Card className="flex flex-wrap items-center gap-3">{children}</Card>
    </section>
  );
}

const ALL_STATES: EstadoPedido[] = [
  'PENDIENTE_PAGO',
  'PAGADO_BUSCANDO_REPARTIDOR',
  'PAGADO_ESPERANDO_COMERCIO',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_RECOGER',
  'LISTO_PARA_DELIVERY',
  'ENTREGADO',
  'CANCELADO_POR_CLIENTE',
  'CANCELADO_POR_COMERCIO',
  'EXPIRADO',
];

function ApiSmoke() {
  const { data, loading, error } = useApi<unknown[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );
  if (loading) return <Skeleton width={220} height={20} />;
  if (error) {
    const e = error as ApiError;
    return (
      <StateBanner tone="error" title={`Error ${e.status || ''} (${e.kind})`}>
        {e.message}
      </StateBanner>
    );
  }
  return (
    <StateBanner tone="success" title="Capa de API conectada">
      GET /puntos-de-venta devolvió {data?.length ?? 0} locales.
    </StateBanner>
  );
}

export default function ComponentsShowcase() {
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('PICKUP');
  const [qty, setQty] = useState(1);
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [allergens, setAllergens] = useState<string[]>(['MANI']);
  const [tab, setTab] = useState('uno');
  const [rating, setRating] = useState(4);
  const [page, setPage] = useState(2);
  const [size, setSize] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-4">
        <Logo size={26} />
        <div className="flex items-center gap-3">
          <span className="text-small text-ink-muted">Catálogo de componentes (dev)</span>
          <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label="Cambiar tema" onClick={toggle} />
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
        <ApiSmoke />

        <Section title="Botones">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="destructive">Destructivo</Button>
          <Button variant="ghost">Ghost</Button>
          <Button icon="plus">Con ícono</Button>
          <Button loading>Cargando</Button>
          <Button disabled>Deshabilitado</Button>
          <Button size="sm">Pequeño</Button>
        </Section>

        <Section title="Formulario">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <Field label="Correo UTEC" placeholder="usuario@utec.edu.pe" hint="institucional" />
            <Field label="Contraseña" type="password" placeholder="Tu contraseña" />
            <Field label="Con error" defaultValue="abc" error="Ingresa un correo válido" />
            <Select
              label="Zona de entrega"
              placeholder="Elige una zona"
              options={['Biblioteca', 'Patios centrales', 'Aulas Bloque A']}
            />
            <TextArea label="Comentario" placeholder="Cuéntanos qué tal estuvo" />
            <div className="flex flex-col gap-3">
              <Checkbox checked={checked} onChange={setChecked} label="Acepto los términos" />
              <Toggle checked={enabled} onChange={setEnabled} label="Disponible" sub="Recibe pedidos" />
            </div>
          </div>
        </Section>

        <Section title="Controles">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar locales" className="w-full sm:w-80" />
          <Segmented
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'PICKUP', label: 'Recojo' },
              { value: 'DELIVERY', label: 'Delivery' },
            ]}
          />
          <Stepper value={qty} onChange={setQty} min={1} />
          <ChipMultiSelect
            options={[
              { value: 'MANI', label: 'Maní' },
              { value: 'GLUTEN', label: 'Gluten' },
              { value: 'LACTEOS', label: 'Lácteos' },
            ]}
            value={allergens}
            onChange={setAllergens}
          />
          <Stars value={rating} onChange={setRating} size={22} />
        </Section>

        <Section title="Estados del pedido">
          {ALL_STATES.map((estado) => (
            <StatusPill key={estado} estado={estado} />
          ))}
        </Section>

        <Section title="Badges y chips">
          <WaitTimeBadge minutes={3} />
          <WaitTimeBadge minutes={9} />
          <WaitTimeBadge minutes={22} />
          <QueuePointsBadge points={250} />
          <QueuePointsBadge points={250} variant="text" />
          <Chip tone="brand" icon="store">
            Café del Bloque A
          </Chip>
          <Chip tone="success" icon="leaf">
            Apto vegano
          </Chip>
          <Chip tone="warning" icon="alertTriangle">
            Contiene: Maní
          </Chip>
          <Avatar initials="CR" />
          <Price amount={21.5} />
        </Section>

        <Section title="Tabs">
          <Tabs
            tabs={[
              { key: 'uno', label: 'Activos', count: 3 },
              { key: 'dos', label: 'Entregados', count: 12 },
              { key: 'tres', label: 'Cancelados' },
            ]}
            active={tab}
            onChange={setTab}
            className="w-full"
          />
        </Section>

        <Section title="Avisos y vacíos">
          <div className="grid w-full gap-3">
            <StateBanner tone="info" title="Información">Un dato útil sobre esta pantalla.</StateBanner>
            <StateBanner tone="warning" title="Atención">Revisa esto antes de continuar.</StateBanner>
            <StateBanner tone="error" title="Algo falló">No pudimos completar la operación.</StateBanner>
            <EmptyState
              icon="receipt"
              title="Aún no tienes pedidos"
              description="Cuando hagas tu primer pedido, aparecerá aquí."
              action={<Button icon="store">Explorar locales</Button>}
              compact
            />
          </div>
        </Section>

        <Section title="Carga (skeletons)">
          <div className="grid w-full gap-2">
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" />
            <Skeleton width={120} height={28} rounded="rounded-pill" />
          </div>
        </Section>

        <Section title="Toasts y diálogos">
          <Button onClick={() => toast.success('Pedido creado con éxito')}>Toast éxito</Button>
          <Button variant="secondary" onClick={() => toast.error('No se pudo conectar')}>
            Toast error
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Buscando repartidor…')}>
            Toast info
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Abrir confirmación
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              toast.success('Pedido cancelado');
            }}
            title="¿Cancelar el pedido?"
            description="Esta acción no se puede deshacer."
            confirmLabel="Sí, cancelar"
            destructive
          />
        </Section>

        <Section title="Paginación">
          <Pagination
            page={page}
            size={size}
            total={137}
            onPage={setPage}
            onSize={(s) => {
              setSize(s);
              setPage(1);
            }}
            className="w-full"
          />
        </Section>
      </div>
    </div>
  );
}
