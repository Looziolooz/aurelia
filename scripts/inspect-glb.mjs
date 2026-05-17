/**
 * GLB inspector — dumps node tree + bbox for verifying the contract
 * between CadQuery output and `data/hotspots.json`.
 *
 * Run: bun scripts/inspect-glb.mjs assets/raw/aurelia-cadquery.glb
 */

import { NodeIO } from "@gltf-transform/core";
import { readFileSync } from "node:fs";

const SOURCE = process.argv[2] ?? "assets/raw/aurelia-cadquery.glb";
const HOTSPOTS_JSON = "data/hotspots.json";

const io = new NodeIO();
const doc = await io.read(SOURCE);
const root = doc.getRoot();

console.log(`\n=== ${SOURCE} ===`);

// Read hotspots contract
const hotspots = JSON.parse(readFileSync(HOTSPOTS_JSON, "utf8"));
const expectedNodes = new Set(hotspots.hotspots.map((h) => h.anchor_node));

// Walk all nodes
const sceneNodes = [];
function walk(node, depth = 0) {
  const name = node.getName() || "(anonymous)";
  const mesh = node.getMesh();
  const children = node.listChildren();
  sceneNodes.push({ name, hasMesh: !!mesh, depth });
  for (const c of children) walk(c, depth + 1);
}
for (const scene of root.listScenes()) {
  for (const n of scene.listChildren()) walk(n);
}

console.log(`\nNode tree (${sceneNodes.length} nodes):`);
for (const n of sceneNodes) {
  const pad = "  ".repeat(n.depth);
  const tag = n.hasMesh ? " [mesh]" : "";
  const flag = expectedNodes.has(n.name) ? " ← HOTSPOT" : "";
  console.log(`${pad}${n.name}${tag}${flag}`);
}

// Hotspot contract check
console.log(`\nHotspot contract:`);
const presentNames = new Set(sceneNodes.map((n) => n.name));
let ok = 0;
let missing = 0;
for (const exp of expectedNodes) {
  if (presentNames.has(exp)) {
    console.log(`  ✓ ${exp}`);
    ok++;
  } else {
    console.log(`  ✗ MISSING: ${exp}`);
    missing++;
  }
}
console.log(`  ${ok}/${expectedNodes.size} anchors present`);

// Compute global bbox from accessors
let minX = Infinity,
  minY = Infinity,
  minZ = Infinity;
let maxX = -Infinity,
  maxY = -Infinity,
  maxZ = -Infinity;

for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    if (!pos) continue;
    const arr = pos.getArray();
    if (!arr) continue;
    const cnt = pos.getCount();
    for (let i = 0; i < cnt; i++) {
      const x = arr[i * 3];
      const y = arr[i * 3 + 1];
      const z = arr[i * 3 + 2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
  }
}

const w = maxX - minX;
const h = maxY - minY;
const d = maxZ - minZ;

console.log(`\nGlobal bbox (meters):`);
console.log(`  X: [${minX.toFixed(3)}, ${maxX.toFixed(3)}]  width  = ${w.toFixed(3)}`);
console.log(`  Y: [${minY.toFixed(3)}, ${maxY.toFixed(3)}]  height = ${h.toFixed(3)}`);
console.log(`  Z: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]  depth  = ${d.toFixed(3)}`);

const upAxis = h >= w && h >= d ? "Y" : w >= d ? "X" : "Z";
console.log(`  Tallest axis (likely UP) = ${upAxis}`);

const meshCount = root.listMeshes().length;
const matCount = root.listMaterials().length;
const texCount = root.listTextures().length;

console.log(`\nStats:`);
console.log(`  meshes:    ${meshCount}`);
console.log(`  materials: ${matCount}`);
console.log(`  textures:  ${texCount}`);
