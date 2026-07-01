import { describe, it, expect } from 'vitest';
import { detectSource, defaultTitle, resolveVideoSource } from '../videoSource';

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
    expect(defaultTitle('hls')).toMatch(/vivo/);
    expect(defaultTitle('direct')).toBe('Video');
  });
});
