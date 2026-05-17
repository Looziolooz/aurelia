/**
 * Reads each hotspot's `anchor_node` from the source GLB, computes the
 * world-space centroid (and outward-facing normal) of that mesh, and writes
 * the result back into data/hotspots.json under `fallback_position` and
 * `fallback_normal`. Runtime no longer guesses — positions are baked.
 *
 * Run: node scripts/bake-hotspot-positions.mjs [glb-path]
 * Default GLB: assets/raw/aurelia-prox1-v3-opt.glb
 */

import { NodeIO } from "@gltf-transform/core";
import { readFileSync, writeFileSync } from "node:fs";

const SRC_GLB = process.argv[2] ?? "assets/raw/aurelia-prox1-v3-opt.glb";
const HOTSPOTS_JSON = "data/hotspots.json";

const io = new NodeIO();
const doc = await io.read(SRC_GLB);
const root = doc.getRoot();

const hotspots = JSON.parse(readFileSync(HOTSPOTS_JSON, "utf8"));

// Build a name -> node map by walking all scene nodes.
const nodeByName = new Map();
function walk(node) {
  const name = node.getName();
  if (name) nodeByName.set(name, node);
  for (const c of node.listChildren()) walk(c);
}
for (const scene of root.listScenes()) {
  for (const n of scene.listChildren()) walk(n);
}

// Apply a node's local matrix chain up to the scene root to get world coords.
function worldMatrix(node) {
  const chain = [];
  let cur = node;
  while (cur) {
    chain.unshift(cur);
    cur = cur.getParentNode?.() ?? null;
  }
  // Multiply matrices in order (parent -> child).
  const m = mat4Identity();
  for (const n of chain) {
    const t = n.getTranslation();
    const r = n.getRotation();
    const s = n.getScale();
    mat4MultiplyInPlace(m, mat4Compose(t, r, s));
  }
  return m;
}

function mat4Identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function mat4Compose(t, q, s) {
  // Quaternion to rotation matrix, then scale, then translate.
  const [x, y, z, w] = q;
  const [sx, sy, sz] = s;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}

function mat4MultiplyInPlace(a, b) {
  // a = a * b (column-major)
  const out = new Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[i * 4 + j] =
        a[0 * 4 + j] * b[i * 4 + 0] +
        a[1 * 4 + j] * b[i * 4 + 1] +
        a[2 * 4 + j] * b[i * 4 + 2] +
        a[3 * 4 + j] * b[i * 4 + 3];
    }
  }
  for (let i = 0; i < 16; i++) a[i] = out[i];
}

function mat4TransformPoint(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// Compute world-space bounding box & centroid for a node's mesh.
function nodeBboxAndCentroid(node) {
  const mesh = node.getMesh();
  if (!mesh) return null;
  const m = worldMatrix(node);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let count = 0;
  let cx = 0, cy = 0, cz = 0;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    if (!pos) continue;
    const arr = pos.getArray();
    if (!arr) continue;
    const cnt = pos.getCount();
    for (let i = 0; i < cnt; i++) {
      const lp = [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]];
      const [wx, wy, wz] = mat4TransformPoint(m, lp);
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wz < minZ) minZ = wz;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
      if (wz > maxZ) maxZ = wz;
      cx += wx; cy += wy; cz += wz; count++;
    }
  }
  if (count === 0) return null;
  return {
    centroid: [cx / count, cy / count, cz / count],
    bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

// Decide an outward-facing normal heuristically based on which bbox face is
// most exposed. For UI hotspots we want the dot to sit slightly off the
// surface in the direction the user looks from, so we pick the largest of
// +Z, -Z, +Y, -Y, +X, -X by which axis the mesh is most aligned with.
function pickNormal(bbox) {
  const w = bbox.max[0] - bbox.min[0];
  const h = bbox.max[1] - bbox.min[1];
  const d = bbox.max[2] - bbox.min[2];
  // Heuristic: small thin meshes lying on +Z face -> normal = +Z (front).
  // Tall thin in Y -> +Y (top). Wide low in Z -> +Y.
  // Pick the axis with the smallest extent as the surface normal direction.
  const min = Math.min(w, h, d);
  if (min === w) return bbox.max[0] > -bbox.min[0] ? [1, 0, 0] : [-1, 0, 0];
  if (min === h) return bbox.max[1] > -bbox.min[1] ? [0, 1, 0] : [0, -1, 0];
  return bbox.max[2] > -bbox.min[2] ? [0, 0, 1] : [0, 0, -1];
}

const updates = [];
let baked = 0;
let missing = 0;
for (const h of hotspots.hotspots) {
  const node = nodeByName.get(h.anchor_node);
  if (!node) {
    updates.push({ id: h.id, status: "MISSING_NODE" });
    missing++;
    continue;
  }
  const info = nodeBboxAndCentroid(node);
  if (!info) {
    updates.push({ id: h.id, status: "NO_GEOMETRY" });
    missing++;
    continue;
  }
  const [cx, cy, cz] = info.centroid;
  const normal = pickNormal(info.bbox);
  const oldPos = h.fallback_position;
  h.fallback_position = `${cx.toFixed(4)} ${cy.toFixed(4)} ${cz.toFixed(4)}`;
  h.fallback_normal = `${normal[0]} ${normal[1]} ${normal[2]}`;
  updates.push({
    id: h.id,
    anchor: h.anchor_node,
    old: oldPos,
    new: h.fallback_position,
    normal: h.fallback_normal,
  });
  baked++;
}

hotspots._comment =
  "Auto-baked by scripts/bake-hotspot-positions.mjs. fallback_position is the " +
  "world-space centroid of anchor_node's mesh in the source GLB. " +
  `Source: ${SRC_GLB}. Rebake when the model changes.`;

writeFileSync(HOTSPOTS_JSON, JSON.stringify(hotspots, null, 2) + "\n");

console.log(`\n=== Hotspot positions baked from ${SRC_GLB} ===\n`);
for (const u of updates) {
  if (u.status) {
    console.log(`  ✗ ${u.id}: ${u.status}`);
  } else {
    console.log(`  ✓ ${u.id} (${u.anchor})`);
    console.log(`      ${u.old}  ->  ${u.new}   normal=${u.normal}`);
  }
}
console.log(`\n${baked}/${hotspots.hotspots.length} baked, ${missing} missing.\n`);
