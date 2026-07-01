// One-off: recorta pochiv2.png (grilla 3x2 sobre fondo verde) en 6 PNGs
// transparentes (green-key) para usar a Pociné en los estados de la app.
const fs = require('fs');
const zlib = require('zlib');

// ── CRC32 ──
const CRC = (() => { const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

// ── Decode PNG (ct 2/6, no interlace) → {w,h,rgba} ──
function decode(path) {
  const buf = fs.readFileSync(path); let p = 8, ihdr = null; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8); const data = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), ct: data[9], il: data[12] };
    else if (type === 'IDAT') idat.push(data); else if (type === 'IEND') break; p += 12 + len; }
  if (ihdr.il !== 0) throw new Error('interlaced');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ct = ihdr.ct, bpp = ct === 6 ? 4 : 3, W = ihdr.w, H = ihdr.h, stride = W * bpp;
  const out = Buffer.alloc(stride * H);
  const paeth = (a, b, c) => { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  let pos = 0;
  for (let y = 0; y < H; y++) { const ft = raw[pos++]; for (let x = 0; x < stride; x++) { const v = raw[pos++]; const a = x >= bpp ? out[y * stride + x - bpp] : 0; const b = y > 0 ? out[(y - 1) * stride + x] : 0; const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r; if (ft === 0) r = v; else if (ft === 1) r = v + a; else if (ft === 2) r = v + b; else if (ft === 3) r = v + ((a + b) >> 1); else r = v + paeth(a, b, c); out[y * stride + x] = r & 255; } }
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0, j = 0; i < W * H; i++) { rgba[j++] = out[i * bpp]; rgba[j++] = out[i * bpp + 1]; rgba[j++] = out[i * bpp + 2]; rgba[j++] = bpp === 4 ? out[i * bpp + 3] : 255; }
  return { w: W, h: H, rgba };
}

// ── Crop + green key ──
function cropKey(src, x0, y0, cw, ch) {
  const o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y0 + y) * src.w + (x0 + x)) * 4, di = (y * cw + x) * 4;
    let R = src.rgba[si], G = src.rgba[si + 1], B = src.rgba[si + 2];
    const mx = Math.max(R, B);
    const g = G - mx;                               // "verdor"
    const bright = (R + G + B) / 3;
    let alpha = 255;
    if (g > 24) alpha = 0;                          // verde
    else if (g > 6) alpha = Math.round(255 * (24 - g) / 18); // borde (feather)
    if (bright < 72 && G >= R && G >= B) alpha = 0; // verde oscuro de esquinas
    if (bright > 188 && g > 5) alpha = 0;           // halo verde claro
    if (alpha > 0 && g > 0) G = mx + Math.min(4, Math.round(g * 0.2)); // anti green-spill duro
    o[di] = R; o[di + 1] = G; o[di + 2] = B; o[di + 3] = alpha;
  }
  return { w: cw, h: ch, rgba: o };
}

// ── Encode RGBA → PNG ──
function encode(img) {
  const { w, h, rgba } = img, stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const tb = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data]))); return Buffer.concat([len, tb, data, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const src = decode('pochiv2.png');
console.log('source', src.w, 'x', src.h);
const cw = Math.floor(src.w / 3), ch = Math.floor(src.h / 2);
const map = [
  [0, 0, 'pocine-hello'],     [1, 0, 'pocine-dream'],    [2, 0, 'pocine-search'],
  [0, 1, 'pocine-empty'],     [1, 1, 'pocine-celebrate'],[2, 1, 'pocine-notify'],
];
for (const [cx, cy, name] of map) {
  const img = cropKey(src, cx * cw, cy * ch, cw, ch);
  fs.writeFileSync(`apps/web/public/${name}.png`, encode(img));
  console.log('wrote', name, cw, 'x', ch);
}
console.log('done');
