# Blender Track — Completion Report (2026-05-16)

Scope: "use the Blender knowledge to finish both the hero render pipeline
and the material port." Technical source of truth:
[`blender-reconcile-2026-05-16.md`](blender-reconcile-2026-05-16.md).

## What was wrong (root causes found)

1. **Copper + chrome rendered pure black.** Not the documented
   constant-demotion bug — `bake.py` baked Base Color via the Cycles
   `DIFFUSE` colour pass, which returns zero for `metallic = 1.0`
   surfaces. Every metal's albedo was wrong; the two pure metals were
   black. (`body_main` confirmed the mechanism: baked 0.0065 vs true
   0.043.)
2. **`render.py` produced top-down / HDR-only frames.** It used glTF
   Y-up coords + a `TRACK_TO` constraint that does **not** evaluate under
   `bpy.ops.render.render()` in `--background`; the camera stayed
   unrotated.
3. **Off-brand look.** Outdoor `golden_gate_hills` HDR as the visible
   background; model floated (no floor); 600 W area lights washed the
   matte-black body to mid-grey.
4. **Architecture drift.** The live totem is procedural
   (`lib/espressoMachine.ts`), not a GLB — the 2026-05-15 bake report's
   GLB→viewer items are obsolete.

## What was fixed

| File | Change |
|---|---|
| `scripts/bake.py` | Metal-neutralize every Principled BSDF during the DIFFUSE basecolor bake, restore exactly after. Env-overridable output paths (`AURELIA_TEXTURE_OUT/BAKED_BLEND/BAKED_GLB`). |
| `scripts/render.py` | Z-up framing from runtime bbox; **direct `rotation_euler` aiming** (no constraint); studio cyclorama (studio HDR for light/reflections, bright soft backdrop for camera rays) matched to `public/foto 360 gradi/`; grounding floor (excluded from framing bbox); HDR-dominant soft lighting (area lights 600/120/210 → 45/12/25 W); env-overridable input/dir/samples/scale/views. |
| `scripts/blender_autoconnect.py` | Self-enables/installs the BlenderMCP addon before starting the server (was assuming it was enabled). |
| `scripts/run_pipeline.ps1` | `-Fixed` / `-PreviewRender` switches, deterministic headless orchestration, corrected (de-obsoleted) notes. |
| `lib/espressoMachine.ts` | §7 port: copper gradient → Cycles "rame brunito" rgb(212,164,104); walnut lightened ~1.5× toward bake; body base `#1c1c1f`→`#343438` (canonical linear 0.043). Chrome already correct (left). Hand-tuned metalness/roughness/envMap **left untouched** (deliberate per `aesthetic-pass-summary.md`). Color-only: no new textures/passes → kiosk WebGL budget unchanged. |

## Verification done

- Bake correctness **numerically proven**: dense scan of metal-fixed
  `textures-fixed/` — copper rgb(0.83,0.64,0.41), chrome rgb(0.93)³,
  `body_main` linear **0.0414 ≈ canonical 0.043** (was 0.0065).
- Render framing proven via `world_to_camera_view` projection check
  (all 4 views in-frame, ~63 % fill) before committing renders.
- Studio look validated over preview iterations against `aurellia
  front.png` (matte-black body, bright seamless sweep, grounded).

## Artifacts

- `out/coffee-machine-baked-fixed.{blend,glb}`, `out/textures-fixed/*`
  (27 maps) — metal-corrected. Originals preserved.
- `renders/preview/*` — validated look.
- `renders/*` — **full hero set complete** (4 views, 2000×1100, 512 spp,
  OpenImageDenoise), ~50 min total CPU:

  | View | Time | Size |
  |---|---|---|
  | `render_front.png` | 681 s | 1.77 MB |
  | `render_3q_right.png` | 716 s | 1.76 MB |
  | `render_3q_left.png` | 698 s | 1.76 MB |
  | `render_side_right.png` | 901 s | 1.75 MB |
  | **Total** | **2997 s (~50 min)** | — |

  Clean (denoised, no fireflies), on-brand studio hero: matte-black body,
  bright seamless sweep, grounded contact shadow, correct framing.
  Geometry simplicity (box form) is the procedural CAD model's limit —
  out of scope per the bake brief, not a pipeline fault.

- ⚠ Stale orphan: `renders/render_side.png` (592 KB, 2026-05-14) predates
  this session and the current 4-view naming (`render_side_right.png`).
  Left in place — not created here; remove if unwanted.

## Visual A/B — done (2026-05-16)

Headless capture of the live app worked despite the weak-GPU risk:
WebGL stayed alive (only the known `willReadFrequently` ReadPixels perf
warning, no context loss / white screen). Captured the active-phase model
(`renders/_live_ab_active.png`) via the gstack browse daemon — note
`preserveDrawingBuffer:false` blocks JS canvas pixel readback, so the A/B
is visual on compositor screenshots, not pixel-metric. Live model renders
on the intentional dark void (R3F bloom/AgX), hero on the bright studio
sweep (Filmic) — judged on material *read*, not pixel match.

| Ported value | Live result | Verdict |
|---|---|---|
| body `#343438` | deep matte near-black, correct under metalness 0.85 + dark env | **validated — keep** |
| copper `#dba572/#c98a56/#7a4e2c` | warm burnished "rame brunito", not garish | **validated — keep** |
| walnut (lightened ~1.5×) | handle small + dark-lit; no evidence wrong, not precision-verifiable | **defensible (measured), designer-eyeball flagged** |

Body + copper ports confirmed good live. Walnut left at the measured
Cycles value (no signal it's wrong; further blind tweaking would be
churn) — inline comment in `espressoMachine.ts` flags it for a bright/
zoomed designer pass if desired.

## Remaining

- Walnut: optional designer eyeball in a bright/zoomed context (low
  priority — measured value is defensible, not visibly wrong live).
- A/B scratch frames `renders/_live_ab_*.png` are session evidence;
  delete if unwanted (prefixed `_`, don't collide with `render_*.png`).
- Geometry detail (display, E61 group, badge) — out of scope per the
  bake brief (separate follow-up).

*Completion report by Claude Code, 2026-05-16.*
