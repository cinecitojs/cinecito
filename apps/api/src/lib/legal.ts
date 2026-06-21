// ============================================================
// apps/api/src/lib/legal.ts
// Versiones vigentes de los documentos legales. Es la fuente de verdad que se
// guarda como evidencia al aceptar (LegalAcceptance.docVersion) y la que el front
// consulta vía GET /legal/versions. Al cambiar un documento de forma sustancial,
// subí su versión acá → permite detectar quién aceptó qué versión y re-solicitar.
// ============================================================

export type LegalDocType = 'terms' | 'privacy' | 'cookies' | 'marketing';

export const LEGAL_VERSIONS: Record<LegalDocType, string> = {
  terms: '1.0',
  privacy: '1.0',
  cookies: '1.0',
  marketing: '1.0',
};

// Fecha de vigencia mostrada al usuario (informativa).
export const LEGAL_EFFECTIVE_DATE = '2026-06-20';

export const LEGAL_DOC_TYPES: LegalDocType[] = ['terms', 'privacy', 'cookies', 'marketing'];

export function isLegalDocType(v: string): v is LegalDocType {
  return (LEGAL_DOC_TYPES as string[]).includes(v);
}
