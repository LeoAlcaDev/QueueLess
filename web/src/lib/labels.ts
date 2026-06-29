// Helpers de presentación de enums del backend. Mantienen el copy en español
// (sentence case) sin acoplar cada pantalla a un diccionario gigante.

/** "FRUTOS_SECOS" → "Frutos secos". */
export function humanizeEnum(value: string): string {
  const lower = value.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
