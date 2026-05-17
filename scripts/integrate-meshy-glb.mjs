/**
 * Integra il GLB Meshy AI in AURELIA:
 *   1. Bake transform: non-uniform scale per matchare il bbox AURELIA target
 *      0.28×0.32×0.35 m + recenter ground Y=0. Meshy esporta GIÀ Y-up
 *      (verificato dopo che il modello v1 con rotazione veniva sdraiato).
 *   2. Normalizza materiali (forza doubleSided per evitare facce mancanti).
 *   3. Pipeline gltf-transform: weld → dedup → prune (skip normals: bug bloat).
 *   4. Scrive output in assets/raw/ + copia in public/models/aurelia-prox1.glb.
 *
 * Run: bun scripts/integrate-meshy-glb.mjs
 *
 * Note: Meshy esporta UN solo mesh anonymous con texture (no node tree).
 * Gli hotspot di ProductViewer.tsx funzionano comunque via data-position
 * (slot system di model-viewer interpreta le coord nello scene space, non
 * serve node-name resolution).
 */

import { NodeIO } from "@gltf-transform/core";
import { weld, prune, dedup } from "@gltf-transform/functions";
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";

const SOURCE = "assets/raw/aurelia-meshy-v1.glb";
const OPTIMIZED = "assets/raw/aurelia-meshy-v1-opt.glb";
const PUBLIC = "public/models/aurelia-prox1.glb";

const TARGET_W = 0.280;
const TARGET_H = 0.320;
const TARGET_D = 0.350;

if (!existsSync(SOURCE)) {
  console.error(`[meshy] source missing: ${SOURCE}`);
  process.exit(1);
}

const io = new NodeIO();
console.log(`[meshy] reading ${SOURCE} (${(statSync(SOURCE).size / 1024 / 1024).toFixed(1)} MB)`);
const doc = await io.read(SOURCE);
const root = doc.getRoot();
const meshes = root.listMeshes();

console.log(
  `[meshy] BEFORE: ${meshes.length} mesh, ${root.listMaterials().length} material, ` +
    `${root.listTextures().length} texture`,
);

let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (const mesh of meshes) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    if (!pos) continue;
    const arr = pos.getArray();
    if (!arr) continue;
    for (let i = 0; i < arr.length; i += 3) {
      if (arr[i] < minX) minX = arr[i];
      if (arr[i + 1] < minY) minY = arr[i + 1];
      if (arr[i + 2] < minZ) minZ = arr[i + 2];
      if (arr[i] > maxX) maxX = arr[i];
      if (arr[i + 1] > maxY) maxY = arr[i + 1];
      if (arr[i + 2] > maxZ) maxZ = arr[i + 2];
    }
  }
}

const meshyW = maxX - minX;
const meshyH = maxY - minY;
const meshyD = maxZ - minZ;
console.log(
  `[meshy] Meshy bbox: X=${meshyW.toFixed(3)} (width), ` +
    `Y=${meshyH.toFixed(3)} (height), ` +
    `Z=${meshyD.toFixed(3)} (depth) -- Y-up native, no rotation`,
);

const scaleX = TARGET_W / meshyW;
const scaleY_meshyLocal = TARGET_H / meshyH;
const scaleZ_meshyLocal = TARGET_D / meshyD;

console.log(
  `[meshy] non-uniform scale (Meshy local): ` +
    `X=${scaleX.toFixed(4)}, Y=${scaleY_meshyLocal.toFixed(4)}, Z=${scaleZ_meshyLocal.toFixed(4)}`,
);

const ty = -scaleY_meshyLocal * minY;
console.log(`[meshy] translate Y so ground = 0: ty=${ty.toFixed(4)}`);

function transformPos(x, y, z) {
  return [x * scaleX, y * scaleY_meshyLocal + ty, z * scaleZ_meshyLocal];
}

function transformNormal(nx, ny, nz) {
  const ix = nx / scaleX;
  const iy = ny / scaleY_meshyLocal;
  const iz = nz / scaleZ_meshyLocal;
  const len = Math.hypot(ix, iy, iz) || 1;
  return [ix / len, iy / len, iz / len];
}

console.log(`[meshy] baking transform into vertices + normals…`);
let totalVerts = 0;
let postMinX = Infinity, postMinY = Infinity, postMinZ = Infinity;
let postMaxX = -Infinity, postMaxY = -Infinity, postMaxZ = -Infinity;

for (const mesh of meshes) {
  for (const prim of mesh.listPrimitives()) {
    const posAcc = prim.getAttribute("POSITION");
    if (posAcc) {
      const arr = posAcc.getArray();
      if (arr) {
        const newArr = new Float32Array(arr.length);
        for (let i = 0; i < arr.length; i += 3) {
          const [nx, ny, nz] = transformPos(arr[i], arr[i + 1], arr[i + 2]);
          newArr[i] = nx;
          newArr[i + 1] = ny;
          newArr[i + 2] = nz;
          if (nx < postMinX) postMinX = nx;
          if (ny < postMinY) postMinY = ny;
          if (nz < postMinZ) postMinZ = nz;
          if (nx > postMaxX) postMaxX = nx;
          if (ny > postMaxY) postMaxY = ny;
          if (nz > postMaxZ) postMaxZ = nz;
          totalVerts++;
        }
        posAcc.setArray(newArr);
      }
    }
    const normAcc = prim.getAttribute("NORMAL");
    if (normAcc) {
      const arr = normAcc.getArray();
      if (arr) {
        const newArr = new Float32Array(arr.length);
        for (let i = 0; i < arr.length; i += 3) {
          const [nx, ny, nz] = transformNormal(arr[i], arr[i + 1], arr[i + 2]);
          newArr[i] = nx;
          newArr[i + 1] = ny;
          newArr[i + 2] = nz;
        }
        normAcc.setArray(newArr);
      }
    }
  }
}

console.log(`[meshy] transformed ${totalVerts} vertices`);
console.log(
  `[meshy] post-transform bbox: ` +
    `X=[${postMinX.toFixed(3)}, ${postMaxX.toFixed(3)}] (W=${(postMaxX - postMinX).toFixed(3)}), ` +
    `Y=[${postMinY.toFixed(3)}, ${postMaxY.toFixed(3)}] (H=${(postMaxY - postMinY).toFixed(3)}), ` +
    `Z=[${postMinZ.toFixed(3)}, ${postMaxZ.toFixed(3)}] (D=${(postMaxZ - postMinZ).toFixed(3)})`,
);

for (const mat of root.listMaterials()) {
  mat.setDoubleSided(true);
}

console.log(`[meshy] running pipeline: weld → dedup → prune (skip normals: bloats 3× as no-op)`);
await doc.transform(
  weld({ tolerance: 0.0001 }),
  dedup(),
  prune(),
);

console.log(`[meshy] writing ${OPTIMIZED}`);
await io.write(OPTIMIZED, doc);

if (!existsSync("public/models")) mkdirSync("public/models", { recursive: true });
copyFileSync(OPTIMIZED, PUBLIC);

const finalSize = (statSync(PUBLIC).size / 1024 / 1024).toFixed(1);
console.log(`[meshy] copied → ${PUBLIC} (${finalSize} MB)`);
console.log(`[meshy] done`);
