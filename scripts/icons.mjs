// Generates the favicon / app-icon set from the AR monogram in public/icon.svg.
// Run: node scripts/icons.mjs
//
// Every raster is the monogram (navy A + gold S) centered on the brand ink
// ground, inset by the given padding. The .ico bundles 16/32/48. The SVG
// itself (public/icon.svg) is transparent and hand-authored — this only
// produces the raster variants, so the set stays reproducible. The <link>
// tags are declared in app/layout.tsx's metadata.icons (config-based): Next's
// icon file convention cannot emit an SVG and a PNG icon link together, so the
// set is wired explicitly.
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const svg = readFileSync(root + "public/icon.svg");
const INK = { r: 0x1f, g: 0x21, b: 0x24, alpha: 1 }; // --ink (#1F2124)

/** Monogram rasterized to fit the inset content box, transparent-padded to a
    square so it composites dead-centre on the ink ground. */
const monogram = (size, inset) =>
  sharp(svg)
    .resize(size - inset * 2, size - inset * 2, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

/** Square ink icon with the monogram centred. */
async function inkIcon(size, inset) {
  const overlay = await monogram(size, inset);
  return sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: overlay, gravity: "center" }])
    .png()
    .toBuffer();
}

const write = (rel, buf) => {
  writeFileSync(root + rel, buf);
  console.log("wrote", rel, `(${buf.length} bytes)`);
};

// Raster icons, referenced from metadata.icons in app/layout.tsx.
write("public/icon.png", await inkIcon(32, 3));
write("public/apple-icon.png", await inkIcon(180, 24));

// favicon.ico — 16 / 32 / 48 multi-size from the ink raster.
write("public/favicon.ico", await pngToIco([
  await inkIcon(16, 2),
  await inkIcon(32, 3),
  await inkIcon(48, 4),
]));

// Manifest / Android maskable renders.
write("public/icon-192.png", await inkIcon(192, 22));
write("public/icon-512.png", await inkIcon(512, 60));

console.log("done");
