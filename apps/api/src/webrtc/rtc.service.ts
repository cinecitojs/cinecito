// ============================================================
// apps/api/src/webrtc/rtc.service.ts  — FASE 4
// Configuración de servidores ICE (STUN/TURN)
// REEMPLAZA el archivo existente
// ============================================================

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// Servidores STUN públicos de Google (gratuitos, para descubrir IP pública)
const STUN_SERVERS: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// TURN servers (opcionales): necesarios cuando los peers están detrás de
// NAT estricto o firewalls corporativos. Se configuran por variables de entorno.
function getTurnServers(): IceServer[] {
  const turnUrl    = process.env.TURN_URL;
  const turnUser   = process.env.TURN_USERNAME;
  const turnCred   = process.env.TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    return [{ urls: turnUrl, username: turnUser, credential: turnCred }];
  }
  return [];
}

// Lista completa de servidores ICE que usa el cliente
export const defaultIceServers: IceServer[] = [
  ...STUN_SERVERS,
  ...getTurnServers(),
];

// Helper para exponer la config al frontend
export function getIceConfig() {
  return { iceServers: defaultIceServers };
}
