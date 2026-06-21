import { describe, it, expect } from 'vitest';
import { detectSource, defaultTitle } from '../videoSource';

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

describe('defaultTitle', () => {
  it('mapea cada fuente', () => {
    expect(defaultTitle('youtube')).toMatch(/YouTube/);
    expect(defaultTitle('vimeo')).toMatch(/Vimeo/);
    expect(defaultTitle('hls')).toMatch(/vivo/);
    expect(defaultTitle('direct')).toBe('Video');
  });
});
