# Aesthetic improvement brief — AURELIA Pro X1 totem

## Context

You are editing a Next.js 16 / React 19 / TypeScript project that renders a 3D
espresso machine on a fiera (trade show) kiosk. The 3D pipeline is **React
Three Fiber (R3F) 9** + **@react-three/drei 10** + **@react-three/postprocessing 3**.

The pipeline already works. **Do not migrate stacks, do not change architecture.**
Your job is purely **visual polish**: tune materials, lighting, colors, motion,
hotspot panel layout, attractor screen.

## Files in scope (READ FIRST, then EDIT)

Primary:
- `components/ProductViewer.tsx` — R3F canvas + Scene + lights + hotspots
- `components/HotspotPanel.tsx` — side panel that opens when a hotspot is tapped
- `components/HotspotPin.tsx` — the 3D dot itself (pre-translated `ariaLabel` prop)
- `components/AttractorOverlay.tsx` — pre-interaction "tap to explore" splash
- `components/LanguagePicker.tsx` — IT/EN/SV switcher
- `app/globals.css` — design tokens + body gradient + grain + vignette
- `tailwind.config.ts` — color palette (copper, cream, canvas)
- `data/product.json` — copy / specs / hero strings
- `messages/{it,en,sv}.json` — i18n strings

Read-only references:
- `docs/02-ui-design-system.md` — brand bible (Cormorant + Inter + JetBrains Mono;
  copper #B87333 on bg #0A0A0A; copper allowed only as accent, NEVER as fill)
- `data/hotspots.json` — 8 hotspots positioned in 3D space (DO NOT EDIT)

## Hard constraints — DO NOT BREAK

1. **Do NOT touch the camera config, dpr, gl options, or post-FX values in `ProductViewer.tsx`** — those are tuned for kiosk hardware. Only tweak lighting (`<Lights>` component, line ~196) and material patching (`fixMat` inside `ProductModel`, line ~91).
2. **Do NOT call `useTranslations` inside any component rendered by drei's `<Html>`** (HotspotPin and any future hotspot UI). React Context does not propagate through `<Html>` because it uses `createRoot()`. Translations must happen in the parent and propagate via plain string props. (See `Workflows/🧊 Web 3D Product Viewer Pipeline.md` "Gotcha — Html di drei rompe React Context" for details.)
3. **Keep the AgX tone-mapping** (`THREE.AgXToneMapping`). Don't switch to ACES/neutral/commerce.
4. **Keep i18n IT/EN/SV in sync** — any new copy added in one locale must be added in all three with culturally appropriate translation.
5. **Performance budget**: this runs on a kiosk with potentially integrated GPU. Don't add more than 1 new EffectComposer pass. Don't add particles/instanced geometry > 200 instances.
6. **No new dependencies** — work within: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `framer-motion` (not installed, do not add), `gsap` (installed, use it), `tailwindcss`, `zustand`, `next-intl`. If you need an animation lib, use the already-installed `gsap` + `@gsap/react`.

## Aesthetic goals — in priority order

1. **Material richness on the espresso machine**: tune `envMapIntensity` per-material if the GLB has multiple materials (`fixMat` callback). Chrome should read brighter, rame/copper should read warmer. If the GLB is single-material, push the model's overall PBR via `material.envMapIntensity` global tuning.

2. **Lighting balance**: the current `<Lights>` has 3 sources (front fill, rim back, hemisphere bounce). Re-balance for a more cinematic product-photography look. Aim for ~70% contribution from HDR environment, ~30% from local lights. Lights are subtle accents, not key.

3. **Hotspot panel polish** (`HotspotPanel.tsx`): the side panel that opens on tap. Make sure it has:
   - smooth slide-in animation (use gsap with `easeOut`, ~400ms)
   - clear close affordance (large X button, top-right of panel)
   - hierarchy: title (Cormorant 32px), one-liner (Inter 18px), bullet points or short paragraphs (Inter 16px, copper accent line separators)
   - locked max-width ~480px so it doesn't dominate the canvas
   - close button must have aria-label translated in IT/EN/SV (add `panel.close` to messages if missing)

4. **AttractorOverlay polish**: the splash that says "Tocca per esplorare". Should:
   - have a subtle slow breathing animation (scale 0.99 → 1.01, 4s loop, easeInOut sine)
   - product name in Cormorant 64-80px, all caps with `letter-spacing: 0.05em`
   - subtle copper underline animation (8 px tall, expanding 0 → 240px on mount)
   - fade out quickly (200 ms) on first tap, never come back until idle reset

5. **LanguagePicker**: small floating disc top-right with current locale's 2-letter code in copper. On tap: expands inline (not modal) showing other locales. Hover/focus: copper ring pulse. Active locale has subtle copper underline.

6. **Hotspot pin micro-motion**: when the hotspot is in `visited` state (already opened), the outer pulse ring should slow down and dim. When `isActive`, the inner core should gently scale-pulse (scale 1 → 1.15 → 1, 1.2s loop, easeInOut).

## How to deliver

- Edit the files directly.
- Run `npm run build` after your changes to verify TypeScript and Next.js build succeed.
- Do NOT run `npm run dev` or start a server (you'd conflict with the user).
- When done, write a short `docs/aesthetic-pass-summary.md` explaining:
  - what you changed file-by-file
  - which trade-offs you made and why
  - what you intentionally left untouched and why
  - performance impact estimate

## Style of work

- Read all files in scope before making any edits.
- Make small, justified edits. Each edit should map to one of the 6 aesthetic goals above.
- If you discover an existing bug while reading, fix it inline and note it in the summary.
- Comments only where the *why* is non-obvious. Don't comment what the code does.
- Match existing code style (function components, TypeScript, no semicolons-style if absent, etc.).
