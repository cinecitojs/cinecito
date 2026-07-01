import { describe, it, expect } from 'vitest';
import { parseVideoUrl, sourceToKind } from '../videoSources';

describe('parseVideoUrl', () => {
  it('detecta YouTube watch?v=', () => {
    const r = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(r.kind).toBe('youtube');
    expect(r.valid).toBe(true);
    expect(r.providerId).toBe('dQw4w9WgXcQ');
  });

  it('detecta youtu.be corto', () => {
    const r = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(r.kind).toBe('youtube');
    expect(r.providerId).toBe('dQw4w9WgXcQ');
  });

  it('detecta YouTube Shorts', () => {
    const r = parseVideoUrl('https://www.youtube.com/shorts/abc123xyz');
    expect(r.kind).toBe('youtube');
    expect(r.valid).toBe(true);
  });

  it('detecta Vimeo', () => {
    const r = parseVideoUrl('https://vimeo.com/123456789');
    expect(r.kind).toBe('vimeo');
    expect(r.valid).toBe(true);
    expect(r.providerId).toBe('123456789');
  });

  it('marca Vimeo inválido sin id numérico', () => {
    const r = parseVideoUrl('https://vimeo.com/abc');
    expect(r.kind).toBe('vimeo');
    expect(r.valid).toBe(false);
  });

  it('detecta HLS .m3u8', () => {
    const r = parseVideoUrl('https://cdn.example.com/live/stream.m3u8?token=x');
    expect(r.kind).toBe('hls');
    expect(r.valid).toBe(true);
  });

  it('detecta MP4 directo', () => {
    const r = parseVideoUrl('https://example.com/clip.mp4');
    expect(r.kind).toBe('direct');
    expect(r.valid).toBe(true);
  });

  it('detecta Dailymotion (con sufijo de título)', () => {
    const r = parseVideoUrl('https://www.dailymotion.com/video/x7tgad0_mi-video');
    expect(r.kind).toBe('dailymotion');
    expect(r.valid).toBe(true);
    expect(r.providerId).toBe('x7tgad0');
  });

  it('detecta Dailymotion corto dai.ly', () => {
    const r = parseVideoUrl('https://dai.ly/x7tgad0');
    expect(r.kind).toBe('dailymotion');
    expect(r.valid).toBe(true);
  });

  it('detecta PeerTube y normaliza a embed', () => {
    const r = parseVideoUrl('https://framatube.org/w/mwJKbdCr1eHwHCwHkWjP4A');
    expect(r.kind).toBe('peertube');
    expect(r.valid).toBe(true);
    expect(r.url).toBe('https://framatube.org/videos/embed/mwJKbdCr1eHwHCwHkWjP4A');
  });

  it('Archive.org /details → direct válido (el servidor resuelve el archivo)', () => {
    const r = parseVideoUrl('https://archive.org/details/some_item');
    expect(r.kind).toBe('direct');
    expect(r.valid).toBe(true);
    expect(r.label).toBe('Archive.org');
  });

  it('Archive.org archivo directo → direct', () => {
    const r = parseVideoUrl('https://archive.org/download/foo/foo.mp4');
    expect(r.kind).toBe('direct');
    expect(r.valid).toBe(true);
  });

  it('rechaza texto que no es URL', () => {
    const r = parseVideoUrl('no soy una url');
    expect(r.valid).toBe(false);
  });

  it('rechaza protocolos no http(s)', () => {
    const r = parseVideoUrl('ftp://example.com/x.mp4');
    expect(r.valid).toBe(false);
  });

  it('acepta http(s) desconocido como direct (se intentará reproducir)', () => {
    const r = parseVideoUrl('https://example.com/stream');
    expect(r.kind).toBe('direct');
    expect(r.valid).toBe(true);
  });

  it('Google Drive: archivo público → direct con etiqueta genérica', () => {
    const r = parseVideoUrl('https://drive.google.com/file/d/1AbC_dEfGhIjKlMnOpQrStUvWxYz012/view?usp=sharing');
    expect(r.kind).toBe('direct');
    expect(r.valid).toBe(true);
    expect(r.label).toBe('Enlace de video'); // no expone "Google Drive"
  });

  it('Google Drive: sin id de archivo → inválido', () => {
    const r = parseVideoUrl('https://drive.google.com/drive/folders/xyz');
    expect(r.valid).toBe(false);
  });

  it('MEGA: se rechaza limpiamente (no sincronizable)', () => {
    const r = parseVideoUrl('https://mega.nz/file/abc123#key');
    expect(r.valid).toBe(false);
    expect(r.label).not.toMatch(/mega/i);
  });
});

describe('sourceToKind', () => {
  it('mapea los sources guardados en DB', () => {
    expect(sourceToKind('youtube')).toBe('youtube');
    expect(sourceToKind('vimeo')).toBe('vimeo');
    expect(sourceToKind('dailymotion')).toBe('dailymotion');
    expect(sourceToKind('peertube')).toBe('peertube');
    expect(sourceToKind('hls')).toBe('hls');
    expect(sourceToKind('upload')).toBe('upload');
    expect(sourceToKind('direct')).toBe('direct');
    expect(sourceToKind('drive')).toBe('direct');
    expect(sourceToKind('loquesea')).toBe('direct');
  });
});
