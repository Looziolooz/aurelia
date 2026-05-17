import { NodeIO } from "@gltf-transform/core";

const path = process.argv[2] ?? "public/models/aurelia-prox1.glb";
const doc = await new NodeIO().read(path);
for (const m of doc.getRoot().listMaterials()) {
  console.log(
    `${m.getName().padEnd(28)} | base=${JSON.stringify(m.getBaseColorFactor())} metallic=${m.getMetallicFactor()} rough=${m.getRoughnessFactor()} emissive=${JSON.stringify(m.getEmissiveFactor())}`,
  );
}
