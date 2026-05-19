"use client";

/**
 * IntroCinematic — the AURELIA Pro X1 brand cold-open.
 *
 * WHAT THIS IS
 *   A cinematic, auto-playing brand presentation that owns the screen on
 *   first load and replays as the attractor after 60 s idle. It is the
 *   on-totem adaptation of the brand-approved film language already
 *   specified in `docs/social-video-production-package.md` §2:
 *
 *     black → a copper hairline draws L→R → "AURELIA" engraves in
 *     (Cormorant) → tagline → a very slow Ken-Burns push across the hero
 *     renders → resolve to the live, interactive model.
 *
 *   Decision 2026-05-18 (Lorenzo): it is NOT a language gate. It auto-
 *   plays, then hands off straight to the active experience; the language
 *   picker stays where it always is. On 60 s idle the store resets
 *   `phase → "intro"` so the next fair visitor gets the full film again.
 *
 * WHY IT IS GPU-FREE (this is load-bearing, not an optimisation)
 *   The kiosk iGPU is weak — a live 3D camera fly-through during initial
 *   load races the heavy R3F build for the same budget and tips the
 *   context into `webglcontextlost` (white screen). So the whole film is
 *   CSS + GSAP over pre-rendered stills: zero WebGL while the real model
 *   builds behind it. We never reveal a bare loading dot — if the model
 *   isn't ready when the film ends, we HOLD on the final hero frame
 *   (still drifting) with one quiet line until it is.
 *
 *   Asset note: these are the committed, Lorenzo-approved AURELIA renders
 *   (PNG cutouts). The higher-fidelity `scripts/render-hero.mjs` pipeline
 *   (→ `/intro/aurelia_<view>.webp`) only runs on a capable GPU; on this
 *   box it fails (D3D11 HLSL OOM → context lost). If it is ever run
 *   successfully, swap the extension in INTRO_RENDERS to `.webp`.
 *
 * BRAND (DESIGN.md, LOCKED)
 *   copper only as the hairline keyline, never text, exactly one copper
 *   element on screen (G3); no panel radius involved; the scrim is the
 *   same functional legibility gradient the prior overlay shipped, and
 *   the radial pool is the product viewer's established depth pool — both
 *   functional, not decorative gradients (G2); the global 6 % body grain
 *   stays the only texture and sits ABOVE this layer (G9 — z-attractor 70
 *   is below z-grain 80); no emoji (G5). prefers-reduced-motion → one
 *   static hero still, type shown immediately, zero animation, resolves
 *   as soon as the model is ready.
 *
 * The reduced-motion e2e guard selects the backdrop slides by
 * `div[style*='/intro/']` — keep that, and keep the assets under
 * `public/intro/`.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTotemStore } from "@/lib/store";

// Hero arc, in order: front → 3⁄4 right → 3⁄4 left → 3⁄4 left close (the
// held beat). Committed Lorenzo-approved renders (see header note).
const INTRO_RENDERS = [
  "/intro/aurelia_front.png",
  "/intro/aurelia_3q_right.png",
  "/intro/aurelia_3q_left.png",
  "/intro/aurelia_3q_left_close.png",
] as const;

// How long the film is *felt* before it is allowed to resolve, even if
// the model is already up (a fair visitor should get the cold-open, not
// a flash). A tap/keypress bypasses this; reduced-motion sets it to 0.
const FILM_MIN_MS = 9000;

export function IntroCinematic() {
  const phase = useTotemStore((s) => s.phase);
  const modelReady = useTotemStore((s) => s.modelReady);
  const enterActive = useTotemStore((s) => s.enterActive);
  const t = useTranslations();

  const visible = phase === "intro";

  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hairlineRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const proRef = useRef<HTMLParagraphElement>(null);
  const originRef = useRef<HTMLParagraphElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  // Fires once the exit has run, so resolve can never double-trigger.
  const resolvedRef = useRef(false);
  // True the moment a tap/keypress asks to skip (bypasses FILM_MIN_MS).
  const skipRef = useRef(false);

  // `minElapsed` / `skipping` are only ever set from a timer or an event
  // handler (async) — never synchronously inside an effect body — so the
  // react-hooks/set-state-in-effect rule stays satisfied.
  const [minElapsed, setMinElapsed] = useState(false);
  const [skipping, setSkipping] = useState(false);
  // Shown only if the model is still building after the film's felt
  // minimum — a quiet held-frame line, never a bare loading dot.
  const [holding, setHolding] = useState(false);

  // Per-cycle reset (idle → "intro" again replays the film). rAF-deferred
  // so no setState runs synchronously in the effect body.
  useEffect(() => {
    if (visible) return;
    const r = requestAnimationFrame(() => {
      resolvedRef.current = false;
      skipRef.current = false;
      setMinElapsed(false);
      setSkipping(false);
      setHolding(false);
    });
    return () => cancelAnimationFrame(r);
  }, [visible]);

  // Felt-minimum timer + the "still building" hold line. Reduced-motion
  // collapses the wait to 0 (the point of reduced-motion is no animated
  // wait). setState only ever fires from these async callbacks.
  useEffect(() => {
    if (!visible) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const minId = window.setTimeout(
      () => setMinElapsed(true),
      reduce ? 0 : FILM_MIN_MS,
    );
    const holdId = window.setTimeout(
      () => setHolding(true),
      reduce ? 0 : FILM_MIN_MS + 600,
    );
    return () => {
      window.clearTimeout(minId);
      window.clearTimeout(holdId);
    };
  }, [visible]);

  // Keyboard skip (kiosk USB keyboard / a11y): Escape or Enter. Pointer
  // skip is the full-bleed button below. Both just arm skipRef + state.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        skipRef.current = true;
        setSkipping(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  // The film itself. Backdrop Ken-Burns/crossfade loop + the one-shot
  // cold-open type sequence. Reduced-motion: one static still, type shown
  // immediately, no tweens. Mirrors the prior overlay's matchMedia split.
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
          const slides = slideRefs.current.filter(
            Boolean,
          ) as HTMLDivElement[];
          const type = [
            hairlineRef.current,
            wordmarkRef.current,
            proRef.current,
            originRef.current,
            taglineRef.current,
            hintRef.current,
          ].filter(Boolean) as HTMLElement[];

          if (c?.motionReduce) {
            gsap.set(slides, { autoAlpha: 0 });
            gsap.set(slides[0] ?? null, { autoAlpha: 1, scale: 1 });
            gsap.set(type, { autoAlpha: 1, y: 0, scaleX: 1 });
            gsap.set(hairlineRef.current, { scaleX: 1 });
            return;
          }

          // ── Backdrop: very slow Ken-Burns + museum crossfade (loop) ──
          gsap.set(slides, { autoAlpha: 0, scale: 1.06 });
          gsap.set(slides[0] ?? null, { autoAlpha: 1 });
          const bg = gsap.timeline({ repeat: -1 });
          slides.forEach((el, i) => {
            const next = slides[(i + 1) % slides.length];
            bg.to(
              el,
              { scale: 1.0, duration: 5.4, ease: "sine.inOut" },
              i === 0 ? 0 : "<",
            )
              .to(
                el,
                { autoAlpha: 0, duration: 1.4, ease: "sine.inOut" },
                ">-0.1",
              )
              .fromTo(
                next,
                { autoAlpha: 0, scale: 1.06 },
                { autoAlpha: 1, duration: 1.4, ease: "sine.inOut" },
                "<",
              );
          });

          // ── Cold-open type (one-shot; stays resolved) ──
          gsap.set(type, { autoAlpha: 0 });
          gsap.set(hairlineRef.current, { scaleX: 0 });
          gsap.set([wordmarkRef.current], { y: 18 });
          gsap.set([proRef.current, originRef.current], { y: 10 });
          gsap.set(taglineRef.current, { y: 12 });

          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.to(hairlineRef.current, {
            scaleX: 1,
            autoAlpha: 1,
            duration: 1.1,
            ease: "power2.inOut",
          })
            .to(
              originRef.current,
              { autoAlpha: 1, y: 0, duration: 0.7 },
              "-=0.3",
            )
            .to(
              wordmarkRef.current,
              {
                autoAlpha: 1,
                y: 0,
                letterSpacing: "0.15em",
                duration: 1.0,
              },
              "-=0.35",
            )
            .to(
              proRef.current,
              { autoAlpha: 1, y: 0, duration: 0.7 },
              "-=0.55",
            )
            .to(
              taglineRef.current,
              { autoAlpha: 1, y: 0, duration: 0.8 },
              "-=0.2",
            )
            .to(
              hintRef.current,
              { autoAlpha: 1, duration: 0.9 },
              "+=0.6",
            );
        },
      );
      return () => mm.revert();
    },
    { dependencies: [visible], scope: containerRef },
  );

  // Resolve: when the film's felt minimum has passed (or a skip was
  // requested) AND the model is actually ready, fade the whole layer out
  // and hand off to "active". Never resolve before the model is up — a
  // held hero frame beats a bare loading dot (the locked GPU rationale).
  // gsap side-effects in an effect are the established pattern here (the
  // prior overlay's finalise effect did exactly this); no setState here.
  useEffect(() => {
    if (!visible || resolvedRef.current) return;
    if (!(minElapsed || skipping)) return;
    if (!modelReady) return;
    resolvedRef.current = true;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const el = containerRef.current;
    const finish = () => enterActive();
    if (!el || reduce) {
      if (el) gsap.set(el, { autoAlpha: 0 });
      finish();
      return;
    }
    gsap.killTweensOf(el);
    gsap.to(el, {
      autoAlpha: 0,
      duration: skipRef.current ? 0.4 : 0.6,
      ease: "power3.out",
      onComplete: finish,
    });
  }, [visible, minElapsed, skipping, modelReady, enterActive]);

  if (!visible) return null;

  const requestSkip = () => {
    if (skipRef.current) return;
    skipRef.current = true;
    setSkipping(true);
  };

  return (
    <div
      ref={containerRef}
      data-testid="intro-cinematic"
      aria-label="AURELIA Pro X1"
      className="fixed inset-0 z-attractor overflow-hidden bg-canvas"
      suppressHydrationWarning
    >
      {/* Explicit preload — these are the only intro assets; fetch them
       *  at T0 (before the heavy R3F model) so the backdrop paints with
       *  no flash, including on the idle replay. React 19 hoists these
       *  rel=preload links into <head>. */}
      {INTRO_RENDERS.map((src, i) => (
        <link
          key={`preload-${src}`}
          rel="preload"
          as="image"
          href={src}
          fetchPriority={i === 0 ? "high" : "low"}
        />
      ))}

      {/* Hero stills — CSS background (no <img>, keeps the e2e
       *  `div[style*='/intro/']` selector, no next/image wrapper). The
       *  machine is a cutout: `contain` lets it float in the near-black
       *  vitrine rather than stretch. */}
      {INTRO_RENDERS.map((src, i) => (
        <div
          key={src}
          ref={(node) => {
            slideRefs.current[i] = node;
          }}
          aria-hidden
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${src}")`, opacity: 0 }}
        />
      ))}

      {/* Established product depth pool (functional, app-consistent — the
       *  same radial the ProductViewer / render route use). */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 46%, rgba(46,45,50,0.35) 0%, rgba(10,10,10,0) 60%)",
        }}
      />

      {/* Functional legibility scrim (verbatim from the shipped overlay —
       *  for text contrast, not decoration). */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(9,8,10,0.62) 0%, rgba(9,8,10,0.30) 38%, rgba(9,8,10,0.34) 60%, rgba(9,8,10,0.72) 100%)",
        }}
      />

      {/* Full-bleed skip affordance: tap/click anywhere → enter. A real
       *  focusable control so kiosk keyboard + a11y work (Escape/Enter
       *  also handled at document level). */}
      <button
        type="button"
        aria-label={t("ui.intro.tapHint")}
        onPointerDown={requestSkip}
        onClick={requestSkip}
        className="absolute inset-0 cursor-default bg-transparent"
      />

      {/* Brand lockup. AURELIA / PRO X1 is a fixed wordmark (not
       *  localised); origin + tagline + skip hint localise. pointer-
       *  events-none so the skip button under it still catches taps. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <p
          ref={originRef}
          className="font-body text-[14px] uppercase tracking-[0.32em] text-cream-400"
          style={{ opacity: 0 }}
        >
          {t("product.origin")}
        </p>

        <div
          ref={hairlineRef}
          aria-hidden
          className="my-7 h-px w-[clamp(120px,28vw,260px)] origin-left bg-accent"
          style={{ opacity: 0 }}
        />

        <div
          ref={wordmarkRef}
          className="font-display font-bold leading-none text-cream-100"
          style={{
            opacity: 0,
            fontSize: "clamp(3.5rem, 2.5rem + 4vw, 5.5rem)",
            letterSpacing: "0.30em",
          }}
        >
          AURELIA
        </div>

        <p
          ref={proRef}
          className="mt-5 font-body text-[14px] uppercase tracking-[0.42em] text-cream-400"
          style={{ opacity: 0 }}
        >
          PRO X1
        </p>

        <p
          ref={taglineRef}
          className="mt-9 font-display text-[clamp(1.5rem,1.25rem+0.8vw,1.75rem)] italic leading-snug text-cream-300"
          style={{ opacity: 0 }}
        >
          {t("product.tagline")}
        </p>
      </div>

      {/* Quiet held-frame line — only if the model is still building past
       *  the film's felt minimum. A calm signal, never a loading dot. */}
      <p
        ref={hintRef}
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 bottom-[7vh] text-center font-mono text-[13px] uppercase tracking-[0.28em] text-cream-400"
        style={{ opacity: 0 }}
      >
        {holding && !modelReady ? t("ui.intro.almostReady") : t("ui.intro.tapHint")}
      </p>
    </div>
  );
}
