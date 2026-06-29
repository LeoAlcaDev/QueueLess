import { useRef, useState } from "react";
import {
  ImagePlus,
  Pencil,
  Plus,
  Store,
  Trash2,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";
import { localesApi, productosApi } from "@/api";
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
import { formatSoles } from "@/lib/format";
import type { ProductoResponse, PuntoDeVentaResponse } from "@/types";
import { ProductoFormModal } from "../components/ProductoFormModal";

/** Gestión de productos: se elige un local y se administra su catálogo. */
export default function ProductosPage() {
  const locales = useFetch(() => localesApi.listMisLocales());
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const lista = locales.data ?? [];
  // Local elegido: el del estado, o el primero por defecto.
  const localId = selectedId ?? lista[0]?.id ?? null;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-h1 font-bold text-content">Productos</h2>

      {locales.loading ? (
        <Skeleton className="h-12 w-full rounded-input" />
      ) : locales.error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar tus locales"
          description={userFacingMessage(locales.error)}
          action={
            <Button variant="secondary" size="sm" onClick={locales.refetch}>
              Reintentar
            </Button>
          }
        />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Primero crea un local"
          description="Los productos pertenecen a un local. Crea uno en la sección Locales."
        />
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="local-select"
              className="text-small font-medium text-content-secondary"
            >
              Local
            </label>
            <select
              id="local-select"
              value={localId ?? ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="h-12 w-full max-w-sm rounded-input border border-line bg-surface px-3 text-body text-content focus-visible:shadow-focus focus-visible:outline-none"
            >
              {lista.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>

          {localId != null && (
            <ProductosLista
              key={localId}
              local={lista.find((l) => l.id === localId)!}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Catálogo de un local con CRUD, disponibilidad y foto. */
function ProductosLista({ local }: { local: PuntoDeVentaResponse }) {
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(
    () => productosApi.listProductos(local.id),
    [local.id],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ProductoResponse | null>(null);
  const [eliminar, setEliminar] = useState<ProductoResponse | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggleDisponible(p: ProductoResponse) {
    setBusyId(p.id);
    try {
      await productosApi.cambiarDisponibilidad(p.id, {
        disponible: !p.disponible,
      });
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
      await productosApi.eliminarProducto(eliminar.id);
      toast.success("Producto eliminado.");
      setEliminar(null);
      refetch();
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setFormOpen(true);
  }

  function abrirEditar(p: ProductoResponse) {
    setEditando(p);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-h3 font-semibold text-content">
          {data
            ? `${data.length} ${data.length === 1 ? "producto" : "productos"}`
            : "Catálogo"}
        </h3>
        <Button size="sm" leftIcon={<Plus size={16} />} onClick={abrirNuevo}>
          Nuevo producto
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar el catálogo"
          description={userFacingMessage(error)}
          action={
            <Button variant="secondary" size="sm" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Este local no tiene productos"
          description="Agrega tu primer producto al catálogo."
          action={
            <Button size="sm" onClick={abrirNuevo}>
              Agregar producto
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data!.map((p) => (
            <ProductoRow
              key={p.id}
              producto={p}
              busy={busyId === p.id}
              onToggle={() => toggleDisponible(p)}
              onEdit={() => abrirEditar(p)}
              onDelete={() => setEliminar(p)}
              onPhoto={refetch}
            />
          ))}
        </div>
      )}

      <ProductoFormModal
        key={`${editando?.id ?? "nuevo"}-${formOpen}`}
        open={formOpen}
        puntoDeVentaId={local.id}
        producto={editando}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          refetch();
        }}
      />

      <Modal
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        title="Eliminar producto"
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
          ?
        </p>
      </Modal>
    </div>
  );
}

const FOTO_MAX_BYTES = 2 * 1024 * 1024;
const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"];

function ProductoRow({
  producto,
  busy,
  onToggle,
  onEdit,
  onDelete,
  onPhoto,
}: {
  producto: ProductoResponse;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPhoto: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-subir el mismo archivo
    if (!file) return;
    if (!FOTO_TIPOS.includes(file.type)) {
      toast.error("La foto debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > FOTO_MAX_BYTES) {
      toast.error("La foto no puede superar los 2 MB.");
      return;
    }
    setSubiendo(true);
    try {
      await productosApi.subirFoto(producto.id, file);
      toast.success("Foto actualizada.");
      onPhoto();
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <Card className="flex gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-card bg-surface-muted">
        {producto.fotoUrl ? (
          <img
            src={producto.fotoUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImagePlus
            size={22}
            className="text-content-muted"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body font-semibold text-content">
              {producto.nombre}
            </span>
            {producto.categoria && (
              <span className="text-small text-content-muted">
                {producto.categoria}
              </span>
            )}
          </div>
          <span className="shrink-0 text-body font-semibold text-content">
            {formatSoles(producto.precio)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={producto.disponible ? "success" : "neutral"}>
            {producto.disponible ? "Disponible" : "Oculto"}
          </Badge>
          {producto.disponible && producto.disponibleAhora === false && (
            <Badge tone="warning">
              {producto.razonNoDisponible ?? "Fuera de horario"}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={onToggle}
          >
            {producto.disponible ? "Ocultar" : "Mostrar"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ImagePlus size={16} />}
            loading={subiendo}
            onClick={() => fileRef.current?.click()}
          >
            Foto
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil size={16} />}
            onClick={onEdit}
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 size={16} />}
            onClick={onDelete}
            className="text-error-fg"
          >
            Eliminar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFile}
            className="hidden"
          />
        </div>
      </div>
    </Card>
  );
}
