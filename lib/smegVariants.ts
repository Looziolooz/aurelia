/**
 * Smeg-inspired colour + finish variants for the AURELIA totem.
 *
 * Pure data — NO three.js import — so UI components can read the swatch
 * palette without pulling the WebGL builder into the client bundle.
 * `lib/espressoMachine.ts` maps these ids to live material params;
 * `lib/store.ts` holds the selected ids.
 *
 * Hex values are screen-tuned approximations of the Smeg RAL/Pantone
 * listino. RAL is a *paint* standard: under the totem's HDR environment +
 * bloom + tone-mapping a literal RAL→sRGB conversion reads wrong. Tune
 * here — a single source of truth keeps the UI swatch == rendered body.
 * Visual QA on the kiosk panel is still required (.next/browser cache can
 * hide changes — hard-refresh when verifying).
 */

export type SmegColorId = "nero" | "rosso" | "verde" | "azzurro";

export interface SmegColor {
  id: SmegColorId;
  /** i18n message key under the `colors` namespace. */
  labelKey: SmegColorId;
  /** sRGB hex — used for BOTH the UI swatch and the live body albedo. */
  hex: string;
  /** RAL / Pantone provenance, for docs + design QA. */
  ref: string;
}

export const SMEG_COLORS: readonly SmegColor[] = [
  { id: "nero", labelKey: "nero", hex: "#101011", ref: "RAL 9005" },
  { id: "verde", labelKey: "verde", hex: "#5E8A6E", ref: "RAL 6019 (darkened) / Pantone 573 C" },
  { id: "azzurro", labelKey: "azzurro", hex: "#7E9EAC", ref: "RAL 5024 (darkened) / Pantone 2915 C" },
  { id: "rosso", labelKey: "rosso", hex: "#C1271B", ref: "RAL 3000 / Pantone 186 C" },
] as const;

export const DEFAULT_COLOR: SmegColorId = "nero";

// Finish is glossy-only by product decision (2026-05-17): the enamel
// "smaltato" look is the whole point. There is NO user-facing matte. The
// weak-kiosk-iGPU white-screen guardrail still exists, but as an internal
// one-way in-place degrade of the glossy material on `webglcontextlost`
// (clearcoat dropped) — see applyEmergencyDegrade() in espressoMachine.ts
// and project memory "smeg-color-switcher-gpu-guardrail".

export function getSmegColor(id: SmegColorId): SmegColor {
  return SMEG_COLORS.find((c) => c.id === id) ?? SMEG_COLORS[0];
}
