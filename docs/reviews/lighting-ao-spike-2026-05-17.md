# Lighting / AO follow-up spike — 2026-05-17

> Outcome of the lights-&-shadows repo scouting (PlayCanvas, Galacean,
> n8ao-webgpu, webgl2-fundamentals). Vault note: `Projects/🧊 Lighting &
> Shadow — Engine Scouting.md`. **Tracked, NOT yet applied** — see "Why
> deferred". Pick this up post-deploy.

## The one actionable item (high value / low risk, done right)

**Bake a soft ambient-occlusion term into the live procedural model.**

When N8AO/SSAO was removed (it tipped the weak kiosk iGPU into WebGL
context loss — see memory `webgl-gpu-budget-ceiling`), the model lost its
crevice/contact depth cue. PlayCanvas + Galacean both answer "weak GPU"
the same way: **bake it, don't compute it at runtime.** An aoMap costs
zero per-frame GPU — exactly within our budget.

### Where (concrete)
- `lib/espressoMachine.ts` — the `makeTex` / PbrSet material path. Add an
  `aoMap` (or fold an AO gradient into the existing roughness canvas
  textures) per material, UV2 = UV1 for the procedural meshes.
- OR reuse the existing Blender bake pipeline (`assets/3d/coffee-machine/
  scripts/bake.py`) which already bakes detail for the hero — extend it to
  emit an AO map and consume it in the live materials.

### Acceptance criteria (must all hold)
1. Visual A/B in the **running app** vs the Cycles hero — crevices read
   deeper, body/copper/walnut tone unchanged, no muddy darkening.
2. GPU budget unchanged: no new post pass, no extra FBO, dpr/env/post
   values untouched (memory `webgl-gpu-budget-ceiling`). aoMap is a
   texture sample, not a pass — verify no context-loss regression on the
   kiosk profile.
3. No regression to the metal anti-alias fix (chrome/copper roughness)
   or the locked look (`DESIGN.md` / `docs/00-brief.md`).

## Why deferred (not applied now)
Applying it during the Vercel deploy, to the locked/verified model,
**without the ability to visually verify here** (headless browse wedged;
`next build` checks compile, not look) would risk the shipped product for
a marginal gain — contrary to the design-consultation decision (no
redesign mid-deploy) and the session's locked/verified discipline. This
is a visual change; it needs eyes on the running app.

## Secondary / future
- **`RectAreaLight` (LTC)** in vanilla Three as a budget-safe replacement
  for the directional key/fill in `ProductViewer.tsx` `Lights()` —
  PlayCanvas's approach, available without an engine swap. Evaluate after
  the AO bake; same acceptance bar.
- **n8ao-webgpu** (CC0) — the way to get real-time AO back, but needs a
  WebGPU renderer migration and WebGPU on the kiosk/Edge/Safari-iPad
  targets (often unavailable). Future WebGPU iteration only.
- **webgl2-fundamentals / Galacean source** — reference shelves, no action.

*Spike logged by Claude Code, 2026-05-17. Do post-deploy, with visual A/B.*
