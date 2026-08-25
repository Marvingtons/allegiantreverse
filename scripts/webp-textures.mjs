/**
 * Re-encodes the two heavy globe textures as WebP.
 *
 * WHY: the readiness gate holds scroll until the globe can be drawn, and
 * measured on Slow 4G (1.6 Mbps) the gated payload was 3.39MB — about 17s of
 * transfer, which blew straight through the gate's 20s safety ceiling on
 * every cold load. The gate then opened on the timeout with nothing drawn,
 * which is the exact bug it was built to prevent. Fewer bytes is the only
 * real fix; WebP gets them at the same resolution.
 *
 * Only the colour map and the cloud plate are converted. The normal and
 * specular maps are 0.53MB combined — not worth the trip — and lossy
 * re-encoding of a normal map can band the lighting.
 *
 * Dev tool, not a build step. Output is committed.
 *   FOG_OUT=<repo>/public/textures node scripts/webp-textures.mjs
 */
import { writeFileSync, statSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const EXE = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DIR = process.env.FOG_OUT ?? path.join(process.cwd(), "public", "textures");
const PORT = process.env.PORT ?? "3211";

// [file, quality]. The cloud plate is a soft, low-frequency image and takes
// aggressive quality without showing it; the colour map carries coastlines.
const JOBS = [
  ["earth_atmos_2048.jpg", 0.86],
  ["earth_clouds_4k.jpg", 0.8],
];

const browser = await puppeteer.launch({ executablePath: EXE, headless: "new", protocolTimeout: 240000 });
const page = await browser.newPage();
// Served over the dev/prod server: file:// canvases are tainted by the image
// and toDataURL throws a SecurityError.
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 120000 });

for (const [file, q] of JOBS) {
  const dataUrl = await page.evaluate(
    async (src, quality) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/webp", quality);
    },
    `/textures/${file}`,
    q
  );
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  const out = file.replace(/\.jpg$/, ".webp");
  writeFileSync(path.join(DIR, out), buf);
  const before = statSync(path.join(DIR, file)).size;
  console.log(
    `${out.padEnd(24)} ${(before / 1048576).toFixed(2)}MB -> ${(buf.length / 1048576).toFixed(2)}MB` +
      `  (-${Math.round((1 - buf.length / before) * 100)}%)`
  );
}
await browser.close();
