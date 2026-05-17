"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  CircleDot,
  Coffee,
  Cog,
  CupSoda,
  Droplet,
  Flame,
  Gauge,
  Monitor,
  Thermometer,
  Waves,
  Wind,
  X,
  type LucideProps,
} from "lucide-react";
import { useTotemStore } from "@/lib/store";
import hotspotsData from "@/data/hotspots.json";

type HotspotEntry = {
  id: string;
  i18nKey: string;
  icon: string;
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
  waves: Waves,
};

const HOTSPOTS = hotspotsData.hotspots as HotspotEntry[];

/**
 * Luxury glass popup pinned to the right side of the canvas, just left of
 * the HotspotSidebar rail. Replaces the prior full-height slide-out drawer.
 * The popup width (clamp 360–440 px) keeps the 3D model unobstructed even
 * on tablet-portrait kiosks.
 */
export function HotspotPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const phase = useTotemStore((s) => s.phase);
  const activeHotspotId = useTotemStore((s) => s.activeHotspotId);
  const closeHotspot = useTotemStore((s) => s.closeHotspot);

  const visible = phase === "detail" && activeHotspotId !== null;
  const cardRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Single polite, screen-reader-only live region. It is the sole consumer
  // of the `a11y.panelOpen` / `a11y.panelClose` / `a11y.languageChanged`
  // keys (was dead code — defined but never announced). Mounted
  // unconditionally so it survives the `if (!visible) return null` below;
  // the visual <aside> stays conditional.
  const [announcement, setAnnouncement] = useState("");

  // Panel open/close — driven by the same Zustand-derived `visible` flag
  // the rest of the component uses. The initial closed state is skipped so
  // a "closed" message isn't announced on first mount.
  const announcedRef = useRef(false);
  useEffect(() => {
    if (!announcedRef.current) {
      announcedRef.current = true;
      if (!visible) return;
    }
    setAnnouncement(visible ? t("a11y.panelOpen") : t("a11y.panelClose"));
  }, [visible, t]);

  // Language changed — `useLocale()` flips on the next-intl /it↔/en↔/sv
  // route transition. Skip the first render so the active locale isn't
  // announced on load.
  const prevLocaleRef = useRef(locale);
  useEffect(() => {
    if (prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;
    setAnnouncement(t("a11y.languageChanged"));
  }, [locale, t]);

  // TODO(a11y): `a11y.modelLoaded` has no reachable trigger from this
  // component — the GLB ready state is local to ProductViewer.tsx
  // (`modelReady`) and is not lifted into lib/store. Wiring it would
  // require exposing that state via the store (out of scope here).

  useGSAP(
    () => {
      if (!cardRef.current) return;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.fromTo(
        cardRef.current,
        {
          opacity: visible ? 0 : 1,
          xPercent: visible ? 8 : 0,
          scale: visible ? 0.97 : 1,
          filter: visible ? "blur(8px)" : "blur(0px)",
        },
        {
          opacity: visible ? 1 : 0,
          xPercent: visible ? 0 : 4,
          scale: visible ? 1 : 0.98,
          filter: "blur(0px)",
          duration: reduce ? 0 : visible ? 0.55 : 0.3,
          ease: visible ? "power3.out" : "power2.in",
        },
      );
    },
    { dependencies: [visible] },
  );

  // Leader line: read the active part's projected viewport point (published
  // each frame by <HotspotScreenProjector> in the Canvas) and the card's
  // own rect via rAF, so the line connects the card to the actual tool.
  // Only runs while the panel is open; updates state only on real movement
  // (camera is static in detail, so it settles in a few frames). No Canvas
  // re-render — the projector uses a window global, not React state.
  const [link, setLink] = useState<{
    cx: number;
    cy: number;
    px: number;
    py: number;
  } | null>(null);
  useEffect(() => {
    if (!visible) {
      // Defer the clear out of the synchronous effect body (rAF, the
      // codebase's deferral idiom) so it doesn't trip
      // react-hooks/set-state-in-effect / cascade a render.
      const id = requestAnimationFrame(() => setLink(null));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    let prev = "";
    const tick = () => {
      const s = typeof window !== "undefined" ? window.__aureliaHotspotScreen : null;
      const card = cardRef.current?.getBoundingClientRect();
      if (s && s.on && card) {
        const cx = card.right;
        const cy = card.top + card.height / 2;
        const px = s.x;
        const py = s.y;
        const key = `${cx | 0},${cy | 0},${px | 0},${py | 0}`;
        if (key !== prev) {
          prev = key;
          setLink({ cx, cy, px, py });
        }
      } else if (prev !== "") {
        prev = "";
        setLink(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // Focus trap + Esc handled in HotspotSidebar (Esc only). Tab cycle inside.
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible]);

  // Always-mounted sr-only polite live region.
  const liveRegion = (
    <div aria-live="polite" role="status" className="sr-only">
      {announcement}
    </div>
  );

  if (!visible) return liveRegion;

  const hotspot = HOTSPOTS.find((h) => h.id === activeHotspotId);
  if (!hotspot) return liveRegion;

  const Icon = ICON_MAP[hotspot.icon] ?? CircleDot;
  const titleKey = `${hotspot.i18nKey}.title`;
  const descKey = `${hotspot.i18nKey}.description`;
  const specsRaw = t.raw(`${hotspot.i18nKey}.specs`);
  const specEntries: Array<[string, string]> =
    specsRaw && typeof specsRaw === "object"
      ? Object.entries(specsRaw as Record<string, string>)
      : [];

  return (
    <>
      {liveRegion}
      {/* Leader line: card → the actual tool on the model. Viewport-pixel
       *  coords (1:1, no viewBox). Behind the card in DOM so the card glass
       *  overpaints the stub; the visible run over the canvas indicates the
       *  part. pointer-events-none so it never blocks the model or rail. */}
      {link && (
        <svg
          aria-hidden
          className="pointer-events-none fixed inset-0 z-panel"
          style={{ width: "100vw", height: "100vh" }}
        >
          <line
            x1={link.cx}
            y1={link.cy}
            x2={link.px}
            y2={link.py}
            className="text-accent"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeLinecap="round"
          />
          <circle cx={link.cx} cy={link.cy} r={2.5} className="fill-accent" fillOpacity={0.7} />
          <circle cx={link.px} cy={link.py} r={3.5} className="fill-accent" />
          <circle
            cx={link.px}
            cy={link.py}
            r={8}
            fill="none"
            className="stroke-accent"
            strokeWidth={1}
            strokeOpacity={0.45}
          />
        </svg>
      )}
      <aside
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="hotspot-panel-title"
        // touch-none: the panel is a fixed pointer-events-auto surface
        // overlaying the canvas edge; without it a horizontal drag that
        // starts on the card can be consumed as an accidental edge-swipe
        // gesture instead of being a no-op.
        // Docked LEFT (was `right-44`, which crowded the right HotspotSidebar
        // icon rail). The leader line below connects this card to the part;
        // the width reserve keeps it clear of the model + rail on portrait.
        className="pointer-events-auto fixed left-6 top-1/2 z-panel w-[min(420px,calc(100vw-13rem))] -translate-y-1/2 touch-none overflow-hidden rounded-3xl border border-copper-500/20 bg-canvas/55 shadow-deep backdrop-blur-3xl"
      >
      {/* Top copper hairline */}
      <span
        aria-hidden
        className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
      />

      <div className="flex items-start gap-5 px-7 pb-3 pt-7">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-copper-500/35 bg-gradient-to-br from-copper-500/20 to-copper-700/5">
          <Icon size={22} strokeWidth={1.4} className="text-accent" aria-hidden />
        </span>
        <div className="flex-1 space-y-1.5 pt-0.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-copper-300/75">
            0{hotspot.order} · {t("ui.feature")}
          </p>
          <h2
            id="hotspot-panel-title"
            className="font-display text-[clamp(22px,2.4vw,28px)] font-semibold leading-tight text-cream-100"
          >
            {t(titleKey)}
          </h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeHotspot}
          aria-label={t("ui.panel.close")}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-copper-500/25 text-cream-300 transition-colors hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent"
        >
          <X size={16} strokeWidth={1.6} />
        </button>
      </div>

      <p className="font-body px-7 text-[14px] leading-relaxed text-cream-200/90">
        {t(descKey)}
      </p>

      {specEntries.length > 0 && (
        <>
          <div
            className="mx-7 mt-5 h-px bg-gradient-to-r from-transparent via-copper-500/30 to-transparent"
            aria-hidden
          />
          <dl className="grid grid-cols-1 gap-2.5 px-7 py-5">
            {specEntries.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4"
              >
                <dt className="font-body text-[11px] uppercase tracking-[0.12em] text-cream-400/80">
                  {label}
                </dt>
                <dd className="font-mono text-[13px] text-cream-100 tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

        {/* Bottom copper hairline */}
        <span
          aria-hidden
          className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        />
      </aside>
    </>
  );
}
