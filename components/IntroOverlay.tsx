"use client";

/**
 * First-load onboarding (decision D5 — "language = the start").
 *
 * The problem it solves: the heavy 3D model takes seconds to appear on
 * the kiosk and the visitor saw only a copper loading dot — no signal to
 * act, no idea the screen is alive. This overlay:
 *
 *   1. T=0  — instantly fills the screen with the brand hero RENDERS
 *      (flat PNGs, zero GPU, no wait) slowly cross-fading: the screen is
 *      alive and unmistakably "an AURELIA presentation" from frame one.
 *   2. T=5s — a centred language card fades in. THIS is the clear,
 *      single action the visitor was missing.
 *   3. Pick a language → set the locale, then reveal the (by now loaded)
 *      interactive model. If the model is somehow not ready yet (slow
 *      kiosk GPU) we hold the elegant render backdrop until it is —
 *      never a bare loading dot.
 *
 * Architecture: deliberately NOT a new store phase. AttractorOverlay
 * keeps mounting under `phase==="attractor"` exactly as before (the
 * FASE-7 reduced-motion regression guard stays valid); this layer sits
 * above it (z 75, between attractor=70 and the global grain=80) and owns
 * interaction until `introDone`. On 60 s idle the store resets
 * `introDone=false` so the next fair visitor gets the full onboarding
 * again (model already built → instant reveal).
 *
 * Brand (DESIGN.md, LOCKED): copper only as keyline/border never as text
 * (G3); panel radius ≤ 8 px (G1); no extra noise layer (G9 — the global
 * 6 % body grain is the only one); no emoji (G5); the scrim is the same
 * functional legibility gradient AttractorOverlay already uses, not a
 * decorative gradient (G2). prefers-reduced-motion → one static render,
 * card shown immediately, zero animation.
 */

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useTotemStore } from "@/lib/store";

const LANG_DELAY_S = 5;

// Brand hero set (copied to /public/intro/). Order = a believable slow
// turn front → 3⁄4 → side → 3⁄4. The social-video package designates
// exactly these 4 as the hero renders (no _live_* scratch, no stale
// render_side).
const INTRO_RENDERS = [
  "/intro/render_front.png",
  "/intro/render_3q_right.png",
  "/intro/render_side_right.png",
  "/intro/render_3q_left.png",
] as const;

const LOCALE_NAME: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  sv: "Svenska",
};

export function IntroOverlay() {
  const phase = useTotemStore((s) => s.phase);
  const introDone = useTotemStore((s) => s.introDone);
  const modelReady = useTotemStore((s) => s.modelReady);
  const setIntroDone = useTotemStore((s) => s.setIntroDone);
  const enterActive = useTotemStore((s) => s.enterActive);

  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  // Locale the visitor picked, kept in a ref so the "waiting for the
  // model" path can finalise later without re-render churn.
  const chosenRef = useRef<Locale | null>(null);

  const [showCard, setShowCard] = useState(false);
  // True from the moment a language is tapped until the model is ready
  // and we fade out. Shows a calm "preparazione" line instead of the
  // card so the visitor knows their tap registered.
  const [starting, setStarting] = useState(false);

  const visible = phase === "attractor" && !introDone;

  // Card reveal timing + per-cycle reset, kept OUT of useGSAP so no
  // setState runs synchronously inside an effect (react-hooks/
  // set-state-in-effect — the lint rule we just got green). setState
  // here only ever fires from a timer or a rAF callback (async), which
  // the rule allows; the rAF-deferred reset mirrors HotspotPanel's
  // existing precedent in this codebase.
  useEffect(() => {
    if (!visible) {
      const r = requestAnimationFrame(() => {
        setShowCard(false);
        setStarting(false);
        chosenRef.current = null;
      });
      return () => cancelAnimationFrame(r);
    }
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const id = window.setTimeout(
      () => setShowCard(true),
      reduce ? 0 : LANG_DELAY_S * 1000,
    );
    return () => window.clearTimeout(id);
  }, [visible]);

  // Backdrop only (no setState here). Reduced-motion: one static render,
  // no tweens. Otherwise a slow museum crossfade + gentle Ken-Burns.
  useGSAP(
    () => {
      if (!visible) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          motionOK: "(prefers-reduced-motion: no-preference)",
          motionReduce: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const c = ctx.conditions as
            | { motionOK?: boolean; motionReduce?: boolean }
            | undefined;
          const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];

          if (c?.motionReduce) {
            gsap.set(slides, { autoAlpha: 0 });
            gsap.set(slides[0] ?? null, { autoAlpha: 1, scale: 1 });
            return;
          }

          gsap.set(slides, { autoAlpha: 0, scale: 1.06 });
          gsap.set(slides[0] ?? null, { autoAlpha: 1 });

          const tl = gsap.timeline({ repeat: -1 });
          slides.forEach((el, i) => {
            const next = slides[(i + 1) % slides.length];
            tl.to(el, { scale: 1.0, duration: 5, ease: "sine.inOut" }, i === 0 ? 0 : "<")
              .to(el, { autoAlpha: 0, duration: 1.4, ease: "sine.inOut" }, ">-0.2")
              .fromTo(
                next,
                { autoAlpha: 0, scale: 1.06 },
                { autoAlpha: 1, duration: 1.4, ease: "sine.inOut" },
                "<",
              );
          });
        },
      );
      return () => mm.revert();
    },
    { dependencies: [visible], scope: containerRef },
  );

  // Card fade-in once it's allowed to show.
  useGSAP(
    () => {
      if (!showCard || starting || !cardRef.current) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      gsap.fromTo(
        cardRef.current,
        { autoAlpha: 0, y: reduce ? 0 : 16 },
        { autoAlpha: 1, y: 0, duration: reduce ? 0 : 0.7, ease: "power3.out" },
      );
      firstBtnRef.current?.focus({ preventScroll: true });
    },
    { dependencies: [showCard, starting] },
  );

  // Finalise when the model is ready (immediately if it already was).
  useEffect(() => {
    if (!starting || !modelReady) return;
    const el = containerRef.current;
    const finish = () => {
      const next = chosenRef.current;
      setIntroDone(true);
      enterActive();
      if (next && next !== locale) {
        router.replace(pathname, { locale: next });
      }
    };
    if (!el) {
      finish();
      return;
    }
    gsap.killTweensOf(el);
    gsap.to(el, {
      autoAlpha: 0,
      duration: 0.5,
      ease: "power3.out",
      onComplete: finish,
    });
  }, [starting, modelReady, locale, pathname, router, setIntroDone, enterActive]);

  if (!visible) return null;

  const handleSelect = (next: Locale) => {
    if (starting) return;
    chosenRef.current = next;
    setStarting(true);
    // The finalise effect reveals the model as soon as it's ready (it
    // loaded behind this overlay during the 5 s + the visitor's choice).
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Scegli la lingua · Choose your language · Välj språk"
      className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
      style={{ zIndex: 75 }}
      suppressHydrationWarning
    >
      {/* Render backdrop (CSS background-image divs — no <img>, so no
       *  no-img-element lint and no next/image wrapper). */}
      {INTRO_RENDERS.map((src, i) => (
        <div
          key={src}
          ref={(el) => {
            slideRefs.current[i] = el;
          }}
          aria-hidden
          className="absolute inset-0 bg-canvas bg-cover bg-center"
          style={{ backgroundImage: `url("${src}")`, opacity: 0 }}
        />
      ))}

      {/* Same functional legibility scrim AttractorOverlay uses (not a
       *  decorative gradient — G2 ok). */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(9,8,10,0.62) 0%, rgba(9,8,10,0.30) 38%, rgba(9,8,10,0.34) 60%, rgba(9,8,10,0.72) 100%)",
        }}
      />

      {starting ? (
        <p
          aria-live="polite"
          className="relative font-body text-[16px] uppercase tracking-[0.28em] text-cream-300"
        >
          Avvio · Starting · Startar
        </p>
      ) : (
        <div
          ref={cardRef}
          className="relative w-full max-w-[440px] rounded-panel border border-[var(--border-subtle)] bg-elevated/95 px-8 py-9 shadow-deep"
          style={{ opacity: 0 }}
        >
          <p className="mb-7 font-body text-[14px] uppercase tracking-[0.22em] text-cream-400">
            Scegli la lingua
            <span className="mx-2 text-cream-400/50">·</span>
            Choose your language
            <span className="mx-2 text-cream-400/50">·</span>
            Välj språk
          </p>
          <ul className="flex flex-col gap-3">
            {routing.locales.map((opt, i) => (
              <li key={opt}>
                <button
                  ref={i === 0 ? firstBtnRef : undefined}
                  type="button"
                  lang={opt}
                  onClick={() => handleSelect(opt)}
                  className="group flex min-h-[64px] w-full items-center justify-center rounded-panel border border-[var(--border-subtle)] bg-canvas/40 px-6 font-display text-[28px] leading-none text-cream-100 outline-none transition-all duration-normal ease-quiet hover:border-accent/70 hover:bg-canvas/60 focus-visible:border-accent focus-visible:shadow-copper-tight"
                >
                  {LOCALE_NAME[opt]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
