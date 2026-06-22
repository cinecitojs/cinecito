// apps/web/src/lib/callQuality.ts
// Motor de fluidez para la videollamada mesh P2P. Concentra TODO lo que mantiene la
// llamada estable bajo mala red, sin degradar cuando la red está bien:
//   • config ICE (STUN público + TURN opcional por env)
//   • prioridad ABSOLUTA al audio (nunca se degrada; va con networkPriority alta)
//   • escalera de calidad de video (bitrate + escalado de resolución + fps)
//   • degradationPreference = maintain-framerate (preferimos movimiento fluido)
//   • lectura de getStats (packet loss / RTT / qualityLimitationReason)
//   • decisión con histéresis: baja rápido, sube lento (evita oscilar)

export type NetQuality = 'good' | 'medium' | 'poor' | 'reconnecting';

export interface QualityLevel { maxBitrate: number; scaleDown: number; maxFramerate: number; }

// Escalera de SUBIDA de video. L0 (mejor) → L3 (supervivencia). El audio va aparte
// y nunca se toca. Bajo mala red se sube de nivel (peor video) para no cortar.
export const VIDEO_LADDER: QualityLevel[] = [
  { maxBitrate: 700_000, scaleDown: 1, maxFramerate: 30 }, // L0  ~540p30
  { maxBitrate: 450_000, scaleDown: 1, maxFramerate: 24 }, // L1
  { maxBitrate: 250_000, scaleDown: 2, maxFramerate: 20 }, // L2  ~270p
  { maxBitrate: 120_000, scaleDown: 4, maxFramerate: 15 }, // L3  ~135p15 (audio-first)
];
export const MAX_LEVEL = VIDEO_LADDER.length - 1;

// ── ICE / transporte ──────────────────────────────────────────
// Las URLs de ICE DEBEN tener esquema (stun:/stuns:/turn:/turns:). Si VITE_TURN_URL
// viene como "host:puerto" sin esquema, el constructor de RTCPeerConnection LANZA y
// rompe la llamada (justo el bug que dejaba al 2º usuario cargando). Lo normalizamos.
function normalizeIceUrl(u: string): string {
  return /^(stuns?|turns?):/i.test(u) ? u : `turn:${u}`;
}

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const raw = import.meta.env.VITE_TURN_URL;
  if (raw) {
    const urls = raw.split(',').map((u) => u.trim()).filter(Boolean).map(normalizeIceUrl);
    if (urls.length) {
      servers.push({
        urls,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      });
    }
  }
  return servers;
}

// ¿Hay TURN configurado? (sin TURN no hay fallback de relay posible).
export function hasTurn(): boolean {
  return !!import.meta.env.VITE_TURN_URL;
}

// max-bundle = un solo transporte para audio+video (menos puertos/candidatos → conecta
// más rápido y con menos overhead). El pool precalienta candidatos ICE.
// forceRelay → iceTransportPolicy:'relay': ignora candidatos directos y va SOLO por
// TURN. Es el fallback cuando la conexión P2P directa fracasa (NAT simétrico/CGNAT).
export function pcConfig(forceRelay = false): RTCConfiguration {
  return {
    iceServers: getIceServers(),
    bundlePolicy: 'max-bundle',
    iceCandidatePoolSize: 2,
    ...(forceRelay ? { iceTransportPolicy: 'relay' as RTCIceTransportPolicy } : {}),
  };
}

// ── Prioridades + preferencia de degradación ──────────────────
// Audio: prioridad de red alta (la cola del navegador lo manda primero bajo congestión).
// Video: prioridad baja + maintain-framerate (sacrifica resolución antes que fluidez).
export async function prioritizeMedia(pc: RTCPeerConnection): Promise<void> {
  for (const sender of pc.getSenders()) {
    const kind = sender.track?.kind;
    if (!kind) continue;
    try {
      const p: any = sender.getParameters();
      if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
      if (kind === 'audio') {
        p.encodings[0].priority = 'high';
        p.encodings[0].networkPriority = 'high';
      } else {
        p.encodings[0].networkPriority = 'low';
        p.degradationPreference = 'maintain-framerate';
      }
      await sender.setParameters(p);
    } catch { /* navegador sin soporte: no es crítico */ }
  }
}

// Aplica un nivel de la escalera al sender de video.
export async function applyVideoLevel(pc: RTCPeerConnection, level: number): Promise<void> {
  const lvl = VIDEO_LADDER[Math.max(0, Math.min(level, MAX_LEVEL))];
  const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
  if (!sender) return;
  try {
    const p: any = sender.getParameters();
    if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
    p.encodings[0].maxBitrate = lvl.maxBitrate;
    p.encodings[0].maxFramerate = lvl.maxFramerate;
    p.encodings[0].scaleResolutionDownBy = lvl.scaleDown;
    p.degradationPreference = 'maintain-framerate';
    await sender.setParameters(p);
  } catch { /* no soportado */ }
}

// Marca la pista de video como "movimiento": el encoder favorece fluidez sobre nitidez.
export function hintMotion(track?: MediaStreamTrack | null): void {
  if (track && 'contentHint' in track) { try { (track as any).contentHint = 'motion'; } catch { /* */ } }
}

// ── Telemetría (getStats) ─────────────────────────────────────
export interface PeerSample { limited: string; lossPct: number; rtt: number; }

export async function samplePeer(pc: RTCPeerConnection): Promise<PeerSample> {
  const out: PeerSample = { limited: 'none', lossPct: 0, rtt: 0 };
  try {
    const stats = await pc.getStats();
    let lost = 0, recv = 0;
    stats.forEach((r: any) => {
      if (r.type === 'outbound-rtp' && r.kind === 'video' && r.qualityLimitationReason) {
        out.limited = r.qualityLimitationReason;
      }
      if (r.type === 'remote-inbound-rtp' && r.kind === 'video') {
        if (typeof r.fractionLost === 'number') out.lossPct = Math.max(out.lossPct, r.fractionLost);
        if (typeof r.roundTripTime === 'number') out.rtt = Math.max(out.rtt, r.roundTripTime);
      }
      if (r.type === 'inbound-rtp' && r.kind === 'video') {
        if (typeof r.packetsLost === 'number') lost += Math.max(0, r.packetsLost);
        if (typeof r.packetsReceived === 'number') recv += r.packetsReceived;
      }
      if (r.type === 'candidate-pair' && r.nominated && typeof r.currentRoundTripTime === 'number') {
        out.rtt = Math.max(out.rtt, r.currentRoundTripTime);
      }
    });
    if (recv + lost > 0) out.lossPct = Math.max(out.lossPct, lost / (recv + lost));
  } catch { /* */ }
  return out;
}

// Decisión con histéresis: ante CUALQUIER señal de problema baja un nivel ya; para
// SUBIR exige 3 muestras buenas seguidas (~9s) → estable, sin parpadeo de calidad.
export function decideLevel(sample: PeerSample, level: number, goodStreak: number): { level: number; goodStreak: number } {
  const bad = sample.limited === 'bandwidth' || sample.limited === 'cpu'
    || sample.lossPct > 0.05 || sample.rtt > 0.4;
  if (bad) return { level: Math.min(level + 1, MAX_LEVEL), goodStreak: 0 };
  const gs = goodStreak + 1;
  if (gs >= 3 && level > 0) return { level: level - 1, goodStreak: 0 };
  return { level, goodStreak: gs };
}

export function levelToQuality(level: number): NetQuality {
  if (level <= 1) return 'good';
  if (level === 2) return 'medium';
  return 'poor';
}
