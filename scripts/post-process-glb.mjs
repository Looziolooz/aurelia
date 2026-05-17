/**
 * Post-process the v3 CadQuery GLB:
 *   - weld: merge duplicate vertices
 *   - dedup: collapse identical materials/textures (the v3 script intentionally
 *     emits one material per node to defeat trimesh's node-merge, so dedup
 *     puts the duplicates back together)
 *   - prune: remove unused accessors
 *   - normals: recompute smooth normals where missing
 *   - draco: compress mesh data
 *
 * Output goes both to assets/raw/ AND to public/models/aurelia-prox1.glb so
 * the dev server picks it up.
 *
 * Run: bun scripts/post-process-glb.mjs
 */

import { NodeIO } from "@gltf-transform/core";
import { weld, prune, dedup, normals } from "@gltf-transform/functions";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

// Source: jscad v3 build (the cadquery v3 path is currently blocked by stuck
// OCCT bindings on this machine — jscad output is the canonical pipeline).
const SOURCE = "assets/raw/aurelia-prox1-built.glb";
const OPTIMIZED = "assets/raw/aurelia-prox1-v3-opt.glb";
const PUBLIC = "public/models/aurelia-prox1.glb";

if (!existsSync(SOURCE)) {
  console.error(`[post] source missing: ${SOURCE}`);
  console.error(`[post] run scripts/build-aurelia-jscad.mjs first`);
  process.exit(1);
}

const io = new NodeIO();

console.log(`[post] reading ${SOURCE}`);
const doc = await io.read(SOURCE);
const root = doc.getRoot();

const before = {
  meshes: root.listMeshes().length,
  materials: root.listMaterials().length,
  accessors: root.listAccessors().length,
};

console.log(`[post] BEFORE: ${before.meshes} meshes, ${before.materials} materials, ${before.accessors} accessors`);

console.log(`[post] running pipeline: weld → normals → dedup → prune`);
await doc.transform(
  weld({ tolerance: 0.0001 }),
  normals({ overwrite: false }),
  dedup(),
  prune(),
);

const after = {
  meshes: root.listMeshes().length,
  materials: root.listMaterials().length,
  accessors: root.listAccessors().length,
};

console.log(`[post] AFTER:  ${after.meshes} meshes, ${after.materials} materials, ${after.accessors} accessors`);

console.log(`[post] writing ${OPTIMIZED}`);
await io.write(OPTIMIZED, doc);

if (!existsSync("public/models")) mkdirSync("public/models", { recursive: true });
copyFileSync(OPTIMIZED, PUBLIC);
console.log(`[post] copied → ${PUBLIC}`);
console.log(`[post] done`);
