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
});

describe('sourceToKind', () => {
  it('mapea los sources guardados en DB', () => {
    expect(sourceToKind('youtube')).toBe('youtube');
    expect(sourceToKind('vimeo')).toBe('vimeo');
    expect(sourceToKind('hls')).toBe('hls');
    expect(sourceToKind('upload')).toBe('upload');
    expect(sourceToKind('direct')).toBe('direct');
    expect(sourceToKind('loquesea')).toBe('direct');
  });
});
