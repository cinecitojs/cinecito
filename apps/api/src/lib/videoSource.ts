// ============================================================
// apps/api/src/lib/videoSource.ts
// Detección, validación y normalización de fuente de video (servidor).
// Paralelo de apps/web/src/lib/videoSources.ts (cliente).
//
// Arquitectura: registro de "providers". Cada proveedor sabe reconocer
// su tipo de enlace, validarlo y normalizarlo a una URL reproducible y
// sincronizable por el motor de salas. Para agregar una fuente nueva
// basta con sumar un provider al array PROVIDERS — el resto del sistema
// (rutas, player, sync) no cambia.
//
// Sync: cada fuente se reproduce con un adaptador que expone play/pause/seek
// al motor autoritativo de la sala. Fuentes con SDK propio (YouTube, Vimeo,
// Dailymotion, PeerTube) sincronizan por su API; las fuentes de archivo
// (MP4/WebM, HLS, Archive.org resuelto) sincronizan con el <video> nativo.
//
// IMPORTANTE (producto): Drive y MEGA son fuentes internas. NO se exponen
// en la UX: no llevan etiqueta propia ni título revelador. Drive se degrada
// a la fuente `direct` (video nativo) y MEGA se rechaza limpiamente porque
// sus archivos cifrados no permiten reproducción sincronizada en el navegador.
// ============================================================

// `source` guardado en la DB. Drive se persiste como su propio valor interno
// pero el player lo trata como `direct` (ver sourceToKind en el cliente).
// Archive.org se resuelve a un archivo reproducible y se persiste como `direct`.
export type DetectedSource =
  | 'youtube'
  | 'vimeo'
  | 'dailymotion'
  | 'peertube'
  | 'hls'
  | 'direct'
  | 'drive';

export interface ResolvedSource {
  source: DetectedSource;
  valid: boolean;
  /** URL normalizada, lista para guardar y reproducir. */
  url: string;
  /** Mensaje legible (y genérico) cuando valid === false. */
  error?: string;
  /**
   * Interno: el provider reconoció el enlace pero necesita una resolución
   * remota (p. ej. Archive.org → consultar metadata para hallar el archivo).
   * Lo consume `resolveVideoSourceAsync`. Nunca se persiste ni se expone.
   */
  pending?: boolean;
}

interface Provider {
  /** ¿Este provider maneja esta URL? */
  match(u: URL): boolean;
  /** Valida + normaliza (síncrono). Puede marcar `pending` para diferir. */
  resolve(u: URL, raw: string): ResolvedSource;
  /** Resolución que requiere red (opcional). La usa resolveVideoSourceAsync. */
  resolveAsync?(u: URL, raw: string): Promise<ResolvedSource>;
}

const YT_ID = /^[\w-]{6,}$/;
const DRIVE_ID = /^[\w-]{10,}$/;
const DM_ID = /^[a-zA-Z0-9]{5,}$/;
const PT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PT_SHORT = /^[A-Za-z0-9]{22}$/;
const MEDIA_EXT = /\.(mp4|webm|ogg|ogv|m4v|mov)($|\?)/i;

const GENERIC_INVALID = 'El enlace no es válido o no es compatible.';

function stripWww(host: string): string {
  return host.replace(/^www\./, '');
}

// ── Providers ───────────────────────────────────────────────
// El orden importa: primero los basados en host, luego por extensión,
// y al final el fallback genérico `direct`.

const youtube: Provider = {
  match: (u) => ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(stripWww(u.hostname)),
  resolve: (u, raw) => {
    const host = stripWww(u.hostname);
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
    else id = u.searchParams.get('v') || '';
    const valid = YT_ID.test(id);
    return { source: 'youtube', valid, url: raw, error: valid ? undefined : GENERIC_INVALID };
  },
};

const vimeo: Provider = {
  match: (u) => ['vimeo.com', 'player.vimeo.com'].includes(stripWww(u.hostname)),
  resolve: (u, raw) => {
    const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)) || '';
    const valid = /^\d+$/.test(id);
    return { source: 'vimeo', valid, url: raw, error: valid ? undefined : GENERIC_INVALID };
  },
};

// Dailymotion: SDK propio → sincronización plena (play/pause/seek). Ids con
// sufijo de título (x7abc_titulo) se recortan al id real. Se conserva la URL
// original; el player extrae el id igual que acá.
const dailymotion: Provider = {
  match: (u) => ['dailymotion.com', 'dai.ly', 'geo.dailymotion.com'].includes(stripWww(u.hostname)),
  resolve: (u, raw) => {
    const id = extractDailymotionId(u);
    const valid = DM_ID.test(id);
    return { source: 'dailymotion', valid, url: raw, error: valid ? undefined : GENERIC_INVALID };
  },
};

// PeerTube: red federada, cada instancia vive en su propio dominio, así que
// se detecta por el patrón de ruta + forma del id (UUID o shortUUID), no por
// host. Se normaliza al iframe de embed que expone la API de sincronización.
const peertube: Provider = {
  match: (u) => !!extractPeertubeId(u),
  resolve: (u, raw) => {
    const id = extractPeertubeId(u);
    if (!id) return { source: 'peertube', valid: false, url: raw, error: GENERIC_INVALID };
    const embed = `${u.origin}/videos/embed/${id}`;
    return { source: 'peertube', valid: true, url: embed };
  },
};

// Archive.org: la vía sincronizable es el archivo directo. Si el enlace ya
// apunta a un archivo reproducible, se usa tal cual (video nativo). Si es una
// página /details/{id}, se resuelve por la API de metadata al mejor archivo
// (mp4 → webm/ogv) de forma remota, con timeout y fallback limpio.
const archive: Provider = {
  match: (u) => stripWww(u.hostname) === 'archive.org',
  resolve: (u, raw) => {
    if (MEDIA_EXT.test(u.pathname)) return { source: 'direct', valid: true, url: raw };
    const id = extractArchiveId(u);
    if (!id) return { source: 'direct', valid: false, url: raw, error: 'Ese enlace de Archive.org no apunta a un video reproducible.' };
    // Reconocido, pero hay que consultar metadata para hallar el archivo.
    return { source: 'direct', valid: false, url: raw, pending: true, error: 'Verificando el enlace de Archive.org…' };
  },
  resolveAsync: async (u, raw) => {
    if (MEDIA_EXT.test(u.pathname)) return { source: 'direct', valid: true, url: raw };
    const id = extractArchiveId(u);
    if (!id) return { source: 'direct', valid: false, url: raw, error: 'Ese enlace de Archive.org no apunta a un video reproducible.' };
    const file = await resolveArchiveFile(id);
    if (!file) return { source: 'direct', valid: false, url: raw, error: 'No pude encontrar un video reproducible en ese enlace.' };
    return { source: 'direct', valid: true, url: file };
  },
};

// Google Drive (interno): solo enlaces públicos de un ARCHIVO. Se normaliza
// al endpoint de descarga directa para reproducirlo con el player nativo.
// Best-effort: si CORS/cuota impiden la carga, el player muestra el fallback
// de error limpio (no rompe la experiencia ni la sincronización del resto).
const googleDrive: Provider = {
  match: (u) => ['drive.google.com', 'docs.google.com'].includes(stripWww(u.hostname)),
  resolve: (u, raw) => {
    const id = extractDriveId(u);
    if (!id) {
      return { source: 'drive', valid: false, url: raw, error: 'Ese enlace no permite reproducción directa. Usá el enlace de un archivo público.' };
    }
    return { source: 'drive', valid: true, url: `https://drive.google.com/uc?export=download&id=${id}` };
  },
};

// MEGA (interno): sus archivos están cifrados extremo-a-extremo; la clave
// vive en el fragmento de la URL y requiere descifrado del lado del cliente
// con su SDK propietario, incompatible con reproducción sincronizada. Se
// rechaza de forma limpia con un mensaje genérico (mejor que fallar al cargar).
const mega: Provider = {
  match: (u) => ['mega.nz', 'mega.co.nz'].includes(stripWww(u.hostname)),
  resolve: (_u, raw) => ({
    source: 'direct',
    valid: false,
    url: raw,
    error: 'Este enlace no permite reproducción sincronizada. Probá con YouTube, Vimeo o un archivo .mp4.',
  }),
};

const hls: Provider = {
  match: (u) => /\.m3u8($|\?)/i.test(u.pathname + u.search),
  resolve: (_u, raw) => ({ source: 'hls', valid: true, url: raw }),
};

const directFile: Provider = {
  match: (u) => MEDIA_EXT.test(u.pathname + u.search),
  resolve: (_u, raw) => ({ source: 'direct', valid: true, url: raw }),
};

// Orden: host-específicos primero (incluye Archive.org antes que directFile
// para atrapar sus /details/), luego por extensión, y por último el fallback.
const PROVIDERS: Provider[] = [youtube, vimeo, dailymotion, peertube, googleDrive, mega, archive, hls, directFile];

// ── Extractores de id ───────────────────────────────────────

function extractDriveId(u: URL): string {
  // /file/d/{id}/view  |  ?id={id} (open?id=, uc?id=)
  const m = u.pathname.match(/\/file\/d\/([\w-]+)/) || u.pathname.match(/\/d\/([\w-]+)/);
  const id = (m && m[1]) || u.searchParams.get('id') || '';
  return DRIVE_ID.test(id) ? id : '';
}

function extractDailymotionId(u: URL): string {
  const host = stripWww(u.hostname);
  let id = '';
  if (host === 'dai.ly') id = u.pathname.slice(1);
  else if (u.pathname.startsWith('/embed/video/')) id = u.pathname.split('/')[3] || '';
  else if (u.pathname.startsWith('/video/')) id = u.pathname.split('/')[2] || '';
  else id = u.searchParams.get('video') || '';
  // Los enlaces suelen traer sufijo de título: x7tgad0_mi-video → x7tgad0.
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

function extractArchiveId(u: URL): string {
  // /details/{id}  |  /embed/{id}  |  /download/{id}/...
  const m = u.pathname.match(/\/(?:details|embed|download)\/([^/]+)/);
  return (m && decodeURIComponent(m[1])) || '';
}

// Resuelve el mejor archivo reproducible de un ítem de Archive.org vía su API
// de metadata (CORS abierto). Prioriza mp4 (h264) → mp4 → webm/ogv. Con timeout
// duro y captura de errores: cualquier fallo devuelve null → fallback limpio.
async function resolveArchiveFile(id: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, {
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const files: any[] = Array.isArray(data?.files) ? data.files : [];
    const byName = (re: RegExp) => files.find((f) => typeof f?.name === 'string' && re.test(f.name));
    const pick =
      files.find((f) => /\.mp4$/i.test(f?.name || '') && /h\.?264|mpeg4|512kb|hd/i.test(f?.format || '')) ||
      byName(/\.mp4$/i) ||
      byName(/\.(webm|ogv|ogg)$/i);
    if (!pick?.name) return null;
    const path = String(pick.name).split('/').map(encodeURIComponent).join('/');
    return `https://archive.org/download/${encodeURIComponent(id)}/${path}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── API pública ─────────────────────────────────────────────

/** Parseo/validación común de la URL cruda. */
function parseUrl(rawUrl: string): { raw: string; u?: URL; error?: ResolvedSource } {
  const raw = (rawUrl || '').trim();
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { raw, error: { source: 'direct', valid: false, url: raw, error: 'El enlace no tiene un formato válido.' } };
  }
  if (!/^https?:$/.test(u.protocol)) {
    return { raw, error: { source: 'direct', valid: false, url: raw, error: 'Solo se aceptan enlaces http(s).' } };
  }
  return { raw, u };
}

/**
 * Detecta, valida y normaliza cualquier enlace (síncrono).
 * Para fuentes que requieren resolución remota (Archive.org /details) devuelve
 * `valid:false, pending:true` — usá `resolveVideoSourceAsync` para resolverlas.
 */
export function resolveVideoSource(rawUrl: string): ResolvedSource {
  const { raw, u, error } = parseUrl(rawUrl);
  if (error) return error;
  const provider = PROVIDERS.find((p) => p.match(u!));
  if (provider) return provider.resolve(u!, raw);
  // URL http(s) desconocida: se deja pasar como 'direct' (el player intentará
  // reproducir y mostrará su error si falla).
  return { source: 'direct', valid: true, url: raw };
}

/**
 * Igual que resolveVideoSource pero completa las fuentes que necesitan red
 * (Archive.org). Es la que deben usar las rutas al guardar un video.
 */
export async function resolveVideoSourceAsync(rawUrl: string): Promise<ResolvedSource> {
  const { raw, u, error } = parseUrl(rawUrl);
  if (error) return error;
  const provider = PROVIDERS.find((p) => p.match(u!));
  if (!provider) return { source: 'direct', valid: true, url: raw };
  const sync = provider.resolve(u!, raw);
  if (sync.pending && provider.resolveAsync) {
    const { pending, ...resolved } = await provider.resolveAsync(u!, raw);
    return resolved;
  }
  const { pending, ...clean } = sync;
  return clean;
}

/** Compatibilidad: forma antigua { source, valid } usada por rutas legacy y tests. */
export function detectSource(rawUrl: string): { source: DetectedSource; valid: boolean } {
  const { source, valid } = resolveVideoSource(rawUrl);
  return { source, valid };
}

export function defaultTitle(source: DetectedSource): string {
  switch (source) {
    case 'youtube':     return 'Video de YouTube';
    case 'vimeo':       return 'Video de Vimeo';
    case 'dailymotion': return 'Video de Dailymotion';
    case 'peertube':    return 'Video de PeerTube';
    case 'hls':         return 'Stream en vivo';
    // Fuentes internas y directas: título genérico para no exponerlas en la UX.
    default:            return 'Video';
  }
}
