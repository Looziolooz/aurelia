import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });

const path = process.argv[2] ?? "public/models/coffee-machine.glb";
const doc = await io.read(path);

const root = doc.getRoot();
console.log("Path:", path);
console.log("Extensions used:", root.listExtensionsUsed().map((e) => e.extensionName));
console.log("Extensions required:", root.listExtensionsRequired().map((e) => e.extensionName));
console.log("Scenes:", root.listScenes().length);
console.log("Nodes:", root.listNodes().length);
console.log("Meshes:", root.listMeshes().length);
console.log("Materials:", root.listMaterials().length);
console.log("Textures:", root.listTextures().length);
console.log("Total accessors:", root.listAccessors().length);
console.log("");
console.log("Materials breakdown:");
for (const m of root.listMaterials()) {
  const baseColorTex = m.getBaseColorTexture()?.getName() ?? "factor";
  const normalTex = m.getNormalTexture()?.getName() ?? "none";
  const mrTex = m.getMetallicRoughnessTexture()?.getName() ?? "factor";
  const alpha = m.getAlphaMode();
  console.log(`  ${m.getName().padEnd(28)} | alpha=${alpha.padEnd(7)} baseColor=${baseColorTex.slice(0,30).padEnd(30)} normal=${normalTex.slice(0,20).padEnd(20)} mr=${mrTex.slice(0,20)}`);
}
console.log("");
console.log("Top-level scene nodes:");
for (const s of root.listScenes()) {
  for (const n of s.listChildren()) {
    const m = n.getMesh();
    const prims = m ? m.listPrimitives().length : 0;
    console.log(`  ${n.getName().padEnd(28)} | mesh=${m ? m.getName() : 'none'} | prims=${prims}`);
  }
}
