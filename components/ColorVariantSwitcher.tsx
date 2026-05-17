"use client";

/**
 * Smeg colour rail — the left mirror of HotspotSidebar.
 *
 * Glossy enamel only (product decision 2026-05-17: no finish toggle, no
 * matte option). Hidden during the attractor — it must NOT overlay the
 * opening; it appears only after the first interaction promotes the totem
 * to active/detail, same gating as HotspotSidebar. (The MODEL is still
 * painted in the chosen colour from frame 0 — that sync happens in the
 * ProductViewer build, not here.) The visual idiom deliberately matches
 * HotspotSidebar (the project's existing right-edge rail) so the two
 * sides read as one system.
 */

import { useTranslations } from "next-intl";
import { SMEG_COLORS } from "@/lib/smegVariants";
import { useTotemStore } from "@/lib/store";

export function ColorVariantSwitcher() {
  const tColors = useTranslations("colors");
  const tSwitcher = useTranslations("colorSwitcher");

  const phase = useTotemStore((s) => s.phase);
  const colorVariant = useTotemStore((s) => s.colorVariant);
  const setColorVariant = useTotemStore((s) => s.setColorVariant);

  // Must not overlay the opening: hidden until the first click promotes
  // the totem out of the attractor (mirrors HotspotSidebar).
  if (phase === "attractor") return null;

  return (
    <nav
      aria-label={tSwitcher("label")}
      className="pointer-events-auto fixed left-8 top-1/2 z-chrome -translate-y-1/2"
    >
      {/* Micro-stamped header — mirrors HotspotSidebar's, left-aligned */}
      <p className="mb-3 pl-1 text-left font-mono text-[9px] uppercase tracking-[0.3em] text-copper-300/55">
        {tSwitcher("label")}
      </p>
      <ul className="flex flex-col gap-1.5 rounded-2xl border border-copper-500/15 bg-canvas/40 p-2.5 shadow-deep backdrop-blur-2xl">
        {SMEG_COLORS.map((c) => {
          const isActive = c.id === colorVariant;
          const name = tColors(c.labelKey);
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-label={name}
                aria-pressed={isActive}
                onClick={() => setColorVariant(c.id)}
                className={`group relative flex h-[64px] w-[176px] items-center gap-3 rounded-xl px-3 transition-all duration-300 ease-out outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                  isActive
                    ? "bg-gradient-to-br from-copper-500/35 to-copper-700/10 shadow-copper-tight"
                    : "hover:bg-cream-100/[0.04]"
                }`}
              >
                {/* Active indicator — right edge (mirror of the rail's left bar) */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 top-1/2 h-9 w-[2px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_3px_rgba(184,115,51,0.55)]"
                  />
                )}
                {/* Colour swatch — 44px touch target for the kiosk */}
                <span
                  aria-hidden
                  style={{ backgroundColor: c.hex }}
                  className={`h-11 w-11 shrink-0 rounded-full border transition-transform duration-200 group-hover:scale-105 ${
                    isActive
                      ? "border-2 border-[var(--accent)]"
                      : "border-[var(--border-subtle)]"
                  }`}
                />
                <span
                  className={`min-w-0 flex-1 truncate text-left font-body text-[12px] uppercase tracking-[0.12em] transition-colors duration-200 ${
                    isActive
                      ? "text-cream-100"
                      : "text-cream-300/60 group-hover:text-cream-100"
                  }`}
                >
                  {name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
