// ============================================================
// apps/web/src/lib/videoSources.ts
// Detección, validación y normalización de fuentes de video.
// Una sola función para clasificar cualquier enlace que pegue el usuario.
// ============================================================

export type VideoSourceKind = 'youtube' | 'vimeo' | 'hls' | 'direct' | 'upload' | 'unknown';

export interface ParsedSource {
  kind: VideoSourceKind;
  /** URL original normalizada */
  url: string;
  /** ID del proveedor (YouTube/Vimeo) cuando aplica */
  providerId?: string;
  valid: boolean;
  /** Mensaje de error legible cuando valid === false */
  error?: string;
  label: string;
}

const YT_ID = /^[\w-]{6,}$/;

export function parseVideoUrl(raw: string): ParsedSource {
  const url = (raw || '').trim();
  if (!url) return { kind: 'unknown', url, valid: false, error: 'Pegá un enlace.', label: 'Video' };

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: 'unknown', url, valid: false, error: 'El enlace no tiene un formato válido.', label: 'Video' };
  }
  if (!/^https?:$/.test(u.protocol)) {
    return { kind: 'unknown', url, valid: false, error: 'Solo se aceptan enlaces http(s).', label: 'Video' };
  }

  const host = u.hostname.replace(/^www\./, '');

  // ── YouTube ──
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
    else id = u.searchParams.get('v') || '';
    const valid = YT_ID.test(id);
    return {
      kind: 'youtube', url, providerId: id, valid,
      error: valid ? undefined : 'No pude leer el ID del video de YouTube.',
      label: 'YouTube',
    };
  }

  // ── Vimeo ──
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)) || '';
    const valid = /^\d+$/.test(id);
    return {
      kind: 'vimeo', url, providerId: id, valid,
      error: valid ? undefined : 'No pude leer el ID del video de Vimeo.',
      label: 'Vimeo',
    };
  }

  // ── HLS (.m3u8) ──
  if (/\.m3u8($|\?)/i.test(u.pathname + u.search)) {
    return { kind: 'hls', url, valid: true, label: 'Stream HLS' };
  }

  // ── Archivo directo (mp4/webm/ogg/mov) ──
  if (/\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(u.pathname + u.search)) {
    return { kind: 'direct', url, valid: true, label: 'Video directo' };
  }

  // URL desconocida pero http(s): la dejamos como 'direct' (se intentará reproducir).
  return {
    kind: 'direct', url, valid: true,
    label: 'Enlace de video',
  };
}

// Mapea el `source` guardado en la DB a nuestro kind del reproductor.
export function sourceToKind(source: string): VideoSourceKind {
  switch (source) {
    case 'youtube': return 'youtube';
    case 'vimeo':   return 'vimeo';
    case 'hls':     return 'hls';
    case 'upload':  return 'upload';
    case 'direct':  return 'direct';
    default:        return 'direct';
  }
}

// Carga perezosa de un script externo una sola vez (YouTube / Vimeo SDK).
const scriptPromises = new Map<string, Promise<void>>();
export function loadScript(src: string): Promise<void> {
  if (scriptPromises.has(src)) return scriptPromises.get(src)!;
  const p = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
  scriptPromises.set(src, p);
  return p;
}
