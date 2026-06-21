// ============================================================
// apps/api/src/lib/validate.ts
// preHandler genérico de validación de body con Zod.
// Reemplaza el body por la versión parseada/normalizada y
// devuelve 400 con un mensaje legible si falla.
// ============================================================

import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const msg = result.error.issues
        .map((i) => `${i.path.join('.') || 'campo'}: ${i.message}`)
        .join('; ');
      reply.status(400).send({ error: msg || 'Datos inválidos' });
      return reply; // corta la cadena de preHandlers
    }
    request.body = result.data as any;
  };
}

// Convierte '' en undefined (útil para campos opcionales que llegan vacíos del form).
export const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
