import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectSource, defaultTitle, resolveVideoSource, resolveVideoSourceAsync } from '../videoSource';

describe('detectSource', () => {
  it('YouTube watch?v=', () => {
    expect(detectSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ source: 'youtube', valid: true });
  });
  it('youtu.be corto', () => {
    expect(detectSource('https://youtu.be/dQw4w9WgXcQ')).toEqual({ source: 'youtube', valid: true });
  });
  it('YouTube shorts', () => {
    expect(detectSource('https://www.youtube.com/shorts/abc123xyz')).toEqual({ source: 'youtube', valid: true });
  });
  it('Vimeo válido', () => {
    expect(detectSource('https://vimeo.com/123456789')).toEqual({ source: 'vimeo', valid: true });
  });
  it('Vimeo inválido (sin id numérico)', () => {
    expect(detectSource('https://vimeo.com/abc')).toEqual({ source: 'vimeo', valid: false });
  });
  it('HLS .m3u8', () => {
    expect(detectSource('https://cdn.x.com/live/s.m3u8?t=1')).toEqual({ source: 'hls', valid: true });
  });
  it('MP4 directo', () => {
    expect(detectSource('https://x.com/clip.mp4')).toEqual({ source: 'direct', valid: true });
  });
  it('Dailymotion /video/', () => {
    expect(detectSource('https://www.dailymotion.com/video/x7tgad0')).toEqual({ source: 'dailymotion', valid: true });
  });
  it('Dailymotion con sufijo de título', () => {
    expect(detectSource('https://www.dailymotion.com/video/x7tgad0_mi-video')).toEqual({ source: 'dailymotion', valid: true });
  });
  it('Dailymotion corto dai.ly', () => {
    expect(detectSource('https://dai.ly/x7tgad0')).toEqual({ source: 'dailymotion', valid: true });
  });
  it('PeerTube /w/ shortUUID', () => {
    expect(detectSource('https://framatube.org/w/mwJKbdCr1eHwHCwHkWjP4A')).toEqual({ source: 'peertube', valid: true });
  });
  it('PeerTube /videos/watch/ UUID', () => {
    expect(detectSource('https://video.ploud.fr/videos/watch/9c9de5e8-0a1e-484a-b099-e80766180a6d')).toEqual({ source: 'peertube', valid: true });
  });
  it('Archive.org archivo directo → direct', () => {
    expect(detectSource('https://archive.org/download/foo/foo.mp4')).toEqual({ source: 'direct', valid: true });
  });
  it('no-URL → inválido', () => {
    expect(detectSource('hola mundo')).toEqual({ source: 'direct', valid: false });
  });
  it('protocolo no http(s) → inválido', () => {
    expect(detectSource('ftp://x.com/a.mp4')).toEqual({ source: 'direct', valid: false });
  });
});

describe('resolveVideoSource (normalización)', () => {
  it('Google Drive: normaliza a URL de descarga directa', () => {
    const r = resolveVideoSource('https://drive.google.com/file/d/1AbC_dEfGhIjKlMnOpQrStUvWxYz012/view?usp=sharing');
    expect(r.source).toBe('drive');
    expect(r.valid).toBe(true);
    expect(r.url).toBe('https://drive.google.com/uc?export=download&id=1AbC_dEfGhIjKlMnOpQrStUvWxYz012');
  });

  it('Google Drive: acepta ?id= (open/uc)', () => {
    const r = resolveVideoSource('https://drive.google.com/open?id=1AbC_dEfGhIjKlMnOpQrStUvWxYz012');
    expect(r.valid).toBe(true);
    expect(r.url).toContain('uc?export=download&id=1AbC_dEfGhIjKlMnOpQrStUvWxYz012');
  });

  it('Google Drive: carpeta (sin id de archivo) → inválido con error claro', () => {
    const r = resolveVideoSource('https://drive.google.com/drive/folders/xyz');
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('MEGA: rechazo limpio con error claro', () => {
    const r = resolveVideoSource('https://mega.nz/file/abc123#key');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/sincroniz/i);
  });

  it('YouTube/Vimeo: conservan la URL original', () => {
    expect(resolveVideoSource('https://youtu.be/dQw4w9WgXcQ').url).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(resolveVideoSource('https://vimeo.com/123456789').valid).toBe(true);
  });

  it('PeerTube: normaliza al iframe de embed', () => {
    const r = resolveVideoSource('https://framatube.org/w/mwJKbdCr1eHwHCwHkWjP4A');
    expect(r.source).toBe('peertube');
    expect(r.valid).toBe(true);
    expect(r.url).toBe('https://framatube.org/videos/embed/mwJKbdCr1eHwHCwHkWjP4A');
  });

  it('Archive.org /details: marcado como pendiente en el resolver síncrono', () => {
    const r = resolveVideoSource('https://archive.org/details/some_item');
    expect(r.valid).toBe(false);
    expect(r.pending).toBe(true);
  });
});

describe('resolveVideoSourceAsync (Archive.org)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('resuelve /details al mejor archivo mp4 vía metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ files: [{ name: 'thumb.jpg', format: 'JPEG' }, { name: 'pelicula.mp4', format: 'h.264' }] }),
    })) as any);
    const r = await resolveVideoSourceAsync('https://archive.org/details/some_item');
    expect(r.valid).toBe(true);
    expect(r.source).toBe('direct');
    expect(r.url).toBe('https://archive.org/download/some_item/pelicula.mp4');
    expect(r.pending).toBeUndefined();
  });

  it('fallback limpio si no hay archivo reproducible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ files: [{ name: 'x.txt' }] }) })) as any);
    const r = await resolveVideoSourceAsync('https://archive.org/details/some_item');
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('fallback limpio si la metadata falla (red/timeout)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }) as any);
    const r = await resolveVideoSourceAsync('https://archive.org/details/some_item');
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('archivo directo no llama a la red', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy as any);
    const r = await resolveVideoSourceAsync('https://archive.org/download/foo/foo.mp4');
    expect(r.valid).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('YouTube pasa sin tocar red y sin `pending`', async () => {
    const r = await resolveVideoSourceAsync('https://youtu.be/dQw4w9WgXcQ');
    expect(r).toEqual({ source: 'youtube', valid: true, url: 'https://youtu.be/dQw4w9WgXcQ' });
  });
});

describe('defaultTitle no expone fuentes internas', () => {
  it('drive → título genérico', () => {
    expect(defaultTitle('drive')).toBe('Video');
  });
});

describe('defaultTitle', () => {
  it('mapea cada fuente', () => {
    expect(defaultTitle('youtube')).toMatch(/YouTube/);
    expect(defaultTitle('vimeo')).toMatch(/Vimeo/);
    expect(defaultTitle('dailymotion')).toMatch(/Dailymotion/);
    expect(defaultTitle('peertube')).toMatch(/PeerTube/);
    expect(defaultTitle('hls')).toMatch(/vivo/);
    expect(defaultTitle('direct')).toBe('Video');
  });
});
