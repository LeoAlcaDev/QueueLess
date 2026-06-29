import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText } from "lucide-react";
import { tycApi } from "@/api";
import { Button, Spinner, useToast } from "@/components/ui";
import { userFacingMessage } from "@/lib/errors";
import type { TycEstadoResponse } from "@/types";

type GateStatus = "loading" | "accepted" | "pending" | "error";

/**
 * Gating de Términos y Condiciones en el front (MAPA §3.10 / §7.3): tras
 * autenticarse, consulta `GET /me/tyc`; si `aceptoVersionVigente=false` superpone
 * un modal **bloqueante** (sin cerrar) que exige aceptar la versión vigente.
 * Falla-abierto si la consulta falla, para no dejar al usuario encerrado.
 */
export function TycGate({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<GateStatus>("loading");
  const [estado, setEstado] = useState<TycEstadoResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tycApi
      .getTycEstado()
      .then((data) => {
        if (cancelled) return;
        setEstado(data);
        setStatus(data.aceptoVersionVigente ? "accepted" : "pending");
      })
      .catch(() => {
        // No bloqueamos la app si el chequeo falla (fail-open).
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const aceptar = useCallback(async () => {
    setSubmitting(true);
    try {
      const data = await tycApi.aceptarTyc();
      setEstado(data);
      setStatus("accepted");
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [toast]);

  // Mientras se resuelve el chequeo inicial, un spinner a pantalla completa evita
  // mostrar la app y que un segundo después aparezca el modal de golpe.
  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <>
      {children}
      {status === "pending" &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-overlay sm:items-center sm:p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tyc-title"
              className="flex w-full max-h-[90vh] flex-col overflow-hidden rounded-t-modal bg-surface shadow-lg sm:max-w-md sm:rounded-modal"
            >
              <div className="flex flex-col gap-3 overflow-y-auto p-5">
                <span className="grid h-12 w-12 place-items-center rounded-pill bg-brand-soft text-content-brand">
                  <FileText size={24} aria-hidden="true" />
                </span>
                <h2 id="tyc-title" className="text-h2 font-bold text-content">
                  Términos y condiciones
                </h2>
                <p className="text-body text-content-secondary">
                  Actualizamos nuestros términos y condiciones (versión{" "}
                  <span className="font-semibold text-content">
                    {estado?.versionVigente}
                  </span>
                  ). Para seguir usando QueueLess necesitás revisarlos y
                  aceptarlos.
                </p>
                {estado?.versionAceptada && (
                  <p className="text-small text-content-muted">
                    Última versión aceptada: {estado.versionAceptada}.
                  </p>
                )}
              </div>
              <div className="border-t border-line p-4">
                <Button full loading={submitting} onClick={aceptar}>
                  Acepto los términos
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
