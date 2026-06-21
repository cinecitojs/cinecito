import { describe, it, expect } from 'vitest';
import { computeTargetTime, resolveDrift } from '../sync';

const T0 = '2026-06-17T00:00:00.000Z';
const t0 = new Date(T0).getTime();

describe('computeTargetTime', () => {
  it('devuelve null sin sesión', () => {
    expect(computeTargetTime(null, t0)).toBeNull();
  });

  it('pausado: devuelve currentTime fijo sin importar el reloj', () => {
    const s = { currentTime: 42, isPlaying: false, updatedAt: T0 };
    expect(computeTargetTime(s, t0 + 10_000)).toBe(42);
  });

  it('reproduciendo: suma el tiempo transcurrido del servidor', () => {
    const s = { currentTime: 30, isPlaying: true, updatedAt: T0 };
    expect(computeTargetTime(s, t0 + 5_000)).toBeCloseTo(35, 5);
  });

  it('nunca devuelve negativo', () => {
    const s = { currentTime: 0, isPlaying: false, updatedAt: T0 };
    expect(computeTargetTime(s, t0)).toBe(0);
  });
});

describe('resolveDrift', () => {
  it('dentro de tolerancia → ok, rate 1', () => {
    expect(resolveDrift(10, 10.1)).toEqual({ kind: 'ok', rate: 1 });
  });

  it('deriva chica adelante → acelera', () => {
    const a = resolveDrift(10.5, 10);
    expect(a.kind).toBe('rate');
    expect(a.rate).toBe(1.05);
  });

  it('deriva chica atrás → frena', () => {
    const a = resolveDrift(10, 10.5);
    expect(a.kind).toBe('rate');
    expect(a.rate).toBe(0.95);
  });

  it('deriva grande → salto duro', () => {
    expect(resolveDrift(40, 10)).toEqual({ kind: 'seek', rate: 1 });
  });
});
