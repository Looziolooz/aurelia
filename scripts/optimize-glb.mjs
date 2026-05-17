/**
 * Reduce the Meshy v2 GLB from ~39 MB to a kiosk-friendly size using
 * lossless dedup/weld/prune + quantize on vertex attributes. No external
 * decoder needed at runtime (Three.js handles quantize natively).
 *
 * Pipeline (in order):
 *   1. dedup    — collapse duplicate accessors and meshes
 *   2. weld     — merge co-located vertices
 *   3. prune    — drop unused buffers/textures/materials
 *   4. quantize — POSITION/NORMAL/TEXCOORD to int16/int8 (lossy on the
 *                  4th decimal place of a centimetre — invisible)
 *
 * Reads:  public/models/aurelia-v2.glb
 * Writes: public/models/aurelia-v2.glb  (in place; backs up to .orig.glb)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import {
  KHRONOS_EXTENSIONS,
} from "@gltf-transform/extensions";
import { dedup, weld, prune, quantize, textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public", "models", "aurelia-v2.glb");
const BACKUP = path.join(ROOT, "public", "models", "aurelia-v2.orig.glb");

if (!fs.existsSync(SRC)) {
  console.error(`Source GLB not found: ${SRC}`);
  process.exit(1);
}

if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(SRC, BACKUP);
  console.log(`Backup -> ${path.relative(ROOT, BACKUP)}`);
}

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(BACKUP);

const beforeBytes = fs.statSync(BACKUP).size;

// quantize() compresses positions to int16 via KHR_mesh_quantization.
// Drei's GLTFLoader supports it, but the dequantized geometry isn't
// available synchronously during the first render — Box3.setFromObject
// returns Infinity, our auto-scale divides by it, and the model collapses
// to scale 0 until a re-render kicks in. Disabled until we can guard the
// auto-fit against that race.
await doc.transform(
  dedup(),
  weld({ tolerance: 0.0001 }),
  prune(),
  // Re-encode textures at 1024² mozjpeg q78. This alone is responsible for
  // most of the saving (the 5.9 MB PNG basecolor compresses to ~227 KB).
  textureCompress({
    encoder: sharp,
    targetFormat: "jpeg",
    quality: 78,
    resize: [1024, 1024],
    resizeFilter: "lanczos3",
  }),
);

await io.write(SRC, doc);

const afterBytes = fs.statSync(SRC).size;
const saved = beforeBytes - afterBytes;
const pct = (saved / beforeBytes) * 100;
console.log(`Before: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`After:  ${(afterBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Saved:  ${(saved / 1024 / 1024).toFixed(2)} MB (${pct.toFixed(1)}%)`);
