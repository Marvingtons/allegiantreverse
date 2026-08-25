/**
 * Bakes the cover fog's two puff decks into static sprites.
 *
 * WHY: the decks were 11 live DOM elements each carrying filter: blur(44–70px)
 * at 30–70vw, transformed every scroll frame alongside the WebGL globe. That
 * is an enormous per-frame raster and it froze the renderer on the live site.
 * Blur is a constant here — it never animates — so it belongs in a texture,
 * not in the compositor. After this the transition animates transform and
 * opacity only.
 *
 * Needs puppeteer-core + a local Chrome; it is a dev tool, not a build step,
 * so it is not a project dependency. Run it from anywhere that has one:
 *
 *   FOG_OUT=<repo>/public/textures node scripts/bake-fog.mjs
 *
 * Re-run whenever the deck composition changes. Output is committed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const EXE = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = process.env.FOG_OUT ?? path.join(process.cwd(), "public", "textures");
const W = 1840;
// HEADROOM. The first bake ran the topmost puffs right up to y=9 with a
// 38px blur: the blur was CLIPPED by the canvas edge, and a clipped gaussian
// is a hard line. That printed a dead-straight seam across the full width of
// the frame at the deck's leading edge. Every puff now sits at least ~3σ
// below the top of the canvas.
const H = 760;
const PAD = 128;

// Tones are the --fog-* ramp. The spread is deliberately wider than the CSS
// version was: three near-identical tones under a 60px blur average out to a
// flat wash, which is exactly why the deck read as a gradient.
const FOG = { f0: "#c3c9ce", f1: "#ced2d6", f2: "#dadde0", f3: "#e7eaec", hi: "#f2f4f5" };

// [x, y, w, h, blur, colour] in sprite pixels. Tops are staggered so the
// aggregate crown line is irregular — that variation IS the silhouette.
const FRONT = [
  [-86, 62, 778, 210, 28, FOG.f2],
  [259, 148, 605, 168, 24, FOG.hi],
  [490, 4, 662, 232, 34, FOG.f1],
  [792, 122, 547, 158, 24, FOG.f3],
  [1008, 40, 720, 220, 30, FOG.hi],
  [1267, 176, 490, 148, 22, FOG.f2],
  [150, 214, 520, 165, 28, FOG.f3],
  [900, 236, 560, 154, 26, FOG.f2],
  [610, 196, 430, 140, 22, FOG.hi],
];
const BACK = [
  [-58, 104, 893, 198, 58, FOG.f0],
  [374, 26, 806, 238, 66, FOG.f1],
  [749, 130, 691, 178, 54, FOG.f0],
  [1066, 64, 749, 218, 62, FOG.f1],
  [173, 182, 576, 139, 50, FOG.f1],
];

for (const list of [FRONT, BACK]) for (const p of list) p[1] += PAD;

const browser = await puppeteer.launch({ executablePath: EXE, headless: "new" });
const page = await browser.newPage();

const bake = (puffs) =>
  page.evaluate(
    async (list, w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      for (const [px, py, pw, ph, blur, colour] of list) {
        x.save();
        x.filter = `blur(${blur}px)`;
        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(pw, ph) / 2);
        g.addColorStop(0, colour);
        // Fade to a TRANSPARENT VERSION OF THE SAME COLOUR — fading to
        // transparent-black drags the midpoint toward neutral grey.
        const r = parseInt(colour.slice(1, 3), 16);
        const gg = parseInt(colour.slice(3, 5), 16);
        const b = parseInt(colour.slice(5, 7), 16);
        g.addColorStop(0.55, `rgba(${r},${gg},${b},0.85)`);
        g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        x.fillStyle = g;
        x.beginPath();
        x.ellipse(cx, cy, pw / 2, ph / 2, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
      }
      return c.toDataURL("image/webp", 0.92);
    },
    puffs,
    W,
    H
  );

mkdirSync(OUT, { recursive: true });
for (const [name, puffs] of [["fog-front", FRONT], ["fog-back", BACK]]) {
  const url = await bake(puffs);
  const buf = Buffer.from(url.split(",")[1], "base64");
  writeFileSync(path.join(OUT, `${name}.webp`), buf);
  console.log(`${name}.webp  ${W}x${H}  ${Math.round(buf.length / 1024)}KB`);
}
await browser.close();
