"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useTotemStore } from "@/lib/store";

const IDLE_TIMEOUT_MS = 60_000;
const RESET_THROTTLE_MS = 200;

export function IdleResetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const resetIdle = useTotemStore((s) => s.resetIdle);
  const phase = useTotemStore((s) => s.phase);
  const inquiryOpen = useTotemStore((s) => s.inquiryOpen);

  const timerRef = useRef<number | null>(null);
  const lastTouchRef = useRef<number>(0);

  useEffect(() => {
    const fireReset = () => {
      resetIdle();
      if (locale !== routing.defaultLocale) {
        router.replace(pathname, { locale: routing.defaultLocale });
      }
    };

    const armTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(fireReset, IDLE_TIMEOUT_MS);
    };

    const onActivity = () => {
      if (inquiryOpen) return;
      const now = performance.now();
      if (now - lastTouchRef.current < RESET_THROTTLE_MS) return;
      lastTouchRef.current = now;
      armTimer();
    };

    // Don't arm idle while the cinematic owns the screen: the film IS
    // the attractor, and a 60 s timeout mid-intro would just re-fire
    // resetIdle()/bounce the locale. The timer (re)arms the moment the
    // visitor enters "active" — this effect re-runs on every phase change.
    if (phase !== "intro" && !inquiryOpen) armTimer();

    const events: (keyof DocumentEventMap)[] = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
    ];
    events.forEach((evt) =>
      document.addEventListener(evt, onActivity, { passive: true }),
    );

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      events.forEach((evt) => document.removeEventListener(evt, onActivity));
    };
  }, [phase, inquiryOpen, locale, pathname, resetIdle, router]);

  return <>{children}</>;
}
