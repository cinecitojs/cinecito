// apps/web/src/lib/mediaErrors.ts
// Traduce los errores de getUserMedia a mensajes claros y accionables.
// El caso más confuso es NotReadableError ("pantalla negra"): el navegador/SO no
// pudo iniciar la cámara, normalmente porque OTRA app o pestaña la está usando.

export function mediaErrorMessage(err: any, withVideo = true): string {
  const name: string = err?.name || '';
  const dispositivos = withVideo ? 'la cámara o el micrófono' : 'el micrófono';
  const aparato = withVideo ? 'la cámara' : 'el micrófono';

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return `Permiso denegado. Habilitá ${dispositivos} desde el ícono de candado del navegador y reintentá.`;

    // Cámara/mic ocupados o con problema de hardware → la temida "pantalla negra".
    case 'NotReadableError':
    case 'AbortError':
    case 'TrackStartError': // nombre antiguo en Chrome
      return `No se pudo iniciar ${aparato}. Suele pasar cuando otra app o pestaña la está usando (Zoom, Meet, otra pestaña de Cinecito…). Cerralas y reintentá.`;

    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return `No se encontró ${dispositivos}. Conectá un dispositivo o revisá el seleccionado en Ajustes y reintentá.`;

    default:
      return `No se pudo acceder a ${dispositivos}.`;
  }
}
