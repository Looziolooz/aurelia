/**
 * render-hero.mjs — headless Chromium still-capture for the AURELIA intro hero.
 *
 * WHAT IT DOES
 *   Drives the running Next.js dev server's `/render` route with Playwright
 *   (headless Chromium) and captures one high-resolution WebP per camera view
 *   into `public/intro/`. These overwrite the live INTRO_RENDERS the app
 *   already references (`public/intro/aurelia_<view>.webp`).
 *
 * ROUTE CONTRACT (this script codes to it exactly — a parallel agent builds
 * `app/render/page.tsx` to satisfy it):
 *   URL: <base>/render?view=<VIEW>&w=<W>&h=<H>&sm=<SM>
 *     VIEW ∈ { front, 3q_right, 3q_left, 3q_left_close }
 *     W,H  = integer canvas pixel dimensions (defaults w=1600, h=2133)
 *     SM   = optional shadow-map size int (default 2048)
 *   The page renders exactly ONE <canvas> of W×H CSS px on a dark studio
 *   background, no scrollbars/chrome. When settled it sets
 *     window.__heroReady === true
 *   On failure it sets
 *     window.__heroError = "<non-empty string>"
 *   Exactly one of these is eventually set (the route has its own ~25s
 *   safety timeout that sets __heroError).
 *
 * USAGE (the dev server must ALREADY be running — this script never starts it):
 *   node scripts/render-hero.mjs
 *   node scripts/render-hero.mjs --views=front --w=2048 --h=2732 --sm=4096
 *   node scripts/render-hero.mjs --views=3q_left,3q_left_close --base=http://localhost:3000
 *   node scripts/render-hero.mjs --out=public/intro --scale=1
 *
 * FLAGS (defaults):
 *   --views=front,3q_right,3q_left,3q_left_close   (all four, in this order)
 *   --w=1600  --h=2133  --sm=2048
 *   --base=http://localhost:3000
 *   --out=public/intro       (relative to repo root)
 *   --scale=1                (Playwright deviceScaleFactor; canvas size is
 *                             authoritative — keep 1)
 *
 * OUTPUT: <out>/aurelia_<view>.webp — OVERWRITTEN in place. The /intro/ dir is
 * intentional: a reduced-motion e2e test selects `div[style*='/intro/']`.
 * DO NOT change the output dir or rename the files.
 *
 * Dependency-free except `playwright` + node builtins (fs, path, url, process).
 * Exit code: 0 = all views captured (PASS); non-zero = at least one view
 * failed (PARTIAL or FAIL). Successful views are still written on partial fail.
 */

import { chromium, request as pwRequest } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- repo root: this file lives in <repoRoot>/scripts/render-hero.mjs ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const ALL_VIEWS = ["front", "3q_right", "3q_left", "3q_left_close"];

// --- minimal --key=value arg parsing (no extra deps) ---
function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq === -1) {
      out[a.slice(2)] = true;
    } else {
      out[a.slice(2, eq)] = a.slice(eq + 1);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

function intArg(name, def) {
  if (args[name] === undefined) return def;
  const n = parseInt(String(args[name]), 10);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`Invalid --${name}=${args[name]} (expected a positive integer)`);
    process.exit(2);
  }
  return n;
}

const VIEWS = (
  args.views === undefined || args.views === true
    ? ALL_VIEWS
    : String(args.views)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
);

const unknown = VIEWS.filter((v) => !ALL_VIEWS.includes(v));
if (unknown.length) {
  console.error(
    `Unknown view(s): ${unknown.join(", ")}. Valid: ${ALL_VIEWS.join(", ")}`
  );
  process.exit(2);
}
if (VIEWS.length === 0) {
  console.error("No views requested.");
  process.exit(2);
}

const W = intArg("w", 1600);
const H = intArg("h", 2133);
const SM = intArg("sm", 2048);
const SCALE = (() => {
  if (args.scale === undefined) return 1;
  const n = Number(args.scale);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`Invalid --scale=${args.scale} (expected a positive number)`);
    process.exit(2);
  }
  return n;
})();

const BASE = String(
  args.base === undefined || args.base === true
    ? "http://localhost:3000"
    : args.base
).replace(/\/+$/, "");

const OUT_DIR = path.resolve(
  REPO_ROOT,
  String(args.out === undefined || args.out === true ? "public/intro" : args.out)
);

function outFileFor(view) {
  return path.join(OUT_DIR, `aurelia_${view}.webp`);
}

function urlFor(view) {
  const qs = new URLSearchParams({
    view,
    w: String(W),
    h: String(H),
    sm: String(SM),
  });
  return `${BASE}/render?${qs.toString()}`;
}

function fmtBytes(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

// --- preflight: is the dev server reachable? ---
async function preflight() {
  let ctx;
  try {
    ctx = await pwRequest.newContext();
    const res = await ctx.get(BASE, { timeout: 3000 });
    // Any HTTP response (even a 404) means a server is listening.
    return res.status() > 0;
  } catch {
    return false;
  } finally {
    if (ctx) await ctx.dispose();
  }
}

// --- main ---
const reachable = await preflight();
if (!reachable) {
  console.error(
    `dev server not reachable at ${BASE} — start it with \`npm run dev\` and re-run`
  );
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const results = []; // { view, ok, path, bytes, seconds, error }
let browser;

try {
  // Heavy WebGL (≈20 canvas textures + real PCF shadow map + PMREM env +
  // post). Playwright headless Chromium falls back to SwiftShader
  // (software GL) → minutes-long stalls / never-settles ("GPU stall due
  // to ReadPixels"). This scene needs a real GPU. Default to HEADED
  // (Windows → ANGLE/D3D11 hardware path); opt into headless only with
  // --headless (and even then force the GPU + unblock the blocklist).
  const HEADLESS = args.headless === true;
  const GPU_ARGS = [
    "--ignore-gpu-blocklist",
    "--enable-gpu-rasterization",
    "--use-angle=d3d11",
  ];
  console.log(
    `launching chromium: ${HEADLESS ? "headless" : "headed"} + GPU (angle/d3d11)`
  );
  browser = await chromium.launch({
    headless: HEADLESS,
    args: GPU_ARGS,
  });

  for (const view of VIEWS) {
    const started = Date.now();
    const url = urlFor(view);
    const outFile = outFileFor(view);
    let context;
    try {
      context = await browser.newContext({
        viewport: { width: W, height: H },
        deviceScaleFactor: SCALE,
      });
      const page = await context.newPage();

      page.on("pageerror", (err) => {
        console.error(`  [${view}] pageerror: ${err && err.message ? err.message : err}`);
      });
      page.on("console", (msg) => {
        const t = msg.type();
        if (t === "error" || t === "warning") {
          console.error(`  [${view}] console.${t}: ${msg.text()}`);
        }
      });

      await page.goto(url, { waitUntil: "load", timeout: 60000 });

      // Wait until the route declares itself ready OR errored. The route has
      // its own ~25s safety timeout that sets __heroError, so a non-empty
      // __heroError string always wins over a missing __heroReady.
      await page.waitForFunction(
        () =>
          window.__heroReady === true ||
          (typeof window.__heroError === "string" &&
            window.__heroError.length > 0),
        { timeout: 90000 }
      );

      const heroError = await page.evaluate(() =>
        typeof window.__heroError === "string" ? window.__heroError : ""
      );
      if (heroError) {
        throw new Error(`route reported __heroError: ${heroError}`);
      }

      // Screenshot ONLY the canvas (never full-page).
      const cv = page.locator("canvas").first();
      const dir = path.dirname(outFile);
      fs.mkdirSync(dir, { recursive: true });
      await cv.screenshot({ path: outFile, type: "webp", quality: 75 });

      const bytes = fs.statSync(outFile).size;
      const seconds = (Date.now() - started) / 1000;
      results.push({ view, ok: true, path: outFile, bytes, seconds });
      console.log(
        `${view}  ${W}×${H}  -> ${outFile}  (${fmtBytes(bytes)}, ${seconds.toFixed(2)}s)`
      );
    } catch (err) {
      const seconds = (Date.now() - started) / 1000;
      const message = err && err.message ? err.message : String(err);
      results.push({ view, ok: false, path: outFile, error: message, seconds });
      console.error(
        `${view}  ${W}×${H}  -> FAILED after ${seconds.toFixed(2)}s: ${message}`
      );
    } finally {
      if (context) await context.close();
    }
  }
} finally {
  if (browser) await browser.close();
}

// --- summary ---
const okCount = results.filter((r) => r.ok).length;
const failCount = results.length - okCount;

console.log("\n──────── render-hero summary ────────");
for (const r of results) {
  if (r.ok) {
    console.log(
      `  PASS  ${r.view.padEnd(14)} ${fmtBytes(r.bytes).padStart(8)}  ${r.seconds.toFixed(2)}s  ${r.path}`
    );
  } else {
    console.log(
      `  FAIL  ${r.view.padEnd(14)} ${"—".padStart(8)}  ${r.seconds.toFixed(2)}s  ${r.error}`
    );
  }
}
console.log("─────────────────────────────────────");

let verdict;
if (failCount === 0) {
  verdict = `PASS — ${okCount}/${results.length} views captured`;
} else if (okCount > 0) {
  verdict = `PARTIAL — ${okCount}/${results.length} views captured, ${failCount} failed`;
} else {
  verdict = `FAIL — 0/${results.length} views captured`;
}
console.log(verdict);

process.exit(failCount === 0 ? 0 : 1);
