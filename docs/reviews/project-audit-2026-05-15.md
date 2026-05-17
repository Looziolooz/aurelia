# AURELIA Pro X1 — Project Audit Report

**Date:** 2026-05-15  
**Scope:** Full source code analysis (app/, components/, i18n/, lib/, data/, tests/, config)  
**Test results (last run):** `test-results/.last-run.json` reports **all passed** — but this is misleading (see §2).

---

## 1. CRITICAL: Test suite is BROKEN (false positives)

### 1.1 Tests reference `model-viewer` that no longer exists

The project migrated from `<model-viewer>` to React Three Fiber (`ProductViewer.tsx`), but 4 of 6 test files still query `model-viewer`:

| Test file | Lines that fail |
|---|---|
| `tests/e2e/hotspots.spec.ts:85-96` | `page.locator("model-viewer")`, `mv.cameraOrbit` |
| `tests/e2e/idle-reset.spec.ts:17,34,52` | `page.locator("model-viewer")`, `mv.autoRotate`, `mv.cameraOrbit` |
| `tests/e2e/memory-leak.spec.ts` | All heap tests — no hard dep on model-viewer but references old IDs |
| `tests/e2e/visual-vs-references.spec.ts:38-62` | `page.locator("model-viewer")`, `mv.cameraOrbit` |

**Root cause:** Migration from `@google/model-viewer` → R3F was done in `ProductViewer.tsx` but tests were never updated. The test runner reports "passed" because `model-viewer` selectors resolve to `null`/empty, and assertions like `toBeTruthy()` on `undefined` return truthy for some edge cases, or the tests silently `skip` due to missing conditions.

**Fix:** Rewrite all 4 test files to target R3F Canvas instead of `<model-viewer>`. Camera orbit cannot be read via DOM — must use `useThree` camera inspection.

### 1.2 Hotspot tests reference wrong IDs and wrong titles

`tests/e2e/hotspots.spec.ts`:
- Queries `h1-boiler`, `h2-group` — but `data/hotspots.json` has `h1-display`, `h2-gauge`, `h3-buttons`, etc.
- Regex pattern for titles (`/Doppia caldaia|Gruppo E61|.../`) does NOT match actual hotspot titles from `messages/it.json` (e.g., `"Display TFT 3,5″"`, `"Manometro analogico premium"`).

**All 8×4 = 32 hotspot tests effectively test nothing** — selectors return empty, titles never match.

### 1.3 Accessibility contrast test inverted

`tests/e2e/accessibility.spec.ts:50-68`:
```js
const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
return l < 18; // high contrast (dark text on light)
```
The site uses **cream-100 (#F5F1E8) light text on #0A0A0A dark background**. The luminance of `#F5F1E8` is ~226 (light), so `l < 18` is **always false**. The logic is inverted — should check light text on dark bg.

### 1.4 i18n idle-reset test requires 61-second wait

`tests/e2e/i18n.spec.ts:46-54` — calls `page.waitForTimeout(61_000)` making this test take >1 minute. Combined with all other tests, total suite runtime is excessive.

---

## 2. GLOBAL CONFLICTS & DESTRUCTIVE MONKEY-PATCHES

### 2.1 `ProductViewer.tsx` — Global prototype mutation (CRITICAL)

The `initThreePatches()` IIFE at module level does:

| Patch | Risk |
|---|---|
| `JSON.stringify` replaced with circular-safe wrapper | Breaks any library/tool that relies on standard `JSON.stringify` behavior (e.g., `replacer` `this` context differs, `toJSON` return values may be discarded). |
| `console.warn` replaced | Filters THREE.Clock deprecation + Windows HLSL warnings. The `bind(console)` approach is fragile and the `overrideMethod` interop is speculative. Dev warnings from other libraries are silently swallowed. |
| `THREE.Object3D.prototype.toJSON` replaced | Breaks any legitimate Three.js serialization (exporters, save scenes, unit tests). |
| `THREE.Texture.prototype.toJSON` replaced | Same — breaks texture serialization. |
| `THREE.Material.prototype.toJSON` replaced | Same — breaks material serialization. |
| `EffectComposer.prototype.addPass` replaced | Deferral on context loss is a valid fix, but the implementation silently swallows errors (`try {} catch {}`). If the deferred `addPass` never executes, the postprocessing chain is silently broken. |

**Severity:** HIGH. These patches are executed once at module import and **never cleaned up**. They affect the entire page lifetime. In dev mode (React 19 StrictMode) the double-mount triggers the patches only once thanks to `__patched` guards, but the `console.warn` override and `JSON.stringify` replacement are permanent.

**Recommendation:** Remove all monkey-patches. Fix the root causes instead:
- `JSON.stringify` circulars → avoid passing Three.js objects as React props (already mostly done).
- `console.warn` → use `jest.spyOn` or test-level filtering.
- `EffectComposer.addPass` → use `onContextLost` / `onContextRestored` events on the Canvas.

### 2.2 `package.json` — Conflicting `ignoreScripts` / `trustedDependencies`

```json
"ignoreScripts": ["sharp", "unrs-resolver"],
"trustedDependencies": ["sharp", "unrs-resolver"]
```

These entries are **mutually exclusive**. `ignoreScripts` prevents install scripts from running; `trustedDependencies` explicitly allows them. Net effect: `sharp` install script behavior is **platform-dependent** (npm version, lockfile format). This is likely why `opencode-mem` plugin fails to load sharp (see bake log).

---

## 3. RUNTIME BUGS & RACE CONDITIONS

### 3.1 Model fallback URL race

`ProductViewer.tsx`:
```ts
const MODEL_URL_INITIAL = pickModelUrl(); // module level
```
`pickModelUrl()` defaults to `MODEL_V2`. Then a `useEffect` does a HEAD fetch to check if v2 exists and falls back to v1. But the Canvas has already mounted with v2 URL in the meantime — `useGLTF` will fire a 404 request and Suspense may throw.

**Fix:** Either (a) block rendering until the HEAD check resolves, or (b) use a static flag at build time.

### 3.2 Double `setEffectsReady` call

`ProductViewer.tsx`:
1. `useEffect` with 100ms timeout calls `setEffectsReady(true)`.
2. `onModelReady` callback also calls `setEffectsReady(true)`.

Both fire independently, causing an extra re-render and potential double `EffectComposer` mount.

### 3.3 `initThreePatches` never cleaned up

Since the IIFE runs at module level and patches globals permanently, if `ProductViewer` is ever unmounted (e.g., React StrictMode, route change), the globals stay mutated. No component unmount can restore original `JSON.stringify`, `console.warn`, etc.

### 3.4 `<LocaleHtmlLangSync>` uses `useEffect` to set `document.documentElement.lang`

This is unnecessary — `next-intl` already sets the `lang` attribute on `<html>` if configured in `layout.tsx`. This creates a redundant DOM write and potential hydration mismatch.

### 3.5 `IdleResetProvider` — Cleanup missing on phase change

When `phase` changes back to `"attractor"`, `IdleResetProvider` correctly clears the timer. But the event listeners (`pointerdown`, `pointermove`, etc.) are re-registered on every `phase` change via the `useEffect` dependency array. There's a window between cleanup and re-registration where no listener is active.

---

## 4. DATA INCONSISTENCIES

### 4.1 `product.json` price vs `messages/*.json` price

| Source | Price |
|---|---|
| `data/product.json` | € 2,890 |
| `messages/en.json` `product.price` | € 1,290 |
| `messages/it.json` `product.price` | € 1.290 |
| `messages/sv.json` `product.price` | € 1 290 |

**Three different prices** across the data files. Product data says €2,890, all message files say €1,290. Also inconsistent formatting (comma, dot, space).

### 4.2 `product.json` materials vs hotspot descriptions

`product.json` says `body_finish: "nero opaco"` (matte black), but hotspot descriptions reference "brushed anthracite steel + PVD bronze-black" and `ProductModel` material color `0x92, 0x83, 0x74` (warm bronze). Product metadata is outdated.

---

## 5. CONFIGURATION ISSUES

### 5.1 `.env` tracked in repo

`.env` appears at the project root and is not in `.gitignore` (no `.gitignore` found at project root). **This is a security risk** if the repo is shared or pushed.

### 5.2 `playwright.config.ts` uses `bun run dev`

But the project uses `npm` (has `package-lock.json`, not `bun.lock`). If `bun` is not installed on CI, `webServer` command fails.

### 5.3 Tailwind `content` path includes `./src/**/*.{ts,tsx}`

This directory does not exist — all source is in `./app/`, `./components/`, etc. The `src` glob will match nothing but adds unnecessary filesystem scanning on every rebuild.

### 5.4 `tsconfig.json` includes `.next/dev/types/**/*.ts`

This directory is generated by Next.js in dev mode but including it in the build `includes` may expose ephemeral types and cause inconsistent compilation.

---

## 6. CODE QUALITY ISSUES

### 6.1 Inconsistently named hotspot IDs

Test file uses `h1-boiler`, `h2-group`, but `hotspots.json` uses `h1-display`, `h2-gauge`, `h3-buttons`, `h4-group`, etc. Only `h4-group` partially overlaps.

### 6.2 Event listener cleanup in `AttractorOverlay.tsx`

```ts
document.addEventListener("pointerdown", onFirstTouch, { once: true, capture: true });
document.addEventListener("keydown", onFirstTouch);
```
The `pointerdown` listener uses `{ once: true, capture: true }`, but cleanup calls:
```ts
document.removeEventListener("pointerdown", onFirstTouch, true);
```
This works because `{ once: true }` auto-removes after first fire, and the cleanup matches the capture flag. However, the `keydown` listener does NOT use `{ once: true }` but checks `phase !== "attractor"` inside. If the attractor is dismissed via keyboard, the keydown listener stays registered until the phase changes.

### 6.3 `useCalibratorOverrides` hook re-renders on every frame

The `sync` callback in `useCalibratorOverrides` creates a new object via spread every time `aurelia:hotspot-override` fires. Since this is used in the R3F scene, it could trigger unnecessary re-renders of the 3D canvas.

### 6.4 Hotspot slot feature parity

`HotspotPanel.tsx` has `ICON_MAP` with `Waves` icon, but `HotspotSidebar.tsx` does NOT include `Waves` — it's missing. Also `HotspotPanel` has `waves: Waves` and `thermometer: Thermometer` but `HotspotSidebar` lacks both.

---

## 7. SUMMARY TABLE

| # | Issue | File | Severity |
|---|---|---|---|
| 1 | Tests reference dead `model-viewer` API | 4 test files | **CRITICAL** |
| 2 | Hotspot tests wrong IDs/titles | `tests/e2e/hotspots.spec.ts` | **HIGH** |
| 3 | Global monkey-patches (JSON.stringify, console.warn, prototypes) | `components/ProductViewer.tsx` | **HIGH** |
| 4 | `.env` tracked without `.gitignore` | root | **HIGH** |
| 5 | `ignoreScripts` conflicts with `trustedDependencies` | `package.json` | **MEDIUM** |
| 6 | Model URL race: Canvas mounts before HEAD check | `components/ProductViewer.tsx` | **MEDIUM** |
| 7 | Double `setEffectsReady` call | `components/ProductViewer.tsx` | **LOW** |
| 8 | Contrast accessibility test inverted | `tests/e2e/accessibility.spec.ts` | **MEDIUM** |
| 9 | Three different prices across data files | `data/product.json` vs messages | **MEDIUM** |
| 10 | `playwright.config.ts` uses `bun` not `npm` | `playwright.config.ts` | **MEDIUM** |
| 11 | `LocaleHtmlLangSync` redundant with next-intl | `components/LocaleHtmlLangSync.tsx` | **LOW** |
| 12 | Missing `src/` dir in Tailwind content glob | `tailwind.config.ts` | **LOW** |
| 13 | `ProductViewer` patch IIFE never cleaned up | `components/ProductViewer.tsx` | **MEDIUM** |
| 14 | Event listener leak in AttractorOverlay | `components/AttractorOverlay.tsx` | **LOW** |
| 15 | `Waves`/`Thermometer` icons missing in `HotspotSidebar` | `components/HotspotSidebar.tsx` | **LOW** |
| 16 | `opencode-mem` plugin fails (sharp not found) | `.opencode/logs/bake-run-*.log` | **MEDIUM** |
| 17 | i18n idle-reset test takes 61s | `tests/e2e/i18n.spec.ts` | **LOW** |

---

## 8. RECOMMENDATIONS (Priority Order)

1. **Fix all 4 test files** to target R3F Canvas instead of `model-viewer` — this is the single biggest issue. Without working tests, regressions go undetected.

2. **Remove global monkey-patches** from `ProductViewer.tsx` — replace with targeted fixes (configure Canvas `onCreated` for context loss, filter console in test config, avoid circular props).

3. **Add `.gitignore`** at project root and ensure `.env` is ignored.

4. **Fix `package.json`** — remove `ignoreScripts` for sharp or remove `trustedDependencies` for the same packages.

5. **Align pricing** between `data/product.json` and all `messages/*.json`.

6. **Fix model fallback** to block render until the availability HEAD check resolves.

7. **Update `playwright.config.ts`** to use `npm run dev` instead of `bun run dev`.

8. **Add `Waves` and `Thermometer` icons** to `HotspotSidebar.tsx` icon map for parity with `HotspotPanel.tsx`.
