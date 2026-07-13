// Generates branded Flowlet PWA PNG icons (wallet mark) without external deps.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

// ── Flowlet mark, mirrors public/favicon.svg on a 64-unit grid ──
const VIOLET = [139, 92, 246];
const DARK = [10, 10, 11];
const LIGHT = [196, 181, 253];

function inRoundRect(gx, gy, x, y, w, h, r) {
  if (gx < x || gx > x + w || gy < y || gy > y + h) return false;
  const inX = gx >= x + r && gx <= x + w - r;
  const inY = gy >= y + r && gy <= y + h - r;
  if (inX || inY) return true;
  const cx = gx < x + r ? x + r : x + w - r;
  const cy = gy < y + r ? y + r : y + h - r;
  return (gx - cx) ** 2 + (gy - cy) ** 2 <= r * r;
}

function inCircle(gx, gy, cx, cy, r) {
  return (gx - cx) ** 2 + (gy - cy) ** 2 <= r * r;
}

// Layers painted back-to-front; first hit wins.
function colorAt(gx, gy) {
  if (inCircle(gx, gy, 39, 34, 4)) return LIGHT; // clasp button
  if (inRoundRect(gx, gy, 20, 22, 27, 24, 3)) return DARK; // wallet body
  if (inRoundRect(gx, gy, 17, 18, 26, 8, 3)) return LIGHT; // top flap
  return VIOLET; // full-bleed tile (maskable-safe, no transparent corners)
}

function png(size) {
  const scale = size / 64;
  const ss = 2; // 2x super-sample for smooth edges
  const row = Buffer.alloc(1 + size * 3);
  const rows = [];
  for (let py = 0; py < size; py++) {
    row.fill(0);
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = colorAt(
            (px + (sx + 0.5) / ss) / scale,
            (py + (sy + 0.5) / ss) / scale,
          );
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = ss * ss;
      row[1 + px * 3] = Math.round(r / n);
      row[1 + px * 3 + 1] = Math.round(g / n);
      row[1 + px * 3 + 2] = Math.round(b / n);
    }
    rows.push(Buffer.from(row));
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const idat = deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
writeFileSync("public/pwa-192.png", png(192));
writeFileSync("public/pwa-512.png", png(512));
writeFileSync("public/apple-touch-icon.png", png(180));
console.log("Generated Flowlet wallet icons: pwa-192, pwa-512, apple-touch-icon.");
