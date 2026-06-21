import { describe, it, expect } from 'vitest';
import { normalizePermissions, DEFAULT_PERMISSIONS } from '../permissions';

describe('normalizePermissions', () => {
  it('null → defaults (todo host)', () => {
    expect(normalizePermissions(null)).toEqual(DEFAULT_PERMISSIONS);
    expect(normalizePermissions(undefined)).toEqual(DEFAULT_PERMISSIONS);
  });

  it('mezcla parcial: aplica los válidos, completa el resto con defaults', () => {
    const r = normalizePermissions({ pauseResume: 'everyone', seek: 'everyone' });
    expect(r.pauseResume).toBe('everyone');
    expect(r.seek).toBe('everyone');
    expect(r.addVideo).toBe('host');
    expect(r.removeVideo).toBe('host');
    expect(r.skip).toBe('host');
  });

  it('ignora valores inválidos', () => {
    const r = normalizePermissions({ addVideo: 'nope', skip: 123, pauseResume: 'everyone' } as any);
    expect(r.addVideo).toBe('host');
    expect(r.skip).toBe('host');
    expect(r.pauseResume).toBe('everyone');
  });

  it('ignora claves desconocidas', () => {
    const r = normalizePermissions({ hack: 'everyone' } as any);
    expect(r).toEqual(DEFAULT_PERMISSIONS);
    expect((r as any).hack).toBeUndefined();
  });
});
