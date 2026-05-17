/**
 * Upgrade TRELLIS GLB → AURELIA brand-coherent material.
 *
 * Strategy:
 *  1. Remove pixelated baseColorTexture (TRELLIS single-image artifact)
 *  2. Apply procedural PBR material: brushed stainless steel near-black
 *     (metallicFactor 0.55, roughnessFactor 0.32 → reacts realistically to HDR studio)
 *  3. Smooth vertex normals (TRELLIS exports flat / missing normals)
 *  4. Compute tangents for PBR lighting correctness
 *
 * Run: bun scripts/upgrade-glb.mjs
 * Then: bunx --bun @gltf-transform/cli optimize ... --compress draco --texture-compress webp
 */

import { NodeIO } from "@gltf-transform/core";
import {
  weld,
  normals,
  tangents,
  prune,
  dedup,
} from "@gltf-transform/functions";
import { generateTangents } from "mikktspace";

const SOURCE = "assets/raw/aurelia-prox1-raw.glb";
const TARGET = "assets/raw/aurelia-prox1-upgraded.glb";

const io = new NodeIO();

console.log(`[upgrade] reading ${SOURCE}`);
const doc = await io.read(SOURCE);

// ────────────────────────────────────────────────────────────────────
// 1. Material override — strip TRELLIS texture, apply brushed steel PBR
// ────────────────────────────────────────────────────────────────────
const materials = doc.getRoot().listMaterials();
console.log(`[upgrade] found ${materials.length} material(s)`);

for (const mat of materials) {
  const baseTex = mat.getBaseColorTexture();
  if (baseTex) {
    mat.setBaseColorTexture(null);
    baseTex.dispose();
  }
  const mrTex = mat.getMetallicRoughnessTexture();
  if (mrTex) {
    mat.setMetallicRoughnessTexture(null);
    mrTex.dispose();
  }
  const normalTex = mat.getNormalTexture();
  if (normalTex) {
    mat.setNormalTexture(null);
    normalTex.dispose();
  }
  const occTex = mat.getOcclusionTexture();
  if (occTex) {
    mat.setOcclusionTexture(null);
    occTex.dispose();
  }
  const emTex = mat.getEmissiveTexture();
  if (emTex) {
    mat.setEmissiveTexture(null);
    emTex.dispose();
  }

  // AURELIA brushed stainless steel near-black with subtle warm tint
  mat.setBaseColorFactor([0.09, 0.085, 0.08, 1.0]);
  mat.setMetallicFactor(0.55);
  mat.setRoughnessFactor(0.32);
  mat.setEmissiveFactor([0, 0, 0]);
  mat.setName("AURELIA-brushed-steel");
  mat.setDoubleSided(true);
}

// ────────────────────────────────────────────────────────────────────
// 2. Geometry cleanup
// ────────────────────────────────────────────────────────────────────
console.log(`[upgrade] geometry cleanup`);
await doc.transform(
  weld({ tolerance: 0.0001 }),
  normals({ overwrite: true }),
  tangents({ generateTangents }),
  prune(),
  dedup(),
);

// ────────────────────────────────────────────────────────────────────
// 3. Save
// ────────────────────────────────────────────────────────────────────
console.log(`[upgrade] writing ${TARGET}`);
await io.write(TARGET, doc);

// stats
const root = doc.getRoot();
const meshes = root.listMeshes();
const totalVerts = meshes.reduce((sum, m) => {
  return (
    sum +
    m
      .listPrimitives()
      .reduce((s, p) => s + (p.getAttribute("POSITION")?.getCount() ?? 0), 0)
  );
}, 0);

console.log(`[upgrade] done`);
console.log(`  meshes: ${meshes.length}`);
console.log(`  vertices: ${totalVerts}`);
console.log(`  materials: ${root.listMaterials().length}`);
console.log(`  textures: ${root.listTextures().length}`);
