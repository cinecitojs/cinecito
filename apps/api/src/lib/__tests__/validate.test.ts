import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateBody, emptyToUndefined } from '../validate';

function mockReply() {
  const r: any = { statusCode: 0, payload: undefined };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.send = (p: any) => { r.payload = p; return r; };
  return r;
}

const schema = z.object({
  name: z.string().trim().min(2, 'mínimo 2 caracteres'),
  age: z.number().optional(),
});

describe('validateBody', () => {
  it('input válido: normaliza el body y no responde error', async () => {
    const request: any = { body: { name: '  Juan  ' } };
    const reply = mockReply();
    const result = await validateBody(schema)(request, reply);
    expect(result).toBeUndefined();        // no cortó la cadena
    expect(reply.statusCode).toBe(0);      // no respondió
    expect(request.body.name).toBe('Juan'); // trim aplicado
  });

  it('input inválido: responde 400 con mensaje legible', async () => {
    const request: any = { body: { name: 'x' } };
    const reply = mockReply();
    const result = await validateBody(schema)(request, reply);
    expect(result).toBe(reply);            // cortó la cadena
    expect(reply.statusCode).toBe(400);
    expect(reply.payload.error).toContain('name');
    expect(reply.payload.error).toContain('mínimo 2');
  });

  it('body ausente: 400', async () => {
    const request: any = { body: undefined };
    const reply = mockReply();
    await validateBody(schema)(request, reply);
    expect(reply.statusCode).toBe(400);
  });
});

describe('emptyToUndefined', () => {
  it('convierte cadena vacía y null a undefined', () => {
    expect(emptyToUndefined('')).toBeUndefined();
    expect(emptyToUndefined(null)).toBeUndefined();
    expect(emptyToUndefined('hola')).toBe('hola');
    expect(emptyToUndefined(0)).toBe(0);
  });
});
