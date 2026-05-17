# Design System — AURELIA Pro X1 Totem

> **Consolidated, not invented.** This file is the single source of truth
> entry point. It captures the **locked** design system already decided in
> `docs/00-brief.md` §2–3 (locked 2026-04-26) and fully specified in
> `docs/02-ui-design-system.md` (the deep reference — read it for the
> 11-step scales, component specs, ASCII renders, z-index map). Do not
> deviate without explicit approval from Lorenzo.

## Product Context
- **What this is:** Interactive trade-fair totem for the AURELIA Pro X1 — a prosumer dual-boiler espresso machine. Single rotatable/zoomable 3D model + 8 hotspots + idle attractor.
- **Who it's for:** B2B+B2C fair visitors, 15–45 s dwell, reading at ~1.2 m, touch (iPad Pro 12.9" portrait primary; Windows touch kiosk / Edge fallback).
- **Space/industry:** Premium Italian espresso hardware (peers cited: La Marzocco, Aesop, Berluti, Acne Studios — for *intent*, not pixel copy).
- **Project type:** Single-screen kiosk web app (Next.js 16 + React 19 + R3F). Dark-only. No scroll.

## Aesthetic Direction
- **Direction:** Quiet museum / Italian atelier — "lusso quieto." The material speaks; no shouting, no dramatic gradients, no winking CTAs.
- **Decoration level:** Intentional. One texture only: a global 6% noise overlay (`body::before`) for warmth. No glassmorphism on main panels (backdrop-blur only where functional, e.g. picker over a moving model).
- **Mood:** A Lombard workshop vitrine translated to a digital surface — copper looks hand-burnished; dark is the gallery wall, not a "dark-mode toggle."
- **Memorable thing:** "The copper was burnished by a hand." Every decision serves restraint + tangible materiality.

## Typography
- **Display/Hero:** Cormorant Garamond 700 (also 600) — historical weight, diagonal stress, calligraphic terminals. Used ≥28 px only; negative tracking (−0.015 to −0.020em) for the "engraved" editorial effect.
- **Body / UI / Labels:** Inter 400/500/600 — utility: numbers, micro-labels, buttons. Micro/UI is 14 px UPPERCASE, `letter-spacing 0.10em`.
- **Data/Tables:** JetBrains Mono 500, `font-feature-settings: 'tnum' 1, 'zero' 1` (tabular numerals, right-aligned spec values).
- **Tagline:** Cormorant Garamond 600 *italic* ("Il caffè, scolpito.") — always italic, manuscript register.
- **CSS families:** `--font-display: 'Cormorant Garamond', Georgia, serif` · `--font-body: 'Inter', system-ui, sans-serif` · `--font-mono: 'JetBrains Mono', Consolas, monospace`.
- **Scale (1.2 m → min 18 px body):** Hero `clamp(4rem,3rem+4vw,6rem)`/700 · H1 `clamp(3rem,2rem+3vw,4rem)`/700 · H2 28–32/600 · Body 18 (fixed 1.125rem)/400 lh1.6 · Spec mono 16/500 · Micro 14/500 uppercase. Full table: `docs/02-ui-design-system.md` §C.

## Color
- **Approach:** Restrained. Near-black is the canvas; copper is scenography spent with avarice; cream does all the text work. All neutrals are **warm-tinted** (toward brown, never blue).
- **Canvas / surfaces:** `bg-canvas #0A0A0A` (neutral-950) · `bg-surface #1A1714` (neutral-800) · `bg-elevated #2A2622` (neutral-700, panels/picker).
- **Text:** `text-primary #F5F1E8` (cream-100) · `text-secondary #D2CAB5` (cream-300) · `text-muted #B5AC95` (cream-400).
- **Accent (copper):** `accent #B87333` (copper-500) · `accent-pressed #9D6128` (copper-600) · `accent-soft rgba(184,115,51,0.30)` (borders/rings) · `accent-glow rgba(184,115,51,0.15)`.
- **LOCKED rule:** copper `#B87333` is **never** `color:` on text (3.62:1 on canvas — fails AAA). Only `background`, `border-color`, `fill` (icon stroke), `box-shadow`. **Max 1 copper-active element per screen** (guardrail G3).
- **Contrast:** cream-100 on canvas = **18.13:1** (AAA). Full WCAG table + 11-step neutral/copper/cream scales (with OKLCH): `docs/02-ui-design-system.md` §B. Dark-only — no light mode.
- **Semantic:** the totem has no success/warning/error UI (no forms/commerce in MVP). If added later, derive from the warm scales — never default Tailwind palette (guardrail G6).

## Spacing
- **Base unit:** 4 px. Density: comfortable-to-spacious (atelier breathing).
- **Scale:** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 80 · 120. Micro adjustments (14/18/22/28) exist for specific fine-tuning only — never speculative.
- **Touch targets (LOCKED):** min **56×56 px** (iPad at 1.2 m). Pin 56×56 (12 px visual fill), close-X 56×56, lang trigger 96×56, lang option 280×80.
- **Safe areas:** portrait 32/32/24/24 (T/B/L/R), landscape 32/32/48/48. Full-bleed totem, no max-width.

## Layout
- **Approach:** Creative-editorial + asymmetric — pins placed at real 3D positions on the model, never a uniform card grid (guardrail G7). One dominant panel at a time; never two modals simultaneously.
- **Border radius (LOCKED):** `none 0` · `sharp 2` · `soft 4` (picker option) · `panel 8` (DetailPanel, dropdown) · `pin/pill 999` (circle only). **No radius > 8 px on panels** (guardrail G1).
- **Elevation:** depth via real 3-plane layering (canvas → chrome → modal), never shadow stacking. 4 shadow tokens only: `shadow-deep`, `shadow-copper-soft`, `shadow-copper-tight`, `shadow-rim`. Material drop-shadow defaults BANNED (G4). Z-index map: `docs/02-ui-design-system.md` §J.

## Motion
- **Approach:** Intentional, never decorative. Animation only where it reveals hierarchy, gives haptic feedback, or introduces the product. No parallax, no scroll-trigger, no hover wiggle (guardrail G10).
- **Easing:** `ease-quiet cubic-bezier(0.16,1,0.3,1)` (default everything) · `ease-quiet-in cubic-bezier(0.7,0,0.84,0)` (exits) · `linear` (infinite loops only). **BANNED:** `ease-material`, browser `ease`/`ease-in-out` (the Material snap breaks the "quiet museum" vibe).
- **Durations:** micro 150 · fast 250 · normal 400 · slow 700 · ambient 1200 · loop 2400 ms.
- **Reduced motion:** full fallback map in `docs/02-ui-design-system.md` §E.4 (attractor → static Scene A, pins → no pulse, panels → fade-only). Enforced via CSS guard + GSAP `matchMedia()`. This was a FASE-7 BLOCKER fix — keep it; there is a Playwright regression test (`tests/e2e/reduced-motion.spec.ts`).

## Anti-Template Guardrails (CRITICAL — see §G of the spec)
G1 no radius >8px on panels · G2 no generic gradients · G3 copper sparing (max 1/screen) · G4 no Material shadows · G5 no emoji icons (Lucide 1.5px / custom SVG) · G6 no default Tailwind palette colors · G7 no uniform card grids · G8 layered depth not shadow-stack · G9 single 6% noise overlay (don't stack with blur/gradient) · G10 no gratuitous motion. These are compliance-checked; QA must flag violations.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-26 | Brand + design system **locked** (`docs/00-brief.md` §2–3) | Source of truth for all downstream deliverables |
| 2026-04-26 | Full UI system specified (`docs/02-ui-design-system.md` v1) | Colors, type, spacing, motion, components, guardrails |
| 2026-05-1x | 3D layer migrated `@google/model-viewer` → React Three Fiber (procedural model, `lib/espressoMachine.ts`) | Real AA / env / post-FX for the €6–10k tier. **Visual system (this doc) is implementation-agnostic and unchanged** — only the 3D rendering tech differs from the spec's model-viewer mentions. |
| 2026-05-17 | DESIGN.md created — consolidation of the locked system (no redesign) | `/design-consultation` (option: consolidate existing). App was production-ready / mid-Vercel-deploy; goal = single source of truth + CLAUDE.md guardrail, not a new direction |

---

*Consolidated 2026-05-17 by /design-consultation. Authoritative depth:
`docs/02-ui-design-system.md`. Brand lock: `docs/00-brief.md`.*
