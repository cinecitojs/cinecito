// ============================================================
// apps/api/src/lib/errors.ts
// Clasifica errores de conectividad con la base para responder
// mensajes amigables SIN filtrar host/puerto/stack al cliente.
// ============================================================

export const DB_DOWN_MESSAGE =
  'No pudimos completar tu pedido en este momento. Probá de nuevo en unos minutos.';

export const REGISTER_DB_DOWN_MESSAGE =
  'No pudimos completar el registro en este momento. Inténtalo nuevamente más tarde.';

export const GENERIC_ERROR_MESSAGE =
  'Ocurrió un error inesperado. Probá de nuevo en unos minutos.';

// Códigos de Prisma asociados a problemas de conexión/arranque del datasource.
const DB_CONN_CODES = new Set([
  'P1000', // authentication failed
  'P1001', // can't reach database server
  'P1002', // server reached but timed out
  'P1008', // operation timed out
  'P1009', // database already exists (no aplica, pero conexión ok)
  'P1010', // access denied
  'P1011', // TLS error
  'P1017', // server closed the connection
]);

export function isDbUnreachable(err: any): boolean {
  if (!err) return false;
  if (DB_CONN_CODES.has(err.code)) return true;
  if (err.name === 'PrismaClientInitializationError') return true;
  const msg = String(err.message || '');
  return /can't reach database server|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|connection (?:closed|terminated)/i.test(msg);
}
