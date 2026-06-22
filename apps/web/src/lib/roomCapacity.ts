// apps/web/src/lib/roomCapacity.ts
// Textos ÚNICOS para comunicar el límite de participantes activos. El número real
// viene del servidor (voice-room-state.max); acá solo viven los mensajes para no
// repetirlos por toda la UI. Tono amistoso y transparente: el límite es temporal.

export const CAPACITY_SUFFIX = 'máximo actual';

// Frase completa (header de sala + mensaje de sala llena).
export const capacityFullText = (max: number) =>
  `Límite actual: ${max} participantes activos por sala. Este valor puede actualizarse en futuras versiones.`;

// Versión cortita para un chip permanente en el encabezado.
export const capacityChip = (max: number) => `Hasta ${max} en vivo · por ahora`;

// Aclaración breve para acompañar el contador.
export const CAPACITY_NOTE = 'El máximo puede cambiar en futuras versiones.';
