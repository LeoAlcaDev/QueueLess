import { useState } from "react";
import { resenasApi } from "@/api";
import { Button, Card, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { Stars } from "./Stars";

interface ResenaFormProps {
  pedidoId: number;
  /** Tras reseñar (o si ya estaba reseñado) ocultamos el formulario. */
  onDone: () => void;
}

/** Dejar reseña del local (POST /cliente/pedidos/{id}/resenas). 422 si ya reseñó. */
export function ResenaForm({ pedidoId, onDone }: ResenaFormProps) {
  const toast = useToast();
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function enviar() {
    if (calificacion < 1) {
      toast.error("Elige una calificación.");
      return;
    }
    setSubmitting(true);
    try {
      await resenasApi.crearResena(pedidoId, {
        objetivoTipo: "PUNTO_DE_VENTA",
        calificacion,
        comentario: comentario.trim() || undefined,
      });
      toast.success("¡Gracias por tu reseña!");
      onDone();
    } catch (err) {
      // 422 = no entregado / ya reseñó → ocultar el formulario.
      if (isApiError(err) && err.status === 422) {
        toast.info(err.message || "Ya reseñaste este pedido.");
        onDone();
      } else {
        toast.error(userFacingMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-h3 font-semibold text-content">¿Qué te pareció?</h3>
      <Stars value={calificacion} size={28} onChange={setCalificacion} />
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Cuéntanos cómo estuvo tu pedido (opcional)."
        rows={3}
        className={cn(
          "w-full rounded-input border border-line bg-surface px-3.5 py-2.5 text-body text-content",
          "placeholder:text-content-muted focus-visible:shadow-focus focus-visible:outline-none",
        )}
      />
      <Button loading={submitting} onClick={enviar} className="self-start">
        Enviar reseña
      </Button>
    </Card>
  );
}
