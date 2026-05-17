"use client";

import { useTotemStore } from "@/lib/store";

type HotspotPinProps = {
  id: string;
  /** Pre-translated aria-label. Computed by the parent because <HotspotPin>
   * is rendered inside Drei's <Html>, which uses createRoot() and therefore
   * does NOT inherit React Context from the outer tree (no
   * NextIntlClientProvider visible here, no useTranslations). */
  ariaLabel: string;
};

/**
 * Premium hotspot pin: three concentric layers.
 *   1. Inner core (8 px solid copper) — the actual "point of interest".
 *   2. Mid ring (24 px copper-rim glass disc) — touch surface, subtle.
 *   3. Outer pulse (48 px) — gentle attractor, fades when visited.
 *
 * Touch target stays >= 44 mm (the button is 48 px / ~12.7 mm at 96 dpi,
 * but the expanded ::before grows the hit area to ~64 px via padding).
 * On a totem screen the visual feels precise without overwhelming the
 * machine itself.
 *
 * NOTE: zustand stores DO survive across createRoot boundaries because they
 * use module-level singletons, not React Context. That's why useTotemStore
 * still works here while useTranslations does not.
 */
export function HotspotPin({ id, ariaLabel }: HotspotPinProps) {
  const visited = useTotemStore((s) => s.visitedHotspots.has(id));
  const isActive = useTotemStore((s) => s.activeHotspotId === id);
  const openHotspot = useTotemStore((s) => s.openHotspot);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={(e) => {
        e.stopPropagation();
        openHotspot(id);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="group relative grid h-12 w-12 place-items-center"
      style={{
        // Padding-only hit-area expansion so the visual stays small but
        // the touchable region matches kiosk ergonomics.
        padding: 8,
        margin: -8,
      }}
    >
      {/* Outer attractor pulse — slows and dims when visited. */}
      {!isActive && (
        <span
          aria-hidden
          className={`absolute inset-1 rounded-full ${
            visited
              ? "motion-safe:animate-attractor-pulse-slow border border-copper-500/20"
              : "motion-safe:animate-attractor-pulse border border-copper-500/45 bg-copper-500/[0.04]"
          }`}
        />
      )}

      {/* Mid ring — frosted glass disc with copper hairline */}
      <span
        aria-hidden
        className={`relative grid h-6 w-6 place-items-center rounded-full border backdrop-blur-md transition-all duration-200 ease-quiet ${
          isActive
            ? "scale-110 border-cream-100 bg-cream-100/15 shadow-copper-soft"
            : visited
              ? "border-copper-500/35 bg-canvas/40 group-hover:border-copper-400/60"
              : "border-copper-500/65 bg-canvas/45 group-hover:border-copper-300 group-hover:bg-canvas/60"
        }`}
      >
        {/* Inner core — gentle scale-pulse when active */}
        <span
          aria-hidden
          className={`block h-2 w-2 rounded-full transition-colors duration-200 ${
            isActive
              ? "motion-safe:animate-core-pulse bg-cream-100 shadow-[0_0_8px_2px_rgba(245,241,232,0.6)]"
              : visited
                ? "bg-cream-300/55"
                : "bg-accent shadow-[0_0_6px_1px_rgba(184,115,51,0.55)]"
          }`}
        />
      </span>
    </button>
  );
}
