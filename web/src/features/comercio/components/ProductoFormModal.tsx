import { useState, type FormEvent } from "react";
import { productosApi } from "@/api";
import { Button, Input, Modal, useToast } from "@/components/ui";
import { ChipMultiSelect } from "@/features/cuenta/components/ChipMultiSelect";
import { cn } from "@/lib/cn";
import { fieldErrorMap, isApiError, userFacingMessage } from "@/lib/errors";
import { humanizeEnum } from "@/lib/labels";
import {
  ALERGENOS,
  APTITUDES_DIETETICAS,
  TIPOS_PREPARACION,
  TOLERANCIAS_PICANTE,
  type Alergeno,
  type AptitudDietetica,
  type ProductoResponse,
  type TipoPreparacion,
  type ToleranciaPicante,
} from "@/types";

interface ProductoFormModalProps {
  open: boolean;
  onClose: () => void;
  puntoDeVentaId: number;
  /** Si viene, es edición; si no, alta. */
  producto?: ProductoResponse | null;
  onSaved: () => void;
}

const hhmm = (v: string | null | undefined) => (v ?? "").slice(0, 5);

/** Alta/edición de un producto (POST/PUT /comercio/productos). */
export function ProductoFormModal({
  open,
  onClose,
  puntoDeVentaId,
  producto,
  onSaved,
}: ProductoFormModalProps) {
  const toast = useToast();
  const editando = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [precio, setPrecio] = useState(
    producto?.precio != null ? String(producto.precio) : "",
  );
  const [categoria, setCategoria] = useState(producto?.categoria ?? "");
  const [tipoPreparacion, setTipoPreparacion] = useState<TipoPreparacion>(
    producto?.tipoPreparacion ?? "PREPARADO",
  );
  const [alergenos, setAlergenos] = useState<Alergeno[]>(
    producto?.alergenos ?? [],
  );
  const [aptitudes, setAptitudes] = useState<AptitudDietetica[]>(
    producto?.aptitudesDieteticas ?? [],
  );
  const [nivelPicante, setNivelPicante] = useState<ToleranciaPicante | "">(
    producto?.nivelPicante ?? "",
  );

  const [servicioInicio, setServicioInicio] = useState(
    hhmm(producto?.horarioServicioInicio),
  );
  const [servicioFin, setServicioFin] = useState(
    hhmm(producto?.horarioServicioFin),
  );
  const [tieneVentana, setTieneVentana] = useState(
    producto?.tieneVentanaDePedido ?? false,
  );
  const [pedidoInicio, setPedidoInicio] = useState(
    hhmm(producto?.ventanaPedidoInicio),
  );
  const [pedidoFin, setPedidoFin] = useState(hhmm(producto?.ventanaPedidoFin));
  const [recojoInicio, setRecojoInicio] = useState(
    hhmm(producto?.ventanaRecojoInicio),
  );
  const [recojoFin, setRecojoFin] = useState(hhmm(producto?.ventanaRecojoFin));
  const [vigenciaInicio, setVigenciaInicio] = useState(
    producto?.vigenciaInicio ?? "",
  );
  const [vigenciaFin, setVigenciaFin] = useState(producto?.vigenciaFin ?? "");
  const [aceptaProgramado, setAceptaProgramado] = useState(
    producto?.aceptaProgramado ?? false,
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const precioNum = Number(precio);
    if (!nombre.trim() || !precio || precioNum <= 0) {
      setFieldErrors({
        ...(nombre.trim() ? {} : { nombre: "Ingresa el nombre del producto." }),
        ...(precio && precioNum > 0
          ? {}
          : { precio: "Ingresa un precio válido." }),
      });
      return;
    }

    const base = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      precio: precioNum,
      categoria: categoria.trim() || undefined,
      tipoPreparacion,
      alergenos: alergenos.length ? alergenos : undefined,
      aptitudesDieteticas: aptitudes.length ? aptitudes : undefined,
      nivelPicante: nivelPicante || undefined,
      horarioServicioInicio: servicioInicio || undefined,
      horarioServicioFin: servicioFin || undefined,
      tieneVentanaDePedido: tieneVentana || undefined,
      ventanaPedidoInicio: tieneVentana ? pedidoInicio || undefined : undefined,
      ventanaPedidoFin: tieneVentana ? pedidoFin || undefined : undefined,
      ventanaRecojoInicio: tieneVentana ? recojoInicio || undefined : undefined,
      ventanaRecojoFin: tieneVentana ? recojoFin || undefined : undefined,
      vigenciaInicio: vigenciaInicio || undefined,
      vigenciaFin: vigenciaFin || undefined,
      aceptaProgramado: aceptaProgramado || undefined,
    };

    setSubmitting(true);
    try {
      if (producto) await productosApi.updateProducto(producto.id, base);
      else await productosApi.crearProducto({ puntoDeVentaId, ...base });
      toast.success(editando ? "Producto actualizado." : "Producto creado.");
      onSaved();
    } catch (err) {
      // 400 validación de campos · 422 reglas de horarios/ventanas/vigencia.
      if (isApiError(err) && err.status === 400)
        setFieldErrors(fieldErrorMap(err));
      else toast.error(userFacingMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? "Editar producto" : "Nuevo producto"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="producto-form" loading={submitting}>
            {editando ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      }
    >
      <form
        id="producto-form"
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          label="Nombre"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={fieldErrors.nombre}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Precio (S/)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.10"
            required
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            error={fieldErrors.precio}
          />
          <Input
            label="Categoría"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            error={fieldErrors.categoria}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="producto-desc"
            className="text-small font-medium text-content-secondary"
          >
            Descripción
          </label>
          <textarea
            id="producto-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className={cn(
              "w-full rounded-input border border-line bg-surface px-3.5 py-2.5 text-body text-content",
              "placeholder:text-content-muted focus-visible:shadow-focus focus-visible:outline-none",
            )}
            placeholder="Ingredientes, porción, etc."
          />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-small font-medium text-content-secondary">
            Tipo de preparación
          </legend>
          <div className="flex gap-1 rounded-pill bg-surface-muted p-1">
            {TIPOS_PREPARACION.map((tp) => (
              <button
                key={tp}
                type="button"
                aria-pressed={tipoPreparacion === tp}
                onClick={() => setTipoPreparacion(tp)}
                className={cn(
                  "flex-1 rounded-pill px-3 py-1.5 text-small font-semibold focus-visible:shadow-focus focus-visible:outline-none",
                  tipoPreparacion === tp
                    ? "bg-surface text-content-brand shadow-sm"
                    : "text-content-secondary hover:text-content",
                )}
              >
                {humanizeEnum(tp)}
              </button>
            ))}
          </div>
        </fieldset>

        <ChipMultiSelect
          label="Alérgenos"
          options={ALERGENOS}
          value={alergenos}
          onChange={setAlergenos}
          labelFor={humanizeEnum}
        />
        <ChipMultiSelect
          label="Aptitudes dietéticas"
          options={APTITUDES_DIETETICAS}
          value={aptitudes}
          onChange={setAptitudes}
          labelFor={humanizeEnum}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="producto-picante"
            className="text-small font-medium text-content-secondary"
          >
            Nivel de picante
          </label>
          <select
            id="producto-picante"
            value={nivelPicante}
            onChange={(e) =>
              setNivelPicante(e.target.value as ToleranciaPicante | "")
            }
            className="h-12 w-full rounded-input border border-line bg-surface px-3 text-body text-content focus-visible:shadow-focus focus-visible:outline-none"
          >
            <option value="">Sin especificar</option>
            {TOLERANCIAS_PICANTE.map((np) => (
              <option key={np} value={np}>
                {humanizeEnum(np)}
              </option>
            ))}
          </select>
        </div>

        <details className="rounded-card border border-line p-3">
          <summary className="cursor-pointer text-small font-medium text-content-secondary">
            Disponibilidad horaria (opcional)
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Servicio desde"
                type="time"
                value={servicioInicio}
                onChange={(e) => setServicioInicio(e.target.value)}
              />
              <Input
                label="Servicio hasta"
                type="time"
                value={servicioFin}
                onChange={(e) => setServicioFin(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2.5 text-body text-content">
              <input
                type="checkbox"
                checked={tieneVentana}
                onChange={(e) => setTieneVentana(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Tiene ventana de pedido y recojo
            </label>

            {tieneVentana && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Pedido desde"
                    type="time"
                    value={pedidoInicio}
                    onChange={(e) => setPedidoInicio(e.target.value)}
                  />
                  <Input
                    label="Pedido hasta"
                    type="time"
                    value={pedidoFin}
                    onChange={(e) => setPedidoFin(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Recojo desde"
                    type="time"
                    value={recojoInicio}
                    onChange={(e) => setRecojoInicio(e.target.value)}
                  />
                  <Input
                    label="Recojo hasta"
                    type="time"
                    value={recojoFin}
                    onChange={(e) => setRecojoFin(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Vigente desde"
                type="date"
                value={vigenciaInicio}
                onChange={(e) => setVigenciaInicio(e.target.value)}
              />
              <Input
                label="Vigente hasta"
                type="date"
                value={vigenciaFin}
                onChange={(e) => setVigenciaFin(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2.5 text-body text-content">
              <input
                type="checkbox"
                checked={aceptaProgramado}
                onChange={(e) => setAceptaProgramado(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Acepta pedidos programados
            </label>
          </div>
        </details>
      </form>
    </Modal>
  );
}
