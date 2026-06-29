import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  TriangleAlert,
} from "lucide-react";
import { queuepointsApi } from "@/api";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  QueuePointsBadge,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useFetch, usePaginated } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

/** QueuePoints: saldo, historial de movimientos y canje (422 → saldo insuficiente). */
export default function PointsPage() {
  const toast = useToast();
  const saldo = useFetch(() => queuepointsApi.getSaldo());
  const movs = usePaginated((params) => queuepointsApi.getMovimientos(params), {
    size: 10,
  });

  const [canjeOpen, setCanjeOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [canjeando, setCanjeando] = useState(false);

  async function canjear() {
    const cantidad = Number(monto);
    if (!cantidad || cantidad < 1) {
      toast.error("Ingresa un monto válido.");
      return;
    }
    setCanjeando(true);
    try {
      // Canje manual: referencia única para no colisionar con la idempotencia del ledger.
      await queuepointsApi.canjear({
        monto: cantidad,
        referenciaTipo: "CANJE_MANUAL",
        referenciaId: Date.now(),
        descripcion: "Canje manual desde la web",
      });
      toast.success(`Canjeaste ${cantidad} QueuePoints.`);
      setCanjeOpen(false);
      setMonto("");
      saldo.refetch();
      movs.reload();
    } catch (err) {
      // 422 saldo insuficiente: el mensaje del backend trae el saldo actual.
      toast.error(userFacingMessage(err));
    } finally {
      setCanjeando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col items-center gap-3 py-6">
        {saldo.loading ? (
          <Skeleton className="h-8 w-40" />
        ) : saldo.error ? (
          <p className="text-small text-content-secondary">
            No se pudo cargar el saldo.
          </p>
        ) : (
          <QueuePointsBadge
            amount={saldo.data?.saldo ?? 0}
            prefix=""
            size="lg"
          />
        )}
        <Button
          variant="points"
          size="sm"
          leftIcon={<Coins size={16} />}
          disabled={saldo.loading || !!saldo.error}
          onClick={() => setCanjeOpen(true)}
        >
          Canjear puntos
        </Button>
      </Card>

      <section className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-content">Movimientos</h3>

        {movs.loading && movs.items.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-card" />
            ))}
          </div>
        ) : movs.error && movs.items.length === 0 ? (
          <EmptyState
            icon={TriangleAlert}
            title="No pudimos cargar tus movimientos"
            description={userFacingMessage(movs.error)}
            action={
              <Button variant="secondary" size="sm" onClick={movs.reload}>
                Reintentar
              </Button>
            }
          />
        ) : movs.items.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="Sin movimientos todavía"
            description="Aquí verás los QueuePoints que ganas y canjeas."
          />
        ) : (
          <Card className="flex flex-col divide-y divide-line">
            {movs.items.map((m) => {
              const ganado = m.tipo === "GANADO";
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-pill ${ganado ? "bg-points-soft text-points-strong" : "bg-surface-muted text-content-secondary"}`}
                  >
                    {ganado ? (
                      <ArrowUpRight size={18} />
                    ) : (
                      <ArrowDownRight size={18} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-content">
                      {m.descripcion ??
                        (ganado ? "Puntos ganados" : "Canje de puntos")}
                    </p>
                    <p className="text-small text-content-muted">
                      {formatDateTime(m.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-body font-semibold ${ganado ? "text-points-strong" : "text-content-secondary"}`}
                  >
                    {ganado ? "+" : "−"}
                    {m.monto}
                  </span>
                </div>
              );
            })}
          </Card>
        )}

        {movs.hasMore && (
          <Button
            variant="secondary"
            onClick={movs.loadMore}
            loading={movs.loading}
            className="self-center"
          >
            Cargar más
          </Button>
        )}
      </section>

      <Modal
        open={canjeOpen}
        onClose={() => setCanjeOpen(false)}
        title="Canjear QueuePoints"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCanjeOpen(false)}>
              Cancelar
            </Button>
            <Button variant="points" loading={canjeando} onClick={canjear}>
              Canjear
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-small text-content-secondary">
            Saldo disponible:{" "}
            <span className="font-semibold text-content">
              {saldo.data?.saldo ?? 0} QueuePoints
            </span>
          </p>
          <Input
            label="Monto a canjear"
            type="number"
            min={1}
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
