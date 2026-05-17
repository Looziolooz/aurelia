"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTotemStore } from "@/lib/store";

const SCENE_DURATION_S = 4;

export function AttractorOverlay() {
  const t = useTranslations();
  const phase = useTotemStore((s) => s.phase);
  const enterActive = useTotemStore((s) => s.enterActive);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneARef = useRef<HTMLDivElement>(null);
  const sceneBRef = useRef<HTMLDivElement>(null);
  const sceneCRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);

  const visible = phase === "attractor";

  // Single-source strategy: there is no static Cycles hero any more. The
  // attractor is a translucent text layer OVER the live R3F model (the
  // model IS the hero). One model end-to-end → guaranteed coherence, and
  // the old "static frozen image → change language → 3D" bug is gone
  // because there is no static image to get stuck on.

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
          const conditions = ctx.conditions as
            | { motionOK?: boolean; motionReduce?: boolean }
            | undefined;
          gsap.set([sceneARef.current, sceneBRef.current, sceneCRef.current], {
            autoAlpha: 0,
          });

          if (conditions?.motionReduce) {
            gsap.set(sceneARef.current, { autoAlpha: 1 });
            return;
          }

          // Subtle slow breathing on the whole container
          gsap.fromTo(
            containerRef.current,
            { scale: 0.99 },
            {
              scale: 1.01,
              duration: 2,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            },
          );

          const tl = gsap.timeline({
            repeat: -1,
            defaults: { ease: "power3.out" },
          });

          tl.to(sceneARef.current, { autoAlpha: 1, duration: 0.6 })
            .from(underlineRef.current, { width: 0, duration: 0.8, ease: "power3.out" }, "<+0.3")
            .to({}, { duration: SCENE_DURATION_S - 0.6 - 0.3 })
            .to(sceneARef.current, { autoAlpha: 0, duration: 0.4 })
            .to(sceneBRef.current, { autoAlpha: 1, duration: 0.4 }, "<+0.2")
            .to({}, { duration: SCENE_DURATION_S - 0.6 })
            .to(sceneBRef.current, { autoAlpha: 0, duration: 0.4 })
            .to(sceneCRef.current, { autoAlpha: 1, duration: 0.4 }, "<+0.2")
            .to({}, { duration: SCENE_DURATION_S - 0.6 })
            .to(sceneCRef.current, { autoAlpha: 0, duration: 0.4 });
        },
      );

      return () => {
        mm.revert();
      };
    },
    { dependencies: [visible], scope: containerRef },
  );

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.to(containerRef.current, {
        autoAlpha: visible ? 1 : 0,
        scale: 1,
        duration: visible ? 0.6 : 0.2,
        delay: visible ? 0.3 : 0,  // ↑ delay entrance to let layout settle
        ease: "power3.out",
      });
    },
    { dependencies: [visible] },
  );

  // Dismiss the attractor on the first interaction anywhere on the page,
  // not just on the overlay itself. The language picker / kiosk toggle sit
  // at a higher z-index than the attractor and their clicks were stopping
  // at the picker root — without this listener the model stays hidden
  // under the overlay until the user happens to tap the dim area.
  useEffect(() => {
    if (phase !== "attractor") return;
    const onFirstTouch = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && !["Enter", " ", "Escape"].includes(e.key)) return;
      enterActive();
    };
    document.addEventListener("pointerdown", onFirstTouch, { once: true, capture: true });
    document.addEventListener("keydown", onFirstTouch);
    return () => {
      document.removeEventListener("pointerdown", onFirstTouch, true);
      document.removeEventListener("keydown", onFirstTouch);
    };
  }, [phase, enterActive]);

  if (phase !== "attractor") return null;

  const handleActivate = () => {
    const el = containerRef.current;
    if (!el) { enterActive(); return; }
    gsap.killTweensOf(el);
    gsap.to(el, {
      autoAlpha: 0,
      scale: 0.98,
      duration: 0.2,
      ease: "power3.out",
      onComplete: () => enterActive(),
    });
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleActivate();
      }}
      role="button"
      tabIndex={0}
      aria-label={t("attractor.invite")}
      className="fixed inset-0 z-attractor flex flex-col items-center justify-center gap-12 px-6 text-center cursor-pointer"
      // Translucent scrim, NOT opaque: the live R3F model shows through (it
      // is the hero). Just enough darkening top/bottom to keep the cream
      // headline legible over both the dark body and the bright floor.
      // Dismiss is now a pure fade of this text layer — the model never
      // changes, so there is no transition mismatch.
      style={{
        background:
          "linear-gradient(180deg, rgba(9,8,10,0.55) 0%, rgba(9,8,10,0.22) 42%, rgba(9,8,10,0.30) 62%, rgba(9,8,10,0.62) 100%)",
      }}
      suppressHydrationWarning
    >
      <div ref={sceneARef} className="relative space-y-4 opacity-0" suppressHydrationWarning>
        <p className="font-body text-[14px] uppercase tracking-[0.1em] text-cream-400">
          {t("product.origin")}
        </p>
        <h1 className="font-display text-[clamp(64px,5vw,80px)] font-bold leading-[0.95] tracking-[0.05em] text-cream-100 uppercase">
          {t("attractor.headline")}
        </h1>
        <span
          ref={underlineRef}
          aria-hidden
          className="block mx-auto h-[8px] w-[240px] bg-accent rounded-full"
        />
        <p className="font-display text-[clamp(20px,2.5vw,32px)] italic text-cream-300">
          {t("attractor.tagline")}
        </p>
      </div>

      <div ref={sceneBRef} className="absolute inset-0 flex flex-col items-center justify-center gap-8 opacity-0" suppressHydrationWarning>
        <SwipeIcon />
        <p className="font-display text-[clamp(28px,4vw,56px)] text-cream-100">
          {t("attractor.invite")}
        </p>
      </div>

      <div ref={sceneCRef} className="absolute inset-0 flex flex-col items-center justify-center gap-8 opacity-0" suppressHydrationWarning>
        <p className="font-display text-[clamp(32px,5vw,64px)] text-cream-100">
          {t("attractor.discover")}
        </p>
        <p className="font-body text-[16px] uppercase tracking-[0.1em] text-cream-400">
          {t("ui.tapGesture")} · {t("ui.rotateGesture")} · {t("ui.pinchGesture")}
        </p>
      </div>
    </div>
  );
}

function SwipeIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
      aria-hidden
    >
      <path d="M30 28v18M30 28a4 4 0 0 1 8 0v14M38 32a4 4 0 0 1 8 0v10M46 36a4 4 0 0 1 8 0v8c0 11-7 18-15 18s-15-7-15-18v-2c0-3 2-5 5-5" />
      <path d="M18 22 L26 22 M22 18 L22 26" opacity="0.5" />
    </svg>
  );
}
