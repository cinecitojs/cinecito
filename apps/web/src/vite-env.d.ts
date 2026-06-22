/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // TURN (opcional) para que la llamada conecte detrás de NAT estricto.
  readonly VITE_TURN_URL?: string;        // ej. turn:tu-servidor:3478 (coma-separable)
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
