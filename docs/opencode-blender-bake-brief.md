# Blender PBR bake brief — AURELIA Pro X1 coffee machine

## Goal (one sentence)

Rewrite the Blender pipeline so the exported GLB at `public/models/coffee-machine.glb` carries **real PBR texture maps** (baseColor, normal, roughness, metallic) instead of flat-colored Principled BSDF, so the React Three Fiber viewer shows a textured machine, not a CAD-looking solid.

## Why this matters

Right now the model in the browser looks like a CAD viewport: flat plastic-looking solids. The reason is in [`assets/3d/coffee-machine/scripts/texture.py`](../assets/3d/coffee-machine/scripts/texture.py) lines **360-373**: after rendering the offline shots, the script **deletes every procedural node** before exporting the GLB, leaving only the Principled BSDF base values. glTF cannot encode procedural shaders, so the export must **bake those procedurals into image textures** first.

The reference look we are targeting is the photo set in `public/foto 360 gradi/` — black matte body, brushed copper trim, walnut wood portafilter handle, polished chrome steam wand. Open `aurellia front.png`, `aurelia left.png`, `dettaglio frontale.png` for context before starting.

## Files in scope

Primary (REWRITE these):
- `assets/3d/coffee-machine/scripts/texture.py` — current monolithic Blender script
- `assets/3d/coffee-machine/scripts/export_only.py` — stale, delete or rewrite

New files to create:
- `assets/3d/coffee-machine/scripts/bake.py` — UV-unwrap + bake procedurals to images
- `assets/3d/coffee-machine/scripts/render.py` — render the 4 hero shots (kept separate from bake)
- `assets/3d/coffee-machine/scripts/run_pipeline.ps1` — orchestrator: gen STEP → import → bake → render → export GLB → copy to public/

Read-only references:
- `assets/3d/coffee-machine/coffee_machine_gen.py` — build123d generator, DO NOT touch geometry topology yet (we improve it in a later pass)
- `components/ProductViewer.tsx` lines **122-180** — current per-mesh material patch in R3F; once the GLB has real textures, this block must be **simplified** (described in §7 below)
- `public/foto 360 gradi/` — 18 reference photos
- `data/hotspots.json` — DO NOT EDIT (hotspot positions are calibrated against current bounding box)

## Hard constraints — do not break

1. **Bounding box must not change**. The hotspots in [`data/hotspots.json`](../data/hotspots.json) are calibrated against the current GLB's bbox. You may regenerate the mesh, but the final exported GLB must have approximately the same overall extents (within ±2%) and the same origin/orientation. If you must change them, you owe a new hotspot calibration JSON — but the default position is "preserve".
2. **Output path is locked**: `public/models/coffee-machine.glb`. The viewer imports it via `useGLTF("/models/coffee-machine.glb")` ([ProductViewer.tsx:53](../components/ProductViewer.tsx#L53)).
3. **GLB size budget**: ≤ 6 MB total (current: 75 KB, but that's because textures are missing). With baked PBR maps you'll grow ~2-4 MB — that's fine. **Hard ceiling 6 MB.**
4. **Texture resolution**: 1024² per material is plenty. Don't bake at 4K — that's iPad memory pressure. Per-material texture set, packed into one image per channel where reasonable.
5. **Draco compression stays ON** for geometry (current setting at level 6). Textures are PNG (or WebP if `export_image_format='WEBP'` works in your Blender build).
6. **No new Python deps**. The pipeline already uses `build123d` (system) + `bpy` (Blender 5.1 bundled, located at `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`). Do not add `numpy` calls beyond what `bpy` already needs internally. Note: Blender 5.x renamed several Principled BSDF inputs (`Subsurface` → `Subsurface Weight`, `Specular` → `Specular IOR Level`, etc.) — the existing `texture.py` already guards with `if 'X' in inputs:` patterns, keep that defensiveness in the new code.
7. **Idempotent runs**. Running the pipeline twice should produce the same GLB byte-for-byte (modulo timestamp metadata). Use deterministic UV seams (`smart_uv_project` with fixed seed) and fixed texture sample counts.
8. **Windows path safety**. The repo is on Windows. Use `os.path.join` everywhere, never hardcode `/` or `\`. The orchestrator is `.ps1`.

## The bake itself — step by step

For each mesh group classified in `texture.py` (`body_main`, `gauge_rim`, `portafilter`, `steam_wand`, `screen_glass`, `gauge_face`, `button`, `steam_nozzle`, `drip_tray`, `accessory`):

### Step 1 — UV unwrap

```python
import bpy
# Select target object
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02, area_weight=0.0)
bpy.ops.object.mode_set(mode='OBJECT')
```

Use `smart_project` rather than `unwrap` — the geometry has no manual UV seams. `island_margin=0.02` keeps a 2% padding so the bake doesn't bleed across islands.

### Step 2 — Create the bake target images

Per material, allocate one image per channel you want to bake:

```python
def make_bake_image(name, size=1024, color_space='sRGB', alpha=False):
    img = bpy.data.images.new(name, width=size, height=size, alpha=alpha)
    img.colorspace_settings.name = color_space
    return img

# Bake targets per material:
# - basecolor_<mat>.png    → sRGB (color data)
# - normal_<mat>.png       → Non-Color (tangent-space normal)
# - rough_<mat>.png        → Non-Color (roughness scalar baked to gray)
# - metallic_<mat>.png     → Non-Color (only for materials where it varies; otherwise just leave as factor)
```

For materials that are spatially uniform in metallic (`accent_copper`, `chrome_polished`, etc.), **skip the metallic bake** and use the factor — saves 4 maps. Bake metallic only for the body material if you add variation (you don't have to in v1).

### Step 3 — Connect bake target to the material node tree

In each material, add an `ShaderNodeTexImage` node, set its image to the corresponding bake target. Leave it **deselected** when baking color/roughness — the bake engine bakes whatever is plugged into the output, but Cycles bakes **into the active selected image node**. Pattern:

```python
def bake_channel(obj, mat, bake_type, target_image, color_space='sRGB'):
    """bake_type: 'DIFFUSE' (color only), 'NORMAL', 'ROUGHNESS', 'GLOSSY', 'EMIT'"""
    # Add image node
    nt = mat.node_tree
    img_node = nt.nodes.new('ShaderNodeTexImage')
    img_node.image = target_image
    img_node.image.colorspace_settings.name = color_space
    img_node.select = True
    nt.nodes.active = img_node

    bpy.context.scene.cycles.bake_type = bake_type
    if bake_type == 'DIFFUSE':
        bpy.context.scene.render.bake.use_pass_direct = False
        bpy.context.scene.render.bake.use_pass_indirect = False
        bpy.context.scene.render.bake.use_pass_color = True
    bpy.context.scene.render.bake.margin = 8
    bpy.ops.object.bake(type=bake_type)

    # Remove the temp image node after bake
    nt.nodes.remove(img_node)
    return target_image
```

Sample counts for bakes: `cycles.samples = 64` is plenty for procedural baking (no global illumination noise, just procedural pattern sampling). Don't use 512 — wastes minutes.

### Step 4 — Rewire the material to use the baked images

After baking, **replace** the procedural node tree with a minimal PBR setup that consumes the baked textures:

```
[basecolor.png] (sRGB)   ─→ Base Color
[rough.png]    (Non-Color) ─→ Roughness
[normal.png]   (Non-Color) ─→ Normal Map node (Tangent space) ─→ Normal
[metallic factor]                                            ─→ Metallic (scalar)
[Principled BSDF] ─→ Material Output
```

This is the only node tree that survives in the final `.blend` and gets exported to glTF.

### Step 5 — Save the images

Pack each baked image into the .blend, then ALSO save to disk as PNG (the glTF exporter can read embedded packed images, but having them on disk lets you inspect them and re-export without Blender):

```python
out_dir = os.path.join(BASE, "out", "textures")
os.makedirs(out_dir, exist_ok=True)
for img in bpy.data.images:
    if img.name.startswith(('basecolor_', 'normal_', 'rough_', 'metallic_')):
        img.filepath_raw = os.path.join(out_dir, img.name + '.png')
        img.file_format = 'PNG'
        img.save()
        img.pack()
```

### Step 6 — glTF export with images

```python
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "coffee-machine-baked.glb"),
    export_format='GLB',
    export_apply=True,
    export_texcoords=True,
    export_normals=True,
    export_tangents=True,            # ← REQUIRED for normal maps to work
    export_materials='EXPORT',
    export_image_format='AUTO',      # AUTO picks PNG for color, JPG for non-color
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
)
```

`export_tangents=True` is **non-negotiable** for normal maps. Without it, three.js can't reconstruct tangent space and the normal map either does nothing or flickers.

## Material targets — values reference

Match these to what's already in [`texture.py`](../assets/3d/coffee-machine/scripts/texture.py), but with proper baked detail. Reference photos confirm:

| Group           | Base color (RGB)        | Metallic | Roughness | Normal strength | Notes |
|-----------------|-------------------------|----------|-----------|-----------------|-------|
| `body_main`     | (0.043, 0.043, 0.043)   | 0.85     | 0.55      | 0.08            | Subtle microsurface — barely visible grain, anisotropic |
| `vent_slit`     | same as body            | 0.85     | 0.55      | 0.08            | inherits body material |
| `foot`          | same as body            | 0.85     | 0.55      | 0.08            | inherits body material |
| `gauge_rim`     | (0.724, 0.451, 0.200)   | 1.0      | 0.25      | 0.05            | brushed copper — anisotropic radial brush |
| `group_head_ring`| same as gauge_rim       | 1.0      | 0.25      | 0.05            | inherits copper |
| `portafilter`   | walnut gradient 74/44/26→154/109/62 | 0 | 0.45 | 0.0 | Voronoi+Wave wood grain, BAKE THIS — the wood is the most photo-recognizable surface |
| `steam_wand`    | (0.910, 0.910, 0.910)   | 1.0      | 0.08      | 0.02            | polished chrome — high reflectivity |
| `spout`         | same as steam_wand      | 1.0      | 0.08      | 0.02            | chrome |
| `group_head`    | same as steam_wand      | 1.0      | 0.08      | 0.02            | chrome |
| `screen_glass`  | (0.02, 0.02, 0.02)      | 0        | 0.15      | 0.03            | dark glass; low transmission (0.05) |
| `gauge_face`    | (0.961, 0.902, 0.827)   | 0        | 0.60      | 0.02            | cream paper dial |
| `button`        | (0.165, 0.165, 0.165)   | 0.1      | 0.40      | 0.04            | rubberized — slight texture |
| `steam_nozzle`  | (0.10, 0.10, 0.10)      | 0        | 0.75      | 0.06            | rubber grip — pronounced texture |
| `drip_tray`     | (0.227, 0.227, 0.227)   | 0.70     | 0.50      | 0.06            | brushed steel — directional anisotropy |

The walnut wood and the brushed copper are the two textures that visually sell the product. Spend time on those two. The body material can be near-flat black with a whisper of normal noise.

## Render pipeline — fix the bugs too

While you're in `texture.py` / new `render.py`, **fix the offline render bugs**. Current renders are tiny + blurry because:

1. **Unit mismatch**: build123d exports in mm (`W=200, D=280, H=280`). When Blender imports GLB, the units come through as **meters** by default — so a 200mm-wide model becomes 200m-wide internally, OR (depending on glTF unit settings) becomes 0.2m and the camera is too far. **Check `bpy.context.scene.unit_settings` after import and scale objects to meters if needed**. Confirm the bbox prints ~`Vector((0.2, 0.28, 0.28))`; if it prints `Vector((200, 280, 280))`, scale by 0.001.

2. **DoF focus distance** ([texture.py:333](../assets/3d/coffee-machine/scripts/texture.py#L333)): `cam_data.dof.focus_distance = 0.5` but camera is ~3m from origin. Either disable DoF (`use_dof = False`) or set focus to the actual camera-to-target distance per view.

3. **Sample clamps too aggressive** ([texture.py:307-308](../assets/3d/coffee-machine/scripts/texture.py#L307-L308)): `sample_clamp_direct = 1.0` and `sample_clamp_indirect = 1.0` kill highlights. Raise to `4.0` and `2.0` respectively, or remove for hero shots.

4. **World background** ([texture.py:313-315](../assets/3d/coffee-machine/scripts/texture.py#L313-L315)): solid white at 1.2 strength washes everything. Either:
   - Drop strength to 0.5 and color to `(0.92, 0.92, 0.93)` (matches reference photo backdrop), OR
   - Load an HDR (the project has `public/hdr/golden_gate_hills_2k.hdr` — use that for environment lighting, set strength to 1.0)
   - Reference photos have a soft gradient backdrop, not pure white.

5. **Camera framing**: at 50mm lens + sensor 36mm, with a 0.28m-tall model, camera should sit ~0.8m away on the z-axis. Match the reference photo framing — the machine fills ~60% of the vertical frame, centered.

6. **View transform**: keep `Filmic` but switch look to `Medium High Contrast` (not `High Contrast` — that crushes blacks).

7. **Resolution**: 2000×1100 is fine for hero shots. Render `render_front.png`, `render_3q_left.png`, `render_3q_right.png`, `render_side_right.png` at full res; samples = 512 with denoising stays.

## §7 — Web viewer cleanup (after the GLB has real textures)

Once `coffee-machine.glb` carries baked PBR maps, the per-mesh material patch in [`components/ProductViewer.tsx:122-180`](../components/ProductViewer.tsx#L122-L180) is **counterproductive** — it overrides the textured materials with flat color hex codes.

After the GLB is in place, **simplify that block to just**:

```ts
useEffect(() => {
  cloned.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const fixMat = (m: any) => {
      m.envMapIntensity = 1.95;
      m.needsUpdate = true;
    };
    const mat = mesh.material as any;
    if (Array.isArray(mat)) mat.forEach(fixMat);
    else if (mat) fixMat(mat);
  });
  const timer = setTimeout(() => onReady?.(), 150);
  return () => clearTimeout(timer);
}, [cloned, onReady]);
```

Drop the `matDefinitions` map. Drop `setHex`, `metallic`, `roughness` overrides. The GLB now owns those values. Only keep `envMapIntensity` (controls HDR contribution) and shadow flags.

**Make this edit only AFTER the new GLB is committed and verified visually** — otherwise the viewer goes flat white during the transition window.

## Orchestrator script

Create `assets/3d/coffee-machine/scripts/run_pipeline.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
$BASE = Split-Path -Parent $PSScriptRoot
$BLENDER = 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe'  # installed version on this machine

# 1. Regenerate STEP from build123d (skip if unchanged)
Write-Host "→ Generating STEP from build123d..."
python "$BASE\coffee_machine_gen.py"

# 2. Convert STEP to GLB via Blender (uses a tiny import-export script)
Write-Host "→ Converting STEP → GLB (intermediate)..."
& $BLENDER --background --python "$PSScriptRoot\step_to_glb.py"

# 3. Bake procedurals to PBR maps
Write-Host "→ Baking PBR textures..."
& $BLENDER --background --python "$PSScriptRoot\bake.py"

# 4. Render hero shots
Write-Host "→ Rendering hero shots..."
& $BLENDER --background --python "$PSScriptRoot\render.py"

# 5. Copy GLB to public/models for the web viewer
Write-Host "→ Syncing GLB to public/models..."
Copy-Item "$BASE\out\coffee-machine-baked.glb" "$BASE\..\..\..\public\models\coffee-machine.glb" -Force

# 6. Report sizes
Write-Host "✓ Pipeline complete"
Get-ChildItem "$BASE\out\*.glb" | Select-Object Name, @{n='KB';e={[int]($_.Length/1KB)}}
Get-ChildItem "$BASE\..\..\..\public\models\coffee-machine.glb" | Select-Object Name, @{n='KB';e={[int]($_.Length/1KB)}}
```

You'll need a tiny `step_to_glb.py` that does the STEP import (build123d compound→GLB) — coffee_machine_gen.py already returns a Compound, just call `compound.export_step()` + a Blender import script. Look at how the current `texture.py` does its initial import for the pattern.

## Validation checklist (run before declaring done)

Open `public/models/coffee-machine.glb` in https://gltf-viewer.donmccurdy.com/ and confirm:

- [ ] All 14+ meshes have a material assigned
- [ ] Each material shows baseColorTexture, normalTexture, metallicRoughnessTexture (or factor where uniform is intentional)
- [ ] Vertex tangents are present (the viewer's "Show normals" debug view should show a smooth tangent frame, not zeros)
- [ ] Total file size ≤ 6 MB
- [ ] No alpha-blended materials (`alphaMode: OPAQUE` everywhere) — otherwise render order breaks in R3F
- [ ] Open the project in dev (`bun dev`) and visually verify: portafilter is unmistakably wood, copper rings have brushed sheen, steam wand reflects HDR clearly, body is matte black with slight microsurface

If any of those fail, fix in `bake.py` / `render.py`. Do not patch around in TypeScript.

## What's out of scope (do NOT do)

- Geometry improvements (mesh grille on top, badge, real knob shape). That's a follow-up brief.
- Switching from build123d to a different CAD framework.
- Touching the web viewer code beyond §7's simplification.
- Adding new dependencies.
- Calibrating hotspots. If the bbox changes by > 2%, **stop and report** rather than guess.
- Generating renders > 2K resolution.

## Deliverables

1. `assets/3d/coffee-machine/scripts/bake.py` — new
2. `assets/3d/coffee-machine/scripts/render.py` — new (split from old texture.py)
3. `assets/3d/coffee-machine/scripts/step_to_glb.py` — new (or fold into bake.py)
4. `assets/3d/coffee-machine/scripts/run_pipeline.ps1` — new orchestrator
5. `assets/3d/coffee-machine/scripts/texture.py` — **delete** (its job is split into bake.py + render.py)
6. `assets/3d/coffee-machine/scripts/export_only.py` — **delete** (stale)
7. `assets/3d/coffee-machine/out/textures/*.png` — baked texture set per material (committed)
8. `assets/3d/coffee-machine/out/coffee-machine-baked.glb` — final GLB
9. `assets/3d/coffee-machine/renders/*.png` — refreshed hero renders
10. `public/models/coffee-machine.glb` — synced copy used by the web viewer
11. `components/ProductViewer.tsx` — **only after GLB is in place**, simplify the material patch block per §7
12. Short report in `docs/reviews/blender-bake-{ISO_DATE}.md` listing: final GLB size, per-material texture size, render timings, any deviations from the brief and why

## Workflow

1. Read this brief end-to-end.
2. Read the reference photos in `public/foto 360 gradi/` (at least `aurellia front.png`, `aurelia left.png`, `dettaglio frontale.png`).
3. Read the current `coffee_machine_gen.py` and the current `texture.py` to understand the existing classification and material assignment.
4. Write `bake.py` first. Test it standalone (`blender --background --python bake.py`). Confirm it produces a textured GLB before touching anything else.
5. Once the GLB is real, run it through the gltf-viewer to validate.
6. Write `render.py` next. Render the 4 hero shots, confirm they look like the reference photos (matte black + visible copper + wood grain).
7. Write the orchestrator and run end-to-end.
8. Apply the §7 viewer simplification, restart `bun dev`, eyeball the result.
9. Write the report.

If the bake step takes > 10 minutes on the first material, something is wrong (probably sample count too high or resolution too high). Stop, halve the samples, restart.

## Failure modes to expect

- **Black baked textures**: the active image node isn't selected, or no UVs exist. Fix: ensure `smart_project` ran AND `img_node.select = True; nt.nodes.active = img_node` before bake.
- **Pink/missing textures in browser**: tangents not exported. Fix: `export_tangents=True` in the glTF call.
- **Massive GLB (> 20 MB)**: texture resolution too high or compression disabled. Fix: bake at 1024, ensure Draco is on for geometry, and use AUTO image format (it picks PNG/JPG smartly).
- **Wrong scale in Blender renders**: STEP→GLB unit mismatch. Fix: explicit `bpy.context.scene.unit_settings.scale_length = 0.001` after import, or rescale objects.
- **Normal maps flickering**: tangents missing OR normal image colorspace set to sRGB by accident. Fix: `img.colorspace_settings.name = 'Non-Color'`.

---

*Brief written by Claude Code for execution by OpenCode. Project: AURELIA Pro X1. Stack: build123d (geometry) → Blender 4.x (bake+render) → glTF (web). Target viewer: R3F + drei.*
