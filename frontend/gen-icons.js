const fs = require('fs');
const zlib = require('zlib');

function createPNG(size) {
  const w = size, h = size;
  const pixels = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const cx = x - w / 2, cy = y - h / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const r = w * 0.48;

      if (dist > r) {
        pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 0;
      } else {
        // Dark navy base
        pixels[i]   = 10;
        pixels[i+1] = 25;
        pixels[i+2] = 80;
        pixels[i+3] = 255;

        // Green cricket field inner circle
        if (dist < r * 0.52) {
          pixels[i]   = 20;
          pixels[i+1] = 140;
          pixels[i+2] = 60;
          pixels[i+3] = 255;
        }

        // Cream pitch strip (vertical center)
        if (Math.abs(cx) < w * 0.045 && Math.abs(cy) < h * 0.28) {
          pixels[i]   = 240;
          pixels[i+1] = 230;
          pixels[i+2] = 180;
          pixels[i+3] = 255;
        }

        // Gold border ring
        if (dist > r * 0.9 && dist <= r) {
          pixels[i]   = 220;
          pixels[i+1] = 170;
          pixels[i+2] = 40;
          pixels[i+3] = 255;
        }
      }
    }
  }

  function crc32(buf) {
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(0); // filter: None
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      rows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }
  const rawRows = Buffer.from(rows);
  const compressed = zlib.deflateSync(rawRows);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180));
console.log('PWA icons generated successfully');
