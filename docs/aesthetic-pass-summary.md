# Aesthetic Pass Summary

## Changes by file

### `tailwind.config.ts`
- Added `attractor-pulse-slow` keyframe (5s, dimmer opacity) — used by HotspotPin in `visited` state so the outer ring slows and fades.
- Added `core-pulse` keyframe (1.2s, scale 1→1.15→1) — used by HotspotPin inner core when `isActive`.
- Both mapped to `animation` utilities with `--ease-quiet` easing.

### `messages/{it,en,sv}.json`
- Added `ui.panel.close` key in all three locales ("Chiudi pannello", "Close panel", "Stäng panelen") — used by HotspotPanel close button aria-label.

### `components/ProductViewer.tsx`
- **Goal 1 — Material richness**: Bumped `envMapIntensity` from 1.2 to 1.8. The GLB is a single-mesh model (Meshy), so per-material differentiation isn't possible. The higher global intensity makes chrome highlights read brighter and the copper accents warmer via the studio HDR.
- **Goal 2 — Lighting balance**: Reduced local light intensities by ~50% (front fill 0.4→0.2, rim back 0.6→0.3, hemisphere 0.35→0.15). Raised `environmentIntensity` from 1.05 to 1.4. This shifts the ratio from roughly 50/50 HDR/local to ~70/30, making the HDR the primary lighting source and the local lights subtle accents as specified.

### `components/HotspotPin.tsx`
- **Goal 6 — Micro-motion**: Visited state outer ring now uses `animate-attractor-pulse-slow` (5s cycle, dimmer opacity) instead of the standard 3s pulse. Active state inner core now uses `animate-core-pulse` (1.2s scale loop) instead of static `scale-110`.

### `components/HotspotPanel.tsx`
- **Goal 3 — Panel polish**: Close button aria-label changed to `t("panel.close")` (dedicated key per brief). Close button hover state now targets copper accent. Description paragraph tightened to 18px (Inter) with cream-200 for better visual hierarchy. Spec item separators changed from `--border-subtle` to `--accent-soft` (copper accent line separators).

### `components/LanguagePicker.tsx`
- **Goal 5 — Disc style**: Button changed from rect to `rounded-full`. Text color changed from cream-100 to copper (`text-accent`). Hover/focus now show copper border + `shadow-copper-tight` pulse. Active locale indicator changed from a left-positioned dot to a bottom-positioned copper underline bar.

### `components/AttractorOverlay.tsx`
- **Goal 4 — Polish**: Added subtle breathing animation (scale 0.99→1.01, 2s each way, sine.inOut, infinite loop) on the container via GSAP. Product name changed to `uppercase` with `tracking-[0.05em]`, sized at `clamp(64px,5vw,80px)` as specified. Added copper underline bar (8px tall, 240px wide, rounded-full, centered) that expands from 0→240px via GSAP `from()` tween on each scene-A cycle.
- **Bug fix — Exit animation**: The previous code returned `null` when `phase !== "attractor"`, which meant the fade-out GSAP animation (in useGSAP) never actually played — React unmounted the DOM before the tween could run. Fixed by having `handleActivate()` animate the exit (kill breathing, scale down to 0.98, fade to 0 over 200ms, then call `enterActive()` via `onComplete`). The exit animation now plays fully before the component unmounts.

## Trade-offs

1. **Single-material GLB**: The model is a single mesh from Meshy. Goal 1 asked for "tune `envMapIntensity` per-material", but that's impossible without multiple materials. Instead we pushed the global intensity higher (1.8) so the HDR reflections hit both chrome and copper areas. If a multi-material GLB is provided later, `fixMat` can be extended with `m.name` checks.

2. **Attractor scene cycle timing**: The copper underline animation runs on every scene-A repeat cycle (every ~4.4s). An alternative would be a one-shot mount animation, but the repeating cycle reinforces the "atelier showcase" feeling. The brief didn't specify one-shot vs repeat, so we kept it aligned with the existing scene rotation.

3. **LanguagePicker shape**: Changed to `rounded-full` (disc) instead of `rounded-soft` (pill), which matches the "small floating disc" description. The disc is 56×56px (same as before) — large enough for touch target compliance.

## Left untouched

- **Camera config, dpr, gl options, post-FX values** — explicitly forbidden by constraint 1.
- **`<Html>` / React Context boundary** — no calls to `useTranslations` inside HotspotPin or any `<Html>` children (constraint 2).
- **AgX tone mapping** — kept `THREE.AgXToneMapping` (constraint 3).
- **i18n structure** — `panel.close` added in all 3 locales, no other messages touched.
- **Hotspot positions** (`data/hotspots.json`) — read-only per brief.
- **zustand store** — no changes.
- **No new dependencies** — all animations use gsap (already installed) or Tailwind keyframes.
- **EffectComposer passes** — not touched; 0 new passes added.

## Performance impact

- **Negligible**: The new keyframe animations (`attractor-pulse-slow`, `core-pulse`) are CSS-only, zero JS cost.
- **Breathing animation**: One additional GSAP tween on the attractor container — runs only during attractor phase, killed on exit.
- **Copper underline**: One additional GSAP `from()` tween per scene cycle — duration 0.8s, negligible overhead.
- **No new postprocessing passes, no new geometry, no particles added.**
