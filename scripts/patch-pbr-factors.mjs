/**
 * One-shot patch: fix baseColorFactor for materials demoted to "constant" by
 * bake.py's image_is_constant() heuristic.
 *
 * Why this exists: B-5 (factor demotion) sampled the entire baked image
 * including UV-padding pixels (which are zeroed). For gauge_rim and
 * steam_wand the brushed/polished texture covers a small portion of the
 * atlas, so the global mean came out near-black. The glTF then carries
 * baseColorFactor=(0,0,0) and the chrome/copper render as lead-coloured.
 *
 * Authoritative values from the material reference table in
 * docs/opencode-blender-bake-brief.md §"Material targets":
 *   gauge_rim  → copper           (0.724, 0.451, 0.200)
 *   steam_wand → polished chrome  (0.910, 0.910, 0.910)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IN_GLB = path.join(ROOT, "assets", "3d", "coffee-machine", "out", "coffee-machine-baked.glb");
const OUT_GLB = path.join(ROOT, "public", "models", "coffee-machine.glb");

const PATCH = {
  pbr_gauge_rim: { baseColorFactor: [0.724, 0.451, 0.2, 1.0], metallicFactor: 1.0, roughnessFactor: 0.25 },
  pbr_steam_wand: { baseColorFactor: [0.91, 0.91, 0.91, 1.0], metallicFactor: 1.0, roughnessFactor: 0.08 },
};

const buf = fs.readFileSync(IN_GLB);
if (buf.toString("utf8", 0, 4) !== "glTF") throw new Error("Not a GLB");
const version = buf.readUInt32LE(4);
const totalLen = buf.readUInt32LE(8);
const jsonLen = buf.readUInt32LE(12);
const jsonStart = 20;
const jsonEnd = jsonStart + jsonLen;
const json = JSON.parse(buf.toString("utf8", jsonStart, jsonEnd));

let patched = 0;
for (const m of json.materials ?? []) {
  const p = PATCH[m.name];
  if (!p) continue;
  m.pbrMetallicRoughness ??= {};
  Object.assign(m.pbrMetallicRoughness, p);
  console.log(`  patched ${m.name}: baseColorFactor=${p.baseColorFactor.slice(0, 3).map((x) => x.toFixed(2))}`);
  patched++;
}

if (!patched) {
  console.log("Nothing to patch.");
  process.exit(0);
}

// Re-serialize JSON. glTF requires the JSON chunk to be padded with 0x20
// (space) to a 4-byte boundary; the binary chunk that follows must stay
// at the same byte offset relative to the original layout, but since the
// chunk lengths are different we need to rebuild headers.
let newJsonText = JSON.stringify(json);
while (newJsonText.length % 4 !== 0) newJsonText += " ";
const newJsonBuf = Buffer.from(newJsonText, "utf8");

// Locate the BIN chunk (after the JSON chunk)
const binStart = jsonEnd;
const binLen = buf.readUInt32LE(binStart);
const binType = buf.readUInt32LE(binStart + 4);
if (binType !== 0x004e4942) {
  console.error(`Expected BIN chunk (0x004E4942), got 0x${binType.toString(16)}`);
  process.exit(2);
}
const binData = buf.subarray(binStart + 8, binStart + 8 + binLen);

const newTotal = 12 + 8 + newJsonBuf.length + 8 + binLen;
const out = Buffer.alloc(newTotal);
out.write("glTF", 0, "ascii");
out.writeUInt32LE(version, 4);
out.writeUInt32LE(newTotal, 8);
out.writeUInt32LE(newJsonBuf.length, 12);
out.writeUInt32LE(0x4e4f534a, 16); // 'JSON'
newJsonBuf.copy(out, 20);
let p = 20 + newJsonBuf.length;
out.writeUInt32LE(binLen, p);
out.writeUInt32LE(0x004e4942, p + 4); // 'BIN\0'
binData.copy(out, p + 8);

fs.mkdirSync(path.dirname(OUT_GLB), { recursive: true });
fs.writeFileSync(OUT_GLB, out);
console.log(`\nWrote ${out.length} bytes to ${path.relative(ROOT, OUT_GLB)}`);
console.log(`Original ${totalLen} → patched ${newTotal} (Δ ${newTotal - totalLen} bytes)`);
