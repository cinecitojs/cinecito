// apps/web/src/lib/mediaConstraints.ts
// Constraints de cámara/micrófono pensadas para FLUIDEZ en una llamada mesh P2P
// (cada peer envía su video a todos). Pedir la cámara al máximo por defecto satura
// la subida y entrecorta; acá la acotamos y topeamos el bitrate de subida por peer.

import { getSettings } from '../store/useSettings';

// Audio: cancelación de eco/ruido y nivelado automático para que se escuche limpio.
export function audioConstraints(): MediaTrackConstraints {
  const { micDeviceId } = getSettings();
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ...(micDeviceId ? { deviceId: { ideal: micDeviceId } } : {}),
  };
}

// Video: 540p / 30fps como objetivo (techo 720p). Suficiente para una cámara de
// acompañamiento y mucho más fluido que pedir la resolución nativa.
export function videoConstraints(): MediaTrackConstraints {
  const { camDeviceId } = getSettings();
  return {
    width: { ideal: 960, max: 1280 },
    height: { ideal: 540, max: 720 },
    frameRate: { ideal: 30, max: 30 },
    ...(camDeviceId ? { deviceId: { ideal: camDeviceId } } : {}),
  };
}

// Topa el bitrate de SUBIDA del video de cada conexión: evita que un peer acapare
// el ancho de banda y entrecorte a todos. Best-effort (algunos navegadores no lo
// soportan → se ignora sin romper la llamada).
export async function capSenderBitrate(pc: RTCPeerConnection, maxKbps = 600): Promise<void> {
  try {
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings[0].maxBitrate = maxKbps * 1000;
    (params.encodings[0] as any).maxFramerate = 30;
    await sender.setParameters(params);
  } catch { /* no soportado: la llamada sigue igual */ }
}
