"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useTotemStore } from "@/lib/store";

const LOCALE_LABEL: Record<Locale, string> = {
  it: "IT",
  en: "EN",
  sv: "SV",
};

export function LanguagePicker() {
  const t = useTranslations("ui");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const open = useTotemStore((s) => s.pickerOpen);
  const setOpen = useTotemStore((s) => s.setPickerOpen);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  const handleSelect = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  return (
    <div
      ref={containerRef}
      className="fixed top-4 right-4 z-picker"
      suppressHydrationWarning
    >
      <button
        type="button"
        aria-label={t("language")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-elevated/80 backdrop-blur-md font-body text-[14px] uppercase tracking-[0.1em] text-accent transition-all duration-normal hover:border-accent/60 hover:shadow-copper-tight focus-visible:border-accent focus-visible:shadow-copper-tight"
      >
        {LOCALE_LABEL[locale]}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("language")}
          className="absolute top-16 right-0 w-[180px] overflow-hidden rounded-soft border border-[var(--border-subtle)] bg-elevated shadow-deep"
        >
          {routing.locales.map((opt, index) => {
            const isActive = opt === locale;
            return (
              <li key={opt} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt)}
                  style={{
                    animationDelay: `${index * 60}ms`,
                  }}
                  className={`relative flex w-full items-center gap-3 px-5 py-4 text-left font-body text-[16px] uppercase tracking-[0.1em] text-cream-100 animate-fade-up transition-colors hover:bg-canvas/40 ${
                    isActive ? "text-cream-100" : "text-cream-300"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-5 right-5 h-[2px] rounded-full bg-accent"
                    />
                  )}
                  <span className="ml-3">{LOCALE_LABEL[opt]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
