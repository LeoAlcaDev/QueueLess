import { useState } from "react";
import {
  BarChart3,
  MapPin,
  Pencil,
  Plus,
  Store,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { localesApi } from "@/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useFetch } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import type { PuntoDeVentaResponse } from "@/types";
import { LocalFormModal } from "../components/LocalFormModal";
import { OcupacionModal } from "../components/OcupacionModal";

/** Gestión de locales del comercio: alta/edición, abrir/cerrar, ocupación y baja. */
export default function LocalesPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(() =>
    localesApi.listMisLocales(),
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<PuntoDeVentaResponse | null>(null);
  const [ocupacionDe, setOcupacionDe] = useState<PuntoDeVentaResponse | null>(
    null,
  );
  const [eliminar, setEliminar] = useState<PuntoDeVentaResponse | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggleEstado(local: PuntoDeVentaResponse) {
    setBusyId(local.id);
    try {
      await localesApi.cambiarEstadoLocal(local.id, {
        abierto: !local.abierto,
      });
      toast.success(local.abierto ? "Local cerrado." : "Local abierto.");
      refetch();
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarEliminar() {
    if (!eliminar) return;
    setBusyId(eliminar.id);
    try {
      await localesApi.eliminarLocal(eliminar.id);
      toast.success("Local eliminado.");
      setEliminar(null);
      refetch();
    } catch (err) {
      // 409 si tiene dependencias (pedidos/productos asociados).
      toast.error(userFacingMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setFormOpen(true);
  }

  function abrirEditar(local: PuntoDeVentaResponse) {
    setEditando(local);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h1 font-bold text-content">Mis locales</h2>
        <Button size="sm" leftIcon={<Plus size={16} />} onClick={abrirNuevo}>
          Nuevo local
        </Button>
      </header>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-card" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar tus locales"
          description={userFacingMessage(error)}
          action={
            <Button variant="secondary" size="sm" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Store}
          title="No tienes locales"
          description="Crea tu primer local para empezar a recibir pedidos."
          action={
            <Button size="sm" onClick={abrirNuevo}>
              Crear local
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data!.map((local) => (
            <Card key={local.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="text-h3 font-semibold text-content">
                    {local.nombre}
                  </h3>
                  <p className="inline-flex items-center gap-1 text-small text-content-secondary">
                    <MapPin size={13} aria-hidden="true" />
                    {local.ubicacion}
                  </p>
                </div>
                <Badge tone={local.abierto ? "success" : "neutral"}>
                  {local.abierto ? "Abierto" : "Cerrado"}
                </Badge>
              </div>

              {(local.horarioApertura || local.horarioCierre) && (
                <p className="text-small text-content-muted">
                  Horario: {local.horarioApertura?.slice(0, 5) ?? "—"} a{" "}
                  {local.horarioCierre?.slice(0, 5) ?? "—"}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busyId === local.id}
                  onClick={() => toggleEstado(local)}
                >
                  {local.abierto ? "Cerrar" : "Abrir"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<BarChart3 size={16} />}
                  onClick={() => setOcupacionDe(local)}
                >
                  Ocupación
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Pencil size={16} />}
                  onClick={() => abrirEditar(local)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 size={16} />}
                  onClick={() => setEliminar(local)}
                  className="text-error-fg"
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <LocalFormModal
        key={`${editando?.id ?? "nuevo"}-${formOpen}`}
        open={formOpen}
        local={editando}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          refetch();
        }}
      />

      {ocupacionDe && (
        <OcupacionModal
          puntoDeVentaId={ocupacionDe.id}
          nombre={ocupacionDe.nombre}
          open
          onClose={() => setOcupacionDe(null)}
        />
      )}

      <Modal
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        title="Eliminar local"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEliminar(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              loading={busyId === eliminar?.id}
              onClick={confirmarEliminar}
            >
              Sí, eliminar
            </Button>
          </div>
        }
      >
        <p className="text-body text-content-secondary">
          ¿Seguro que quieres eliminar{" "}
          <span className="font-semibold text-content">{eliminar?.nombre}</span>
          ? No se puede si tiene pedidos o productos asociados.
        </p>
      </Modal>
    </div>
  );
}
