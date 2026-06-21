// ============================================================
// apps/api/src/lib/videoSource.ts
// Detección y validación de fuente de video en el servidor.
// Paralelo de apps/web/src/lib/videoSources.ts (cliente).
// ============================================================

export type DetectedSource = 'youtube' | 'vimeo' | 'hls' | 'direct';

export function detectSource(rawUrl: string): { source: DetectedSource; valid: boolean } {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { source: 'direct', valid: false }; }
  if (!/^https?:$/.test(u.protocol)) return { source: 'direct', valid: false };

  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
    else id = u.searchParams.get('v') || '';
    return { source: 'youtube', valid: !!id && id.length >= 6 };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)) || '';
    return { source: 'vimeo', valid: /^\d+$/.test(id) };
  }
  if (/\.m3u8($|\?)/i.test(u.pathname + u.search)) return { source: 'hls', valid: true };
  if (/\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(u.pathname + u.search)) return { source: 'direct', valid: true };
  // URL http(s) desconocida: se deja pasar como 'direct' (el reproductor intentará y mostrará error si falla).
  return { source: 'direct', valid: true };
}

export function defaultTitle(source: DetectedSource): string {
  switch (source) {
    case 'youtube': return 'Video de YouTube';
    case 'vimeo':   return 'Video de Vimeo';
    case 'hls':     return 'Stream en vivo';
    default:        return 'Video';
  }
}
