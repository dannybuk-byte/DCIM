/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const { PNG } = require('pngjs');

function hexToRgb(hex) {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function writeSolidPng(filePath, size, hexColor) {
  const { r, g, b } = hexToRgb(hexColor);
  const png = new PNG({ width: size, height: size });

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const icon192 = path.join(publicDir, 'icon-192.png');
  const icon512 = path.join(publicDir, 'icon-512.png');

  if (!fs.existsSync(publicDir)) {
    console.error('❌ public/ directory not found:', publicDir);
    process.exit(1);
  }

  const bg = '#0f172a';

  let wrote = 0;
  if (!fs.existsSync(icon192)) {
    writeSolidPng(icon192, 192, bg);
    wrote++;
  }
  if (!fs.existsSync(icon512)) {
    writeSolidPng(icon512, 512, bg);
    wrote++;
  }

  if (wrote === 0) {
    console.log('✅ PWA icons already exist (skipping generation)');
  } else {
    console.log(`✅ Generated ${wrote} PWA icon(s) in public/`);
  }
}

main();
