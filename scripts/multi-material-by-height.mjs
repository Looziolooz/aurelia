/**
 * AURELIA Pro X1 — Multi-material auto-tag by height (Node, no Blender required)
 * ===============================================================================
 * Replica la logica `auto_tag_by_regions` dello script Blender
 * (`aurelia-multi-material.py` PHASE 3) in JavaScript via @gltf-transform.
 *
 * Input:  assets/raw/aurelia-prox1-raw.glb  (TRELLIS single-mesh single-material)
 * Output: assets/raw/aurelia-prox1-multimat.glb  (5 materiali PBR brand assegnati per fascia di altezza)
 *
 * Algoritmo:
 * 1. Carica GLB, identifica asse "up" (max range tra X/Y/Z)
 * 2. Calcola bounding box su asse up
 * 3. Per ogni triangolo: avg altezza → banda → material key
 * 4. Crea 5 materiali PBR brand (rubber, body, chrome, steel, copper)
 * 5. Splitta la primitive originale in 5 nuove primitives (1 per material)
 * 6. Smooth normals + tangents per illuminazione PBR corretta
 * 7. Save → poi optimize Draco via CLI
 *
 * Run:
 *   bun scripts/multi-material-by-height.mjs
 *   bunx --bun @gltf-transform/cli optimize \
 *     assets/raw/aurelia-prox1-multimat.glb \
 *     public/models/aurelia-prox1.glb \
 *     --compress draco
 */

import { NodeIO, Document } from "@gltf-transform/core";
import {
  weld,
  normals,
  tangents,
  prune,
  dedup,
} from "@gltf-transform/functions";
import { generateTangents } from "mikktspace";

const SOURCE = "assets/raw/aurelia-prox1-raw.glb";
const TARGET = "assets/raw/aurelia-prox1-multimat.glb";

// ────────────────────────────────────────────────────────────────────
// PBR materials brand AURELIA (sRGB linearized)
// ────────────────────────────────────────────────────────────────────
const MATERIAL_DEFS = {
  rubber: {
    label: "AURELIA_RubberBlack",
    baseColor: [0.015, 0.015, 0.015, 1.0],
    metallic: 0.0,
    roughness: 0.78,
  },
  body: {
    label: "AURELIA_BodyMatte",
    baseColor: [0.025, 0.025, 0.030, 1.0],
    metallic: 0.0,
    roughness: 0.62,
  },
  chrome: {
    label: "AURELIA_Chrome",
    baseColor: [0.85, 0.85, 0.88, 1.0],
    metallic: 1.0,
    roughness: 0.06,
  },
  steel: {
    label: "AURELIA_BrushedSteel",
    baseColor: [0.55, 0.55, 0.57, 1.0],
    metallic: 1.0,
    roughness: 0.32,
  },
  copper: {
    label: "AURELIA_Copper",
    baseColor: [0.78, 0.32, 0.10, 1.0],
    metallic: 1.0,
    roughness: 0.18,
  },
};

// Bande verticali (frazione di altezza, dal basso)
const BANDS = [
  { lo: 0.00, hi: 0.04, key: "rubber" },
  { lo: 0.04, hi: 0.10, key: "body" },
  { lo: 0.10, hi: 0.16, key: "chrome" },
  { lo: 0.16, hi: 0.50, key: "steel" },
  { lo: 0.50, hi: 0.92, key: "body" },
  { lo: 0.92, hi: 1.00, key: "copper" },
];

// ────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────
const io = new NodeIO();
console.log(`[multi-material] reading ${SOURCE}`);
const doc = await io.read(SOURCE);

// Smooth normals + tangents PRIMA dello split (così le normali sono coerenti tra bande)
console.log(`[multi-material] computing smooth normals + tangents`);
await doc.transform(
  weld({ tolerance: 0.0001 }),
  normals({ overwrite: true }),
  tangents({ generateTangents }),
);

// IMPORTANTE: ricaricare references DOPO i transform (weld può ricreare accessor)
const root = doc.getRoot();
const meshes = root.listMeshes();
const mesh = meshes[0];
const oldPrim = mesh.listPrimitives()[0];

console.log(`[multi-material] primitive after weld: ${oldPrim.getMode()}`);

// Estrai accessor (riusabili tra le nuove primitives)
const positionAcc = oldPrim.getAttribute("POSITION");
const normalAcc = oldPrim.getAttribute("NORMAL");
const tangentAcc = oldPrim.getAttribute("TANGENT");
const texcoordAcc = oldPrim.getAttribute("TEXCOORD_0");

const positions = positionAcc.getArray();
const oldIndicesAcc = oldPrim.getIndices();

// Se la primitive è non-indexed (raro post-weld), genera indices triviali
let oldIndices;
if (oldIndicesAcc) {
  oldIndices = oldIndicesAcc.getArray();
} else {
  console.log(`[multi-material] primitive has no indices, generating sequential`);
  const vertexCount = positionAcc.getCount();
  oldIndices = new Uint32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) oldIndices[i] = i;
}
console.log(`[multi-material] indices count: ${oldIndices.length}`);

// Determine up axis
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i], y = positions[i + 1], z = positions[i + 2];
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  if (z < minZ) minZ = z;
  if (z > maxZ) maxZ = z;
}
const rangeX = maxX - minX;
const rangeY = maxY - minY;
const rangeZ = maxZ - minZ;
let upAxis;
if (rangeY >= rangeZ && rangeY >= rangeX) upAxis = 1;
else if (rangeZ >= rangeX) upAxis = 2;
else upAxis = 1;
console.log(
  `[multi-material] bbox: X=${rangeX.toFixed(2)} Y=${rangeY.toFixed(2)} Z=${rangeZ.toFixed(2)} | up=${"XYZ"[upAxis]}`,
);

const minV = upAxis === 0 ? minX : upAxis === 1 ? minY : minZ;
const maxV = upAxis === 0 ? maxX : upAxis === 1 ? maxY : maxZ;
const heightV = maxV - minV;

// Group triangles by material key
const groups = Object.fromEntries(
  Object.keys(MATERIAL_DEFS).map((k) => [k, []]),
);

const triCount = oldIndices.length / 3;
console.log(`[multi-material] sorting ${triCount} triangles into bands`);

for (let t = 0; t < triCount; t++) {
  const v0 = oldIndices[t * 3];
  const v1 = oldIndices[t * 3 + 1];
  const v2 = oldIndices[t * 3 + 2];
  const a0 = positions[v0 * 3 + upAxis];
  const a1 = positions[v1 * 3 + upAxis];
  const a2 = positions[v2 * 3 + upAxis];
  const avg = (a0 + a1 + a2) / 3;
  const rel = (avg - minV) / heightV;

  let bandKey = "body";
  for (const band of BANDS) {
    if (rel >= band.lo && rel < band.hi) {
      bandKey = band.key;
      break;
    }
  }
  groups[bandKey].push(v0, v1, v2);
}

// Stats
for (const [key, idxs] of Object.entries(groups)) {
  console.log(`  ${key}: ${idxs.length / 3} triangles`);
}

// Crea 5 materials PBR
const materials = {};
for (const [key, def] of Object.entries(MATERIAL_DEFS)) {
  const mat = doc
    .createMaterial(def.label)
    .setBaseColorFactor(def.baseColor)
    .setMetallicFactor(def.metallic)
    .setRoughnessFactor(def.roughness)
    .setDoubleSided(true);
  materials[key] = mat;
}

// Buffer per i nuovi accessors (riusiamo lo stesso buffer del position acc)
const buffer = positionAcc.getBuffer();

// Crea 5 nuove primitives (1 per material non vuoto)
console.log(`[multi-material] creating new primitives`);
const newPrimitives = [];
for (const [key, idxs] of Object.entries(groups)) {
  if (idxs.length === 0) continue;
  const indicesArray =
    positionAcc.getCount() > 65535
      ? new Uint32Array(idxs)
      : new Uint16Array(idxs);
  const idxAcc = doc
    .createAccessor()
    .setType("SCALAR")
    .setArray(indicesArray)
    .setBuffer(buffer);

  const prim = doc
    .createPrimitive()
    .setMaterial(materials[key])
    .setAttribute("POSITION", positionAcc)
    .setIndices(idxAcc);

  if (normalAcc) prim.setAttribute("NORMAL", normalAcc);
  if (tangentAcc) prim.setAttribute("TANGENT", tangentAcc);
  if (texcoordAcc) prim.setAttribute("TEXCOORD_0", texcoordAcc);

  newPrimitives.push(prim);
}

// Sostituisci la primitive originale con le nuove
mesh.listPrimitives().forEach((p) => mesh.removePrimitive(p));
oldPrim.dispose();
for (const np of newPrimitives) {
  mesh.addPrimitive(np);
}

// Cleanup
await doc.transform(prune(), dedup());

// Save
console.log(`[multi-material] writing ${TARGET}`);
await io.write(TARGET, doc);

// Stats
const finalRoot = doc.getRoot();
console.log(`[multi-material] done`);
console.log(`  meshes: ${finalRoot.listMeshes().length}`);
console.log(`  primitives: ${finalRoot.listMeshes()[0].listPrimitives().length}`);
console.log(`  materials: ${finalRoot.listMaterials().length}`);
console.log(`  textures: ${finalRoot.listTextures().length}`);
