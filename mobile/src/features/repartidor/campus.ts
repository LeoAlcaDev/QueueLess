// El backend nos da el origen (ubicación del local) y el destino (zona de entrega)
// como texto libre. Para el mapa de marcadores los traducimos a coordenadas fijas
// del campus de UTEC en Barranco. No usamos GPS ni ubicación del usuario: el mapa
// solo muestra estos puntos conocidos.

export interface Coords {
  latitude: number;
  longitude: number;
}

// centro del campus, usado como último recurso cuando el texto no calza con ningún
// punto conocido
export const CAMPUS_CENTER: Coords = { latitude: -12.15, longitude: -77.02 };

// puntos del campus alrededor del centro de Barranco; las llaves son los nombres
// que aparecen en las ubicaciones de los locales y en las zonas de entrega
export const CAMPUS_POINTS: Record<string, Coords> = {
  'Bloque A': { latitude: -12.1495, longitude: -77.0206 },
  'Bloque B': { latitude: -12.1503, longitude: -77.0197 },
  'Bloque C': { latitude: -12.1509, longitude: -77.0208 },
  'Patios centrales': { latitude: -12.15, longitude: -77.02 },
  Biblioteca: { latitude: -12.1493, longitude: -77.0193 },
  'Aulas Bloque A': { latitude: -12.1489, longitude: -77.0211 },
  'Aulas Bloque B': { latitude: -12.1506, longitude: -77.0213 },
  'Aulas Bloque C': { latitude: -12.1512, longitude: -77.0195 },
};

// Resuelve un texto del backend a coordenadas. Primero intenta calce exacto; si no,
// busca dentro del texto algún punto conocido (ej. "Café del Bloque A" cae en
// "Bloque A"). Las llaves más largas se prueban antes para que "Aulas Bloque A" no
// se quede con la coincidencia genérica de "Bloque A".
export function coordsFor(name: string | null | undefined): Coords {
  if (!name) return CAMPUS_CENTER;
  const exact = CAMPUS_POINTS[name];
  if (exact) return exact;
  const keys = Object.keys(CAMPUS_POINTS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (name.includes(key)) return CAMPUS_POINTS[key];
  }
  return CAMPUS_CENTER;
}
