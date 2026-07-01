// ============================================================
// apps/web/src/lib/videoSources.ts
// Detección, validación y normalización de fuentes de video (cliente).
// Paralelo de apps/api/src/lib/videoSource.ts (servidor).
//
// Arquitectura: registro de "providers". Cada proveedor reconoce su tipo
// de enlace, lo valida y devuelve el `kind` que sabe reproducir el player.
// Para sumar una fuente futura basta con agregar un provider a PROVIDERS.
//
// Fuentes públicas soportadas: YouTube, Vimeo, Dailymotion, PeerTube,
// Archive.org, HLS y archivos directos MP4/WebM. Cada una se reproduce con su
// adaptador de sync en VideoStage. Archive.org (páginas /details) se valida
// optimista acá y el servidor resuelve el archivo reproducible real.
//
// IMPORTANTE (producto): Drive y MEGA son fuentes internas y NO se exponen
// en la UX. Drive usa una etiqueta genérica ("Enlace de video") y se degrada
// a `direct` (video nativo, plenamente sincronizable). MEGA se rechaza limpio
// porque sus archivos cifrados no permiten reproducción sincronizada.
// ============================================================

export type VideoSourceKind =
  | 'youtube'
  | 'vimeo'
  | 'dailymotion'
  | 'peertube'
  | 'hls'
  | 'direct'
  | 'upload'
  | 'unknown';

export interface ParsedSource {
  kind: VideoSourceKind;
  /** URL original normalizada */
  url: string;
  /** ID del proveedor (YouTube/Vimeo/Dailymotion/PeerTube) cuando aplica */
  providerId?: string;
  valid: boolean;
  /** Mensaje de error legible cuando valid === false */
  error?: string;
  label: string;
}

interface Provider {
  match(u: URL): boolean;
  resolve(u: URL, url: string): ParsedSource;
}

const YT_ID = /^[\w-]{6,}$/;
const DRIVE_ID = /^[\w-]{10,}$/;
const DM_ID = /^[a-zA-Z0-9]{5,}$/;
const PT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PT_SHORT = /^[A-Za-z0-9]{22}$/;
const MEDIA_EXT = /\.(mp4|webm|ogg|ogv|m4v|mov)($|\?)/i;

const stripWww = (host: string) => host.replace(/^www\./, '');

const youtube: Provider = {
  match: (u) => ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(stripWww(u.hostname)),
  resolve: (u, url) => {
    const host = stripWww(u.hostname);
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
    else id = u.searchParams.get('v') || '';
    const valid = YT_ID.test(id);
    return { kind: 'youtube', url, providerId: id, valid, error: valid ? undefined : 'No pude leer el ID del video de YouTube.', label: 'YouTube' };
  },
};

const vimeo: Provider = {
  match: (u) => ['vimeo.com', 'player.vimeo.com'].includes(stripWww(u.hostname)),
  resolve: (u, url) => {
    const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)) || '';
    const valid = /^\d+$/.test(id);
    return { kind: 'vimeo', url, providerId: id, valid, error: valid ? undefined : 'No pude leer el ID del video de Vimeo.', label: 'Vimeo' };
  },
};

// Dailymotion: SDK propio → sincronización plena. El id puede traer sufijo de
// título (x7abc_titulo); se recorta al id real.
const dailymotion: Provider = {
  match: (u) => ['dailymotion.com', 'dai.ly', 'geo.dailymotion.com'].includes(stripWww(u.hostname)),
  resolve: (u, url) => {
    const id = extractDailymotionId(u);
    const valid = DM_ID.test(id);
    return { kind: 'dailymotion', url, providerId: id, valid, error: valid ? undefined : 'No pude leer el ID del video de Dailymotion.', label: 'Dailymotion' };
  },
};

// PeerTube: red federada (cada instancia es su propio dominio). Se detecta por
// patrón de ruta + forma del id. Se normaliza al iframe de embed que expone la
// API de sincronización por postMessage.
const peertube: Provider = {
  match: (u) => !!extractPeertubeId(u),
  resolve: (u, url) => {
    const id = extractPeertubeId(u);
    const valid = !!id;
    return {
      kind: 'peertube',
      url: valid ? `${u.origin}/videos/embed/${id}` : url,
      providerId: id || undefined,
      valid,
      error: valid ? undefined : 'Ese enlace de PeerTube no es compatible.',
      label: 'PeerTube',
    };
  },
};

// Archive.org: la vía sincronizable es el archivo directo (video nativo). Si el
// enlace ya apunta a un archivo, se reproduce tal cual. Si es una página
// /details, se acepta optimista y el servidor resuelve el archivo real.
const archive: Provider = {
  match: (u) => stripWww(u.hostname) === 'archive.org',
  resolve: (u, url) => {
    if (MEDIA_EXT.test(u.pathname)) return { kind: 'direct', url, valid: true, label: 'Archive.org' };
    const id = u.pathname.match(/\/(?:details|embed|download)\/([^/]+)/);
    const valid = !!(id && id[1]);
    return {
      kind: 'direct',
      url,
      valid,
      error: valid ? undefined : 'Ese enlace de Archive.org no apunta a un video reproducible.',
      label: 'Archive.org',
    };
  },
};

// Google Drive (interno): solo archivos públicos. La normalización real la hace
// el servidor; acá solo validamos el enlace y usamos etiqueta genérica para no
// exponer la fuente. Se reproduce como `direct` (video nativo, sincronizable).
const googleDrive: Provider = {
  match: (u) => ['drive.google.com', 'docs.google.com'].includes(stripWww(u.hostname)),
  resolve: (u, url) => {
    const m = u.pathname.match(/\/file\/d\/([\w-]+)/) || u.pathname.match(/\/d\/([\w-]+)/);
    const id = (m && m[1]) || u.searchParams.get('id') || '';
    const valid = DRIVE_ID.test(id);
    return {
      kind: valid ? 'direct' : 'unknown', url, providerId: valid ? id : undefined, valid,
      error: valid ? undefined : 'Ese enlace no permite reproducción directa. Usá el enlace de un archivo público.',
      label: 'Enlace de video',
    };
  },
};

// MEGA (interno): cifrado extremo-a-extremo, no reproducible/sincronizable en el
// navegador. Se rechaza con un mensaje claro y genérico.
const mega: Provider = {
  match: (u) => ['mega.nz', 'mega.co.nz'].includes(stripWww(u.hostname)),
  resolve: (_u, url) => ({
    kind: 'unknown', url, valid: false,
    error: 'Este enlace no permite reproducción sincronizada. Probá con YouTube, Vimeo o un archivo .mp4.',
    label: 'Video',
  }),
};

const hls: Provider = {
  match: (u) => /\.m3u8($|\?)/i.test(u.pathname + u.search),
  resolve: (_u, url) => ({ kind: 'hls', url, valid: true, label: 'Stream HLS' }),
};

const directFile: Provider = {
  match: (u) => MEDIA_EXT.test(u.pathname + u.search),
  resolve: (_u, url) => ({ kind: 'direct', url, valid: true, label: 'Video directo' }),
};

const PROVIDERS: Provider[] = [youtube, vimeo, dailymotion, peertube, googleDrive, mega, archive, hls, directFile];

function extractDailymotionId(u: URL): string {
  const host = stripWww(u.hostname);
  let id = '';
  if (host === 'dai.ly') id = u.pathname.slice(1);
  else if (u.pathname.startsWith('/embed/video/')) id = u.pathname.split('/')[3] || '';
  else if (u.pathname.startsWith('/video/')) id = u.pathname.split('/')[2] || '';
  else id = u.searchParams.get('video') || '';
  return id.split(/[?&_]/)[0];
}

function extractPeertubeId(u: URL): string {
  const parts = u.pathname.split('/').filter(Boolean);
  let id = '';
  if (parts[0] === 'w' && parts[1]) id = parts[1];
  else if (parts[0] === 'videos' && (parts[1] === 'watch' || parts[1] === 'embed') && parts[2]) id = parts[2];
  if (!id) return '';
  return PT_UUID.test(id) || PT_SHORT.test(id) ? id : '';
}

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

  const provider = PROVIDERS.find((p) => p.match(u));
  if (provider) return provider.resolve(u, url);

  // URL desconocida pero http(s): la dejamos como 'direct' (se intentará reproducir).
  return { kind: 'direct', url, valid: true, label: 'Enlace de video' };
}

// Mapea el `source` guardado en la DB a nuestro kind del reproductor.
export function sourceToKind(source: string): VideoSourceKind {
  switch (source) {
    case 'youtube':     return 'youtube';
    case 'vimeo':       return 'vimeo';
    case 'dailymotion': return 'dailymotion';
    case 'peertube':    return 'peertube';
    case 'hls':         return 'hls';
    case 'upload':      return 'upload';
    case 'direct':      return 'direct';
    // Fuentes internas: se reproducen con el player nativo.
    case 'drive':       return 'direct';
    default:            return 'direct';
  }
}

// Carga perezosa de un script externo una sola vez (YouTube / Vimeo / Dailymotion SDK).
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
