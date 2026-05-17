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
  const resetToAttractor = useTotemStore((s) => s.resetToAttractor);
  const phase = useTotemStore((s) => s.phase);
  // The lead-gen modal must hold the kiosk open: a visitor mid-form-fill can
  // easily pause >60s (reading, typing a long company name) without firing
  // the activity listeners often enough. Resetting here would also wipe their
  // input and bounce the locale. While the modal is open, idle is suspended.
  const inquiryOpen = useTotemStore((s) => s.inquiryOpen);

  const timerRef = useRef<number | null>(null);
  const lastTouchRef = useRef<number>(0);

  useEffect(() => {
    const fireReset = () => {
      resetToAttractor();
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

    if (phase !== "attractor" && !inquiryOpen) armTimer();

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
  }, [phase, inquiryOpen, locale, pathname, resetToAttractor, router]);

  return <>{children}</>;
}
