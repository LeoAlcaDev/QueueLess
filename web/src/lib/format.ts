// Helpers de formato según las reglas de copy del design system:
// moneda `S/ 12.50`, tiempo `15 min` / `≈ 15 min`, fechas en español de Perú.

const soles = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "S/ 12.50". */
export function formatSoles(monto: number): string {
  return `S/ ${soles.format(monto)}`;
}

/** "15 min" o "≈ 15 min" (estimado). */
export function formatMinutes(minutos: number, approx = false): string {
  return `${approx ? "≈ " : ""}${minutos} min`;
}

const dateTimeFmt = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
});

/** "28 jun, 14:35" — para timestamps de pedidos/movimientos. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateTimeFmt.format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return timeFmt.format(new Date(iso));
}
