// Generates the app icons from a single source SVG so they stay in sync and
// can be regenerated any time the brand changes.
//
//   node scripts/generate-icons.mjs
//
// Outputs:
//   public/icon-192.png        (PWA manifest, maskable)
//   public/icon-512.png        (PWA manifest, maskable)
//   src/app/icon.png           (favicon — Next serves this automatically)
//   src/app/apple-icon.png     (iOS home-screen — Next serves this automatically)
//
// Icons are full-bleed (no transparent padding) so they survive the circular /
// squircle masks that Android and iOS apply, with the plane kept inside the
// ~60% safe zone.

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const BRAND = "#002D72"; // Hopkins blue
const FG = "#ffffff";

// Material "flight" glyph, drawn in a 24x24 box.
const PLANE =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";

function svg(size) {
  const scale = (0.52 * size) / 24;
  const offset = 0.24 * size; // (size - 24*scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="${PLANE}" fill="${FG}"/>
  </g>
</svg>`;
}

async function png(size, outPath) {
  const full = resolve(root, outPath);
  await mkdir(dirname(full), { recursive: true });
  await sharp(Buffer.from(svg(size))).png().toFile(full);
  console.log(`  ✓ ${outPath} (${size}x${size})`);
}

console.log("Generating icons…");
await png(192, "public/icon-192.png");
await png(512, "public/icon-512.png");
await png(256, "src/app/icon.png");
await png(180, "src/app/apple-icon.png");
console.log("Done.");
