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
// IMPORTANTE (producto): Drive y MEGA son fuentes internas. NO se exponen
// en la UX: no llevan etiqueta propia ni título revelador. Drive se degrada
// a la fuente `direct` (video nativo) y MEGA se rechaza limpiamente porque
// sus archivos cifrados no permiten reproducción sincronizada en el navegador.
// ============================================================

// `source` guardado en la DB. Drive se persiste como su propio valor interno
// pero el player lo trata como `direct` (ver sourceToKind en el cliente).
export type DetectedSource = 'youtube' | 'vimeo' | 'hls' | 'direct' | 'drive';

export interface ResolvedSource {
  source: DetectedSource;
  valid: boolean;
  /** URL normalizada, lista para guardar y reproducir. */
  url: string;
  /** Mensaje legible (y genérico) cuando valid === false. */
  error?: string;
}

interface Provider {
  /** ¿Este provider maneja esta URL? */
  match(u: URL): boolean;
  /** Valida + normaliza. */
  resolve(u: URL, raw: string): ResolvedSource;
}

const YT_ID = /^[\w-]{6,}$/;
const DRIVE_ID = /^[\w-]{10,}$/;

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
    return { source: 'youtube', valid, url: raw, error: valid ? undefined : 'El enlace no es válido o no es compatible.' };
  },
};

const vimeo: Provider = {
  match: (u) => ['vimeo.com', 'player.vimeo.com'].includes(stripWww(u.hostname)),
  resolve: (u, raw) => {
    const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)) || '';
    const valid = /^\d+$/.test(id);
    return { source: 'vimeo', valid, url: raw, error: valid ? undefined : 'El enlace no es válido o no es compatible.' };
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
  match: (u) => /\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(u.pathname + u.search),
  resolve: (_u, raw) => ({ source: 'direct', valid: true, url: raw }),
};

const PROVIDERS: Provider[] = [youtube, vimeo, googleDrive, mega, hls, directFile];

function extractDriveId(u: URL): string {
  // /file/d/{id}/view  |  ?id={id} (open?id=, uc?id=)
  const m = u.pathname.match(/\/file\/d\/([\w-]+)/) || u.pathname.match(/\/d\/([\w-]+)/);
  const id = (m && m[1]) || u.searchParams.get('id') || '';
  return DRIVE_ID.test(id) ? id : '';
}

// ── API pública ─────────────────────────────────────────────

/** Detecta, valida y normaliza cualquier enlace pegado por el usuario. */
export function resolveVideoSource(rawUrl: string): ResolvedSource {
  const raw = (rawUrl || '').trim();
  let u: URL;
  try { u = new URL(raw); } catch { return { source: 'direct', valid: false, url: raw, error: 'El enlace no tiene un formato válido.' }; }
  if (!/^https?:$/.test(u.protocol)) return { source: 'direct', valid: false, url: raw, error: 'Solo se aceptan enlaces http(s).' };

  const provider = PROVIDERS.find((p) => p.match(u));
  if (provider) return provider.resolve(u, raw);

  // URL http(s) desconocida: se deja pasar como 'direct' (el player intentará
  // reproducir y mostrará su error si falla).
  return { source: 'direct', valid: true, url: raw };
}

/** Compatibilidad: forma antigua { source, valid } usada por rutas legacy y tests. */
export function detectSource(rawUrl: string): { source: DetectedSource; valid: boolean } {
  const { source, valid } = resolveVideoSource(rawUrl);
  return { source, valid };
}

export function defaultTitle(source: DetectedSource): string {
  switch (source) {
    case 'youtube': return 'Video de YouTube';
    case 'vimeo':   return 'Video de Vimeo';
    case 'hls':     return 'Stream en vivo';
    // Fuentes internas y directas: título genérico para no exponerlas en la UX.
    default:        return 'Video';
  }
}
