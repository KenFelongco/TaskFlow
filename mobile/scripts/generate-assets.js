const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = makeCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(width, height, drawFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createPngChunk('IHDR', ihdr);

  // Scanlines
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', compressed);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Icon (1024x1024): Deep Violet with gradient and stylized Checkmark / Card
const iconBuf = generatePng(1024, 1024, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w * 0.42);
  const dy = (y - cy) / (h * 0.42);
  const distSq = dx * dx + dy * dy;

  // Background deep violet gradient (#2A246B to #1E1B4B)
  const t = y / h;
  let r = Math.round(42 * (1 - t) + 30 * t);
  let g = Math.round(36 * (1 - t) + 27 * t);
  let b = Math.round(107 * (1 - t) + 75 * t);

  // Rounded icon container (squircle)
  const p = Math.pow(Math.abs((x - cx) / (w * 0.38)), 4) + Math.pow(Math.abs((y - cy) / (h * 0.38)), 4);
  if (p <= 1.0) {
    // Subtle inner glowing border
    if (p > 0.92) {
      r = 91; g = 79; b = 196; // #5B4FC4
    } else {
      // Checkmark geometry
      // Checkmark: line from (cx - 160, cy) to (cx - 40, cy + 120) to (cx + 180, cy - 140)
      const inCheck = isInCheckmark(x, y, cx, cy);
      if (inCheck) {
        return [255, 255, 255, 255]; // Pure white checkmark
      }
    }
  }

  return [r, g, b, 255];
});
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconBuf);
console.log('✅ Generated assets/icon.png (1024x1024)');

// 2. Adaptive Icon (1024x1024): Transparent background with glowing white/violet emblem
const adaptiveBuf = generatePng(1024, 1024, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const inCheck = isInCheckmark(x, y, cx, cy, 1.1);
  if (inCheck) {
    return [255, 255, 255, 255];
  }
  return [0, 0, 0, 0]; // Transparent for adaptive foreground
});
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveBuf);
console.log('✅ Generated assets/adaptive-icon.png (1024x1024)');

// 3. Splash (1024x1024): Solid background #2A246B with centered emblem
const splashBuf = generatePng(1024, 1024, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const inCheck = isInCheckmark(x, y, cx, cy, 0.9);
  if (inCheck) {
    return [255, 255, 255, 255];
  }
  // Brand color: #2A246B (42, 36, 107)
  return [42, 36, 107, 255];
});
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashBuf);
console.log('✅ Generated assets/splash.png (1024x1024)');

// 4. Favicon (48x48)
const favBuf = generatePng(48, 48, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const inCheck = isInCheckmark(x, y, cx, cy, 0.7);
  if (inCheck) {
    return [255, 255, 255, 255];
  }
  return [42, 36, 107, 255];
});
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), favBuf);
console.log('✅ Generated assets/favicon.png (48x48)');

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function isInCheckmark(px, py, cx, cy, scale = 1.0) {
  const thickness = 38 * scale;
  const p1x = cx - 140 * scale, p1y = cy + 10 * scale;
  const p2x = cx - 35 * scale, p2y = cy + 115 * scale;
  const p3x = cx + 155 * scale, p3y = cy - 105 * scale;

  const d1 = distToSegment(px, py, p1x, p1y, p2x, p2y);
  const d2 = distToSegment(px, py, p2x, p2y, p3x, p3y);

  return Math.min(d1, d2) <= thickness;
}
