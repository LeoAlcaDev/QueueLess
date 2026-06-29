import { useState } from "react";
import { Moon, Sun, Trash2, Inbox } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  OrderStatusBadge,
  ORDER_STATES,
  PickupDeliveryToggle,
  QueuePointsBadge,
  Skeleton,
  Spinner,
  WaitTimeBadge,
  useToast,
  type EstadoPedido,
  type TipoEntrega,
} from "@/components/ui";
import { useTheme } from "@/theme/ThemeContext";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3 font-semibold text-content">{title}</h2>
      {children}
    </section>
  );
}

/** Página demo de Etapa 0: muestra los primitivos del design system en light/dark. */
export default function DesignDemo() {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [tipo, setTipo] = useState<TipoEntrega>("PICKUP");
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page text-content">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/queueless-mark.svg" alt="" className="h-7 w-7" />
          <span className="text-h3 font-bold">QueueLess · UI kit</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          onClick={toggleTheme}
        >
          {theme === "dark" ? "Claro" : "Oscuro"}
        </Button>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-10 p-4 py-8">
        <Section title="Botones">
          <div className="flex flex-wrap gap-3">
            <Button>Acción primaria</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive" leftIcon={<Trash2 size={16} />}>
              Eliminar
            </Button>
            <Button variant="points">Canjear puntos</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeño</Button>
            <Button loading>Cargando</Button>
            <Button disabled>Deshabilitado</Button>
            <Spinner />
          </div>
          <Button full>Ancho completo</Button>
        </Section>

        <Section title="Campos">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Correo"
              placeholder="tu@utec.edu.pe"
              hint="Usa tu correo institucional."
            />
            <Input
              label="Contraseña"
              type="password"
              error="Credenciales inválidas"
            />
          </div>
        </Section>

        <Section title="Estados de pedido (11)">
          <Card className="flex flex-wrap gap-2">
            {(Object.keys(ORDER_STATES) as EstadoPedido[]).map((s) => (
              <OrderStatusBadge key={s} state={s} />
            ))}
          </Card>
        </Section>

        <Section title="Badges y tiempos">
          <div className="flex flex-wrap items-center gap-2">
            <WaitTimeBadge minutes={3} />
            <WaitTimeBadge minutes={12} />
            <WaitTimeBadge minutes={25} />
            <QueuePointsBadge amount={50} />
            <Badge tone="brand">Abierto</Badge>
            <Badge tone="info">Programado</Badge>
          </div>
          <QueuePointsBadge amount={320} prefix="" size="lg" />
        </Section>

        <Section title="Tipo de entrega">
          <PickupDeliveryToggle value={tipo} onChange={setTipo} />
        </Section>

        <Section title="Toasts y modal">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => toast.success("Pedido creado")}
            >
              Toast éxito
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.error("No se pudo procesar el pago")}
            >
              Toast error
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info("Buscando repartidor…")}
            >
              Toast info
            </Button>
            <Button onClick={() => setOpen(true)}>Abrir modal</Button>
          </div>
        </Section>

        <Section title="Carga y vacío">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
            <Card flush>
              <EmptyState
                icon={Inbox}
                title="Sin pedidos todavía"
                description="Cuando hagas tu primer pedido aparecerá aquí."
                action={<Button size="sm">Explorar locales</Button>}
              />
            </Card>
          </div>
        </Section>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirmar acción"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setOpen(false)}>Confirmar</Button>
          </div>
        }
      >
        <p className="text-body text-content-secondary">
          Este es un modal responsive: se ancla abajo como sheet en móvil y se
          centra en escritorio.
        </p>
      </Modal>
    </div>
  );
}
