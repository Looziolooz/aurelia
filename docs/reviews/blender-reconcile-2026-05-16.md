# Blender Reconcile — 2026-05-16

> Ground-truth reconciliation before the render + material-port work.
> Supersedes the framing of [`blender-bake-2026-05-15.md`](blender-bake-2026-05-15.md)
> (its GLB→viewer open items are now moot — see §1).
> Source: live MCP introspection of `assets/3d/coffee-machine/out/coffee-machine-baked.blend`
> + `lib/espressoMachine.ts` + `docs/opencode-blender-bake-brief.md` material table.

---

## 1. Architecture reality — three independent representations

The locked brief (`docs/00-brief.md`) and the bake brief assume **one** model:
build123d → Blender bake → `coffee-machine.glb` → `useGLTF` in the viewer.
That is no longer true. As of 2026-05-16 there are **three** independent things:

| # | Artifact | Feeds | State |
|---|----------|-------|-------|
| 1 | `lib/espressoMachine.ts` (1,114 ln, edited 2026-05-16 18:55) | The **live totem** (R3F) | Procedural geometry + **JS `THREE.CanvasTexture`** PBR maps. No GLB, no mesh_data.json, no Blender dependency. |
| 2 | `bake.py` → `coffee-machine-baked.{blend,glb}` | **Nothing** | Vestigial. The bake-brief §7 viewer swap was never applied — the project went procedural-JS instead. |
| 3 | `render.py` ← `coffee-machine-baked.blend` | Offline **hero renders** (attractor/marketing PNGs) | Live track. Self-contained (injects own camera+world). |

**Consequence:** the 2026-05-15 report's open items ("sync GLB to public/",
"ProductViewer §7 simplification", "bbox blocks hotspots") are **obsolete** —
nothing loads the GLB. The bbox-mismatch BLOCKER no longer blocks anything.

The "material port" in this work therefore means: **extract the intended
material look (values + the Cycles-baked maps where valid) and tune the JS
canvas-texture materials in `espressoMachine.ts` to match the Cycles hero** —
*not* GLB→viewer. The viewer code already states this intent
(`ProductViewer.tsx` `Lights()`: "Palette target = the Cycles hero render (sampled)").

---

## 2. `.blend` ground truth (live MCP read, 2026-05-16)

- **Units: correct.** `METRIC / scale_length 1.0 / METERS`. The bake-brief's
  feared mm↔m mismatch **does not exist here**. Render-track unit-fix is a no-op.
- **Bbox (world):** `min [-0.113,-0.165,-0.145]` `max [0.117,0.140,0.195]`,
  size **0.2295 × 0.305 × 0.340 m** (Blender Z-up; height = Z = 0.34 m).
  Matches the 2026-05-15 report's numbers — consistent, real-world scale.
- **24 mesh objects**, 9 materials. Classification is clean (body_main + 4
  feet + 6 vent slits share `pbr_body_main`; gauge_rim + group_head_ring share
  `pbr_gauge_rim`; steam_wand + spout + group_head share `pbr_steam_wand`).
- **No camera, no world** saved in the `.blend` (`cameras:[]`, `world:{}`).
  `render.py` injects both → headless render is self-contained, but a raw
  viewport grab is not a framed hero shot.
- Tone: `.blend` saved as **AgX / look None**; `render.py` forces
  **Filmic / Medium High Contrast**; live R3F viewer uses **AgX**. Mismatch
  to reconcile (see §5).

---

## 3. BUG — black copper + black chrome (must fix before render/port)

The current `coffee-machine-baked.blend` (saved 2026-05-15 11:05) has **two
broken materials**:

| Material | Meshes | Live `.blend` state | Should be |
|----------|--------|---------------------|-----------|
| `pbr_gauge_rim` | gauge_rim, group_head_ring | `base_color [0,0,0]`, **no basecolor image** (only rough+normal), `bc_tex:false` | **Copper** ≈ rgb(0.724,0.451,0.200) |
| `pbr_steam_wand` | steam_wand, spout, group_head | `base_color [0,0,0]`, **no basecolor image** (only rough+normal), `bc_tex:false` | **Chrome** ≈ rgb(0.910,0.910,0.910) |

**Initial (incomplete) diagnosis:** the constant-demotion path
(`image_is_constant` / `_sample_inside_uv`, bake.py:79–124) averaging the
`(0,0,0)` UV-pad background → black factor. A redirected re-bake with the
`_sample_inside_uv` fix kept the textures linked (no factor demotion) — but
a dense full-image numpy scan showed `basecolor_gauge_rim.png` and
`basecolor_steam_wand.png` were **still 100% black (every pixel 0,0,0)**.
The demotion was a *symptom*, not the cause.

**Actual root cause (confirmed 2026-05-16):** `bake_channel()` bakes Base
Color via the Cycles **`DIFFUSE` colour pass**. That pass returns the
*diffuse-lobe* albedo only. A `metallic = 1.0` surface (copper
`mat_gauge_rim`, chrome `mat_steam_wand`) has **no diffuse lobe** → its
DIFFUSE bake is pure black *by construction*. Partial metals are darkened
proportionally: `body_main` (metal 0.85) baked at ~15 % weight — sampled
sRGB `0.0705` ≈ linear `0.0065` ≈ `0.043 × 0.15`, confirming the mechanism.
**Every metallic material's basecolor was wrong; the two pure metals were
black.** Re-baking as-is could never fix it.

**Fix applied:** `bake.py` `bake_channel()` now force-sets `Metallic = 0`
on every Principled BSDF in the material for the DIFFUSE basecolor bake
(saving/restoring value or link exactly), so true albedo is captured for
metals too. The final material still receives the correct metallic factor
from `METALLIC_FACTORS`. General, root-cause, no hardcoded colours.

**This contradicts `blender-bake-2026-05-15.md`** (claims all 9 groups baked
successfully; lists `gauge_rim`/`steam_wand` baseColor at 13 KB). That report
described the GLB *before* the constant-demotion regression hit the `.blend`.

**Impact:** any hero render from this `.blend` shows **black copper rings and
a black steam wand/group head/spout** — copper is "the texture that sells the
product." Both render track and material-extraction must treat copper/chrome
from this `.blend` as **invalid** and source them from the canonical table /
`coffee-machine-procedural.blend` instead.

---

## 4. Reconcile table — `.blend` ↔ `espressoMachine.ts` ↔ canonical target

Canonical = `docs/opencode-blender-bake-brief.md` material table (sampled from
`public/foto 360 gradi/` reference photos). JS = `lib/espressoMachine.ts`.

| Surface | Canonical (base RGB / metal / rough) | `.blend` baked | JS material(s) | Status / action |
|---|---|---|---|---|
| Body (matte black) | 0.043³ / 0.85 / 0.55 | ✅ `pbr_body_main` tex ok, metal 0.85 | `body` (tex, m0.85 r1.0 env0.9), `bodyDark` 0x070708 | OK. JS `body` roughness 1.0+map vs canonical 0.55 — verify map midpoint. |
| Copper trim | 0.724,0.451,0.200 / 1.0 / 0.25 | ❌ **BLACK** (bug §3) | `copperMatte` (tex), `copperBright` 0xc78250, `copperEdge` 0xa0623a | **.blend invalid.** Port from canonical / procedural.blend. |
| Chrome (wand/group) | 0.910³ / 1.0 / 0.08 | ❌ **BLACK** (bug §3) | `chrome` 0xeeeef0 (m1.0 r0.05), `chromeBrushed` 0xc8c8cc | **.blend invalid.** Port from canonical. |
| Walnut portafilter | grad 74/44/26→154/109/62 / 0 / 0.45 | ✅ `pbr_portafilter` 598 KB basecolor (valid) | `walnut` (tex, m0 r1.0 env0.45) | OK — best baked source. Sample for JS. |
| Steel drip tray | 0.227³ / 0.70 / 0.50 | ✅ `pbr_drip_tray` tex ok | `steel` 0xb8b8bc (m1.0 r0.22) | JS metal 1.0 vs canon 0.70 — reconcile. |
| Gauge face (cream) | 0.961,0.902,0.827 / 0 / 0.60 | ✅ `pbr_gauge_face` tex ok | `gauge` (m0.55…) | OK. |
| Screen glass | 0.02³ / 0 / 0.15 | ✅ `pbr_screen_glass` | `lcd` (emissive) | Different intent (live LCD glows). Keep JS. |
| Buttons | 0.165³ / 0.1 / 0.40 | ✅ `pbr_button` | `rubber`/`plastic` | OK. |
| Steam nozzle | 0.10³ / 0 / 0.75 | ✅ `pbr_steam_nozzle` | `rubber` 0x06060a r0.92 | JS rough 0.92 vs canon 0.75 — minor. |

**Trustworthy baked sources for the port:** body_main, portafilter (walnut),
drip_tray, gauge_face, screen_glass, button, steam_nozzle.
**Untrustworthy (black bug):** gauge_rim (copper), steam_wand (chrome) →
use canonical values + `coffee-machine-procedural.blend`.

---

## 5. Constraints discovered (hard)

1. **No Cycles GPU compute** on this machine (confirmed by 2026-05-15 report:
   CPU-only bake). A full hero render = **512 samples @ 2000×1100 ≈ 1–2 h CPU**.
   → Iterate with low-sample preview renders; final render runs detached/long.
2. **Interactive Material/Rendered viewport shading crashes Blender** (SIGSEGV,
   weak kiosk iGPU — matches memory `webgl-gpu-budget-ceiling`). All visual
   verification = **offline render to file**, never live viewport shading.
   Keep the GUI viewport in SOLID.
3. Hotspot calibration (`data/hotspots.json`) is **decoupled** from this work
   now (no GLB consumed) — but `espressoMachine.ts` native scale is the live
   contract; do not change model extents without checking the viewer camera.

---

## 6. Plan (revised from constraints)

**Render track (todo 4–5)**
- `render.py` already has unit/sampling/view-transform fixes. Real gaps:
  copper/chrome will render **black** (§3) — must fix the `.blend`'s two
  materials first (re-bake those two with the `_sample_inside_uv` fix, or
  patch the factors directly to canonical copper/chrome).
- Validate framing/materials with a **fast preview** (64 samples, 800×440)
  before committing to the 1–2 h full render.
- Add headless BlenderProc-style automation: deterministic, `--background`,
  fixed seed, emits per-view timing; runnable unattended.

**Material-port track (todo 6–7)**
- Extract: sample mean RGB + roughness from the **valid** baked PNGs
  (body, walnut, drip_tray, gauge_face, etc.) via MCP pixel read.
- Copper/chrome: take from canonical table + `coffee-machine-procedural.blend`
  node values (NodeToPython-style read), **not** the black `.blend`.
- Tune `espressoMachine.ts` JS canvas-texture material params + the
  `Lights()` rig so the live R3F frame matches the (fixed) Cycles hero.
- Respect the kiosk WebGL budget (memory `webgl-gpu-budget-ceiling`): no new
  large textures/passes; reuse existing canvas-texture sizes.

**Verify (todo 8)**: side-by-side fixed Cycles hero vs `bun dev` capture;
GPU-budget sanity; final report.

---

---

## 7. Material-port spec (Cycles-validated targets → espressoMachine.ts)

Sampled from the **metal-fixed** bake (`textures-fixed/`, 2026-05-16).
Texture means are **sRGB-encoded** (PNG colorspace); JS hex is sRGB too,
so these compare directly. Procedural-source values are **linear**.

| Live target (espressoMachine.ts) | Current | Cycles/canonical target | Confidence |
|---|---|---|---|
| `texSetCopper` gradient `#d99564/#b87344/#754626` | mid skews dark/orange | baked copper mean **rgb(212,164,104)** ≈ `#D4A468`, bright `#DAAA6C` | High (measured) — nudge mid→`~#C8895A`, center→`~#DBA572` |
| `texSetWalnut` gradient (espresso-dark) | max stop ~rgb(130,77,42) | baked walnut mean **rgb(190,168,144)**, bright rgb(227,218,208) — much lighter | **Low — Cycles vs JS disagree; reference photo is mid-walnut. VISUAL A/B required, do not apply blind** |
| `chrome` `0xeeeef0` | rgb(238,238,240) | baked chrome **rgb(238,238,238)** (sRGB 0.934) | High — already correct, leave |
| `body` satin base `#1c1c1f` | linear ≈0.011 | canonical body **linear 0.043** (sRGB `#3a3a3a`); baked mean confirms 0.0414 | Medium — current reads darker than hero; nudge only after A/B |
| `steel` metalness 1.0 / `gauge` 0.55 / `rubber` r0.92 | hand-tuned | canonical drip_tray m0.70 / steam_nozzle r0.75 | Low — deliberate aesthetic choices (aesthetic-pass-summary.md); leave unless A/B shows mismatch |

**Rule:** only `chrome` (already correct) and the `copper` tone nudge are
safe to apply without visual feedback. Everything else (walnut, body,
metalness/roughness) interacts with the hand-tuned envMapIntensity +
`Lights()` rig and **must** be A/B'd against the rendered hero in the
running R3F app (todo 9) before editing live code.

---

*Reconcile by Claude Code, 2026-05-16. Live MCP introspection + metal-fixed
bake sampling. §7 is the actionable port spec. Live `espressoMachine.ts`
NOT yet modified — visual-gated per §7.*
