import clsx, { type ClassValue } from "clsx";

/** Une clases condicionales (wrapper fino de clsx) para los primitivos UI. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
