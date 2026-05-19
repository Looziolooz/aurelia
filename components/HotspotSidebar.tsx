"use client";

/**
 * Luxury showroom-style hotspot navigator.
 *
 * A vertical rail of icons on the right edge. Each entry is a feature of
 * the AURELIA Pro X1. Clicking one promotes that feature to "active":
 *   1. The 3D camera flies to a feature-specific viewpoint defined in
 *      data/hotspots.json (camera_target + camera_position).
 *   2. A glass popup opens with the localised title, description, and
 *      spec sheet — rendered by HotspotPanel.
 *
 * Replaces the prior in-scene <Html> pins. With the rail the experience
 * stays editorial: the model is never cluttered with markers, the user
 * always knows what to tap, and the fly-to does the framing instead of
 * forcing the user to orbit.
 */

import { useEffect, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import {
  Coffee,
  CircleDot,
  Cog,
  CupSoda,
  Droplet,
  Flame,
  Gauge,
  Monitor,
  Thermometer,
  Wind,
  type LucideProps,
} from "lucide-react";
import { useTotemStore } from "@/lib/store";
import hotspotsData from "@/data/hotspots.json";

type HotspotEntry = {
  id: string;
  icon: string;
  i18nKey: string;
  order: number;
};

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  monitor: Monitor,
  gauge: Gauge,
  "circle-dot": CircleDot,
  coffee: Coffee,
  wind: Wind,
  cups: Flame,
  cup: CupSoda,
  cog: Cog,
  droplet: Droplet,
  flame: Flame,
  thermometer: Thermometer,
};

const HOTSPOTS = (hotspotsData.hotspots as HotspotEntry[])
  .slice()
  .sort((a, b) => a.order - b.order);

export function HotspotSidebar() {
  const t = useTranslations();
  const phase = useTotemStore((s) => s.phase);
  const activeHotspotId = useTotemStore((s) => s.activeHotspotId);
  const visitedHotspots = useTotemStore((s) => s.visitedHotspots);
  const openHotspot = useTotemStore((s) => s.openHotspot);
  const closeHotspot = useTotemStore((s) => s.closeHotspot);

  // Esc closes any open detail.
  useEffect(() => {
    if (phase !== "detail") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHotspot();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, closeHotspot]);

  return (
    <nav
      aria-label={t("ui.features")}
      className="pointer-events-auto fixed right-8 top-1/2 z-chrome -translate-y-1/2"
    >
      {/* Header micro-stampigliato sopra la lista */}
      <p className="mb-3 pr-1 text-right font-mono text-[9px] uppercase tracking-[0.3em] text-copper-200/85">
        {t("ui.features")}
      </p>
      <ul className="flex flex-col gap-1.5 rounded-2xl border border-copper-500/30 bg-canvas/65 p-2.5 shadow-deep backdrop-blur-2xl">
        {HOTSPOTS.map((h) => {
          const Icon = ICON_MAP[h.icon] ?? CircleDot;
          const isActive = activeHotspotId === h.id;
          const isVisited = visitedHotspots.has(h.id);
          const title = t(`${h.i18nKey}.title`);
          return (
            <li key={h.id}>
              <button
                type="button"
                aria-label={title}
                aria-pressed={isActive}
                onClick={() => {
                  if (isActive) closeHotspot();
                  else openHotspot(h.id);
                }}
                className={`group relative flex h-[76px] w-[100px] items-center justify-center rounded-xl px-3 transition-all duration-300 ease-out outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                  isActive
                    ? "bg-gradient-to-br from-copper-500/35 to-copper-700/10 shadow-copper-tight"
                    : "hover:bg-cream-100/[0.04]"
                }`}
              >
                {/* Indicatore copper attivo */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -left-2.5 top-1/2 h-9 w-[2px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_3px_rgba(184,115,51,0.55)]"
                  />
                )}
                {/* Icona + ordinale */}
                <div className="relative grid h-12 w-12 shrink-0 place-items-center">
                  <Icon
                    size={26}
                    strokeWidth={1.4}
                    aria-hidden
                    className={`transition-colors duration-200 ${
                      isActive
                        ? "text-cream-100"
                        : isVisited
                          ? "text-cream-200/95 group-hover:text-cream-100"
                          : "text-copper-200/95 group-hover:text-copper-100"
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`absolute -bottom-0.5 right-0 font-mono text-[8px] tracking-widest ${
                      isActive ? "text-copper-200" : "text-cream-300/75"
                    }`}
                  >
                    0{h.order}
                  </span>
                </div>
                {/* Label rimossa su richiesta ("togli le iniziali"): la rail
                 *  ora è solo icona + ordinale. Il nome resta come
                 *  aria-label sul <button> → nessuna regressione screen
                 *  reader / AAA (DESIGN.md). Icona centrata nel footprint
                 *  esistente (rail non ridimensionata). */}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
