// Junta clases de Tailwind dejando fuera las vacias o condicionales (false, null). Es el
// HELPER que usamos en toda la UI para componer className sin ensuciar el JSX.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
