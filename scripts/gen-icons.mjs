// Genera icon-192.png e icon-512.png a partir de favicon.svg dibujando
// un PNG simple en Node puro (sin dependencias).
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

function crc32(buf) {
  let c, crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Dibuja un cuadrado redondeado verde con una "línea de progreso" diagonal.
function renderIcon(size) {
  const { r, g, b } = { r: 16, g: 185, b: 129 }; // #10b981
  const dark = { r: 11, g: 18, b: 34 };
  const rad = Math.round(size * 0.19);
  const stroke = Math.max(2, Math.round(size * 0.085));
  const px = [];
  for (let y = 0; y < size; y++) {
    px.push(0); // filtro None
    for (let x = 0; x < size; x++) {
      // esquinas redondeadas del rect interior
      const inset = Math.round(size * 0.09);
      const cx = Math.min(Math.max(x, inset), size - inset);
      const cy = Math.min(Math.max(y, inset), size - inset);
      const corner = (x < inset || x >= size - inset) && (y < inset || y >= size - inset);
      const dist2 = (x - cx) ** 2 + (y - cy) ** 2;
      const insideCorner = !corner || dist2 <= rad * rad;
      const insideRect = x >= inset && x < size - inset && y >= inset && y < size - inset;
      let c = { r: 0, g: 0, b: 0, a: 0 };
      if (insideRect || insideCorner) {
        c = { r, g, b, a: 255 };
        // franja diagonal oscura (línea de tendencia)
        const t = y - (size - x) * 0.62;
        const gap = Math.abs(t) < stroke / 2 && x > size * 0.28 && x < size * 0.86;
        if (gap) c = { ...dark, a: 255 };
      }
      px.push(c.r, c.g, c.b, c.a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.from(px))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), renderIcon(size));
  console.log(`icon-${size}.png generado`);
}
