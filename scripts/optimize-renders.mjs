/**
 * Convert the Cycles beauty PNGs into kiosk-served WebP.
 *
 * The attractor hero is the first thing a visitor sees on a large panel,
 * so quality is deliberately high (q88, effort 6). The previous webps were
 * 16-22 KB — heavily over-compressed, which is what made the hero look
 * blurry/banded next to the live model. ~150-400 KB each at 1920x1080 is
 * fine for a kiosk served over LAN/localhost.
 *
 * Reads:  assets/3d/espresso/renders/espresso_{front,three_q,side,detail}.png
 * Writes: public/renders/espresso_{front,three_q,side,detail}.webp
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "assets", "3d", "espresso", "renders");
const OUT_DIR = path.join(ROOT, "public", "renders");

const VIEWS = ["front", "three_q", "side", "detail"];

const fmtKB = (n) => `${(n / 1024).toFixed(1)} KB`;

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let totalIn = 0;
  let totalOut = 0;

  for (const name of VIEWS) {
    const src = path.join(SRC_DIR, `espresso_${name}.png`);
    const out = path.join(OUT_DIR, `espresso_${name}.webp`);
    if (!fs.existsSync(src)) {
      console.warn(`SKIP ${name}: missing ${src}`);
      continue;
    }
    const inBytes = fs.statSync(src).size;
    const meta = await sharp(src).metadata();
    await sharp(src)
      .webp({ quality: 88, effort: 6, smartSubsample: true })
      .toFile(out);
    const outBytes = fs.statSync(out).size;
    totalIn += inBytes;
    totalOut += outBytes;
    console.log(
      `${name.padEnd(8)} ${meta.width}x${meta.height}  ` +
        `${fmtKB(inBytes).padStart(11)} png  ->  ${fmtKB(outBytes).padStart(10)} webp`,
    );
  }

  console.log(
    `\nTOTAL  ${fmtKB(totalIn)} png  ->  ${fmtKB(totalOut)} webp  ` +
      `(${((1 - totalOut / totalIn) * 100).toFixed(0)}% smaller)`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
