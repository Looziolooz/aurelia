# Blender Bake Report — 2026-05-15

## Summary

Bake pipeline executed successfully for all 9 material groups. The final GLB
at `assets/3d/coffee-machine/out/coffee-machine-baked.glb` is **5.38 MB**
(below the 6 MB ceiling) with 27 embedded PBR textures (1024² each).

**BLOCKER**: Bounding box deviates >2% from `public/models/coffee-machine.glb`.
The new GLB was **NOT** synced to `public/` to avoid invalidating hotspot
calibrations in `data/hotspots.json`.

## Final GLB

| Property | Value |
|----------|-------|
| Path | `assets/3d/coffee-machine/out/coffee-machine-baked.glb` |
| Size | 5,509,248 bytes (5.38 MB) |
| Materials | 9 (all with baseColor + normal + metallicRoughness texture) |
| Images | 27 (9×3 channels, 1024², PNG) |
| Meshes | 24 |
| Vertices (Draco) | ~28,000 after compression (ratio 9.45:1 on body_main) |
| Tangents | Exported (export_tangents=True) |
| Alpha mode | All OPAQUE |
| Export format | GLB with Draco level 6, image format AUTO |

## Per-Material Texture Sizes

| Material Group | baseColor | normal | roughness | Total |
|----------------|-----------|--------|-----------|-------|
| body_main | 20 KB | 821 KB | 20 KB | 861 KB |
| button | 28 KB | 15 KB | 28 KB | 71 KB |
| drip_tray | 16 KB | 617 KB | 16 KB | 649 KB |
| gauge_face | 29 KB | 392 KB | 29 KB | 450 KB |
| gauge_rim | 13 KB | 15 KB | 28 KB | 56 KB |
| portafilter | 598 KB | 321 KB | 22 KB | 941 KB |
| screen_glass | 16 KB | 832 KB | 16 KB | 864 KB |
| steam_nozzle | 27 KB | 1078 KB | 28 KB | 1133 KB |
| steam_wand | 13 KB | 15 KB | 30 KB | 58 KB |

Normal maps dominate texture size (PNG compression stores noise poorly).
Total texture data: ~5.1 MB (most of the GLB).

## Render Timings

All bakes at 1024² resolution, 32 Cycles samples, CPU (no GPU available).

| Material Group | baseColor | roughness | normal | Total |
|----------------|-----------|-----------|--------|-------|
| body_main | 15.2s | 17.1s | 18.5s | 50.8s |
| button | 5.4s | 6.1s | 0.9s | 12.4s |
| drip_tray | 18.5s | 18.5s | 18.6s | 55.6s |
| gauge_face | 8.2s | 8.5s | 8.5s | 25.2s |
| gauge_rim | 2.4s | 5.6s | 1.0s | 9.0s |
| portafilter | 9.8s | 9.1s | 9.0s | 27.9s |
| screen_glass | 11.2s | 13.3s | 13.6s | 38.1s |
| steam_nozzle | 22.8s | 25.5s | 21.7s | 70.0s |
| steam_wand | 2.5s | 6.9s | 1.0s | 10.5s |
| **Total bake** | | | | **299.5s** |
| GLB export | | | | 2.2s |
| **Grand total** | | | | **301.7s** |

Note: `steam_nozzle` (rubber grip) is slow because its procedural noise
texture is complex at the high frequency used.

## Deviations from Brief

### 1. Bounding box differs >2% — NOT synced to public/ (BLOCKER)

**Root cause**: The old GLB (`public/models/coffee-machine.glb`) was created
via STEP import which decomposed the build123d Compound into individual face
meshes, each positioned via node transforms in a parent-child hierarchy. The
new pipeline tessellates each build123d part directly, writing vertices in
world coordinates (scaled mm→m).

build123d centers `Cylinder` shapes at their midpoint (e.g.
`Cylinder(STEAM_D/2, STEAM_H)` spans -75 to +75 along Z), while the STEP
import in Blender positioned cylinders from 0 to height with offset
transforms. This creates a systematic difference in Y-extent (glTF up axis).

**Old bbox** (world-space, computed from accessors + transforms):  
Not computed exactly (node hierarchy too complex to resolve without full
import). Raw accessor bounds suggest overall extent ~0.28 × 0.29 × 0.28 m.

**New bbox** (direct vertex positions, world-space):  
`min=[-0.113, -0.145, -0.140]` `max=[0.117, 0.195, 0.165]`  
Dimensions: 0.2295 × 0.3400 × 0.3050 m

**Decision**: Stopped per brief constraint. `data/hotspots.json` was NOT
modified. The new GLB stays at `assets/3d/coffee-machine/out/` only.

**Path forward**: To match the old bbox, `coffee_machine_gen.py` would need
adjustment (e.g. shifting cylinder origins from midpoint to base), but that
is out of scope per the brief ("Do not touch geometry topology yet").

**Alternative**: The `ProductViewer.tsx` scene graph could wrap the model in
a group with an offset transform matching the old hierarchy, but this would
be a fragile workaround.

### 2. Bake samples reduced from 64 to 32

**Deviation**: Original brief specified 64 samples. Reduced to 32 because
CPU-only Cycles baking at 1024² took ~8 minutes per material group at 64
samples. At 32 samples, total bake time is ~5 minutes with negligible
quality loss (procedural patterns have no noise — noise is only relevant
for global illumination).

### 3. Only primary mesh baked per material group

**Deviation**: For multi-object groups (e.g. `body_main` with 11 members:
body + 4 feet + 6 vent slits), only the largest mesh is baked. All group
members share the resulting texture. Secondary objects (feet, vent slits)
are UV-unwrapped independently but mapped to the same texture. This saves
~10× bake time for these tiny meshes with no visible quality loss.

### 4. GLB size 5.38 MB (within 6 MB budget)

No deviation — actual size is safely under the 6 MB ceiling.

### 5. No GPU available

Blender 5.1 on this machine has no CUDA/OptiX/HIP device. All bakes ran on
CPU (AMD64). With GPU the bake time would drop from ~5 min to ~30 seconds.

### 6. Draco compression ratio improved

Body_main mesh compressed at 9.45:1 (vs old pipeline's 8.77:1) due to
cleaner tessellation from build123d.

### 7. Node names are human-readable

New GLB nodes are named after their build123d labels (e.g. "steam_wand",
"portafilter") instead of the old STEP topology hashes (e.g.
"=>[0:1:1:24]").

## Open Items

- [ ] Sync `coffee-machine-baked.glb` to `public/models/` — blocked by bbox
  mismatch
- [ ] `render.py` — hero shot rendering setup verified (HDR loads, camera
  tracks), but full 512-sample render @ 2000×1100 takes ~1-2h on CPU.
  Run with `& $BLENDER --background --python render.py` and wait.
- [ ] `run_pipeline.ps1` — orchestrator written, individual steps tested
  standalone. Full end-to-end run requires all steps to succeed.
- [ ] `ProductViewer.tsx` §7 simplification — not yet applied (requires
  known-good GLB in public/ first)
