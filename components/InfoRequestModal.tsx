"use client";

/**
 * Lead-gen modal for the trade-show kiosk. A glass card consistent with
 * HotspotPanel. Submission has zero backend: it composes a `mailto:` to
 * the sales address with all fields pre-filled, so the kiosk works even
 * with no network service behind it (robust for a fair stand). If a
 * collection endpoint is configured later, swap the submit handler.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { X } from "lucide-react";
import { useTotemStore } from "@/lib/store";

const SALES_EMAIL = "lorenzo@savantmedia.se";

export function InfoRequestModal() {
  const t = useTranslations("inquiry");
  const open = useTotemStore((s) => s.inquiryOpen);
  const setOpen = useTotemStore((s) => s.setInquiryOpen);

  const cardRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    sector: "",
  });

  useGSAP(
    () => {
      if (!cardRef.current || !open) return;
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 24, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" },
      );
    },
    { dependencies: [open] },
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    firstFieldRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const submit = () => {
    const subject = encodeURIComponent(
      `${t("mailSubject")} — ${form.company || form.firstName || "Kiosk"}`,
    );
    const body = encodeURIComponent(
      [
        `${t("firstName")}: ${form.firstName}`,
        `${t("lastName")}: ${form.lastName}`,
        `${t("email")}: ${form.email}`,
        `${t("company")}: ${form.company}`,
        `${t("sector")}: ${form.sector}`,
        "",
        t("mailFooter"),
      ].join("\n"),
    );
    window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
    setOpen(false);
  };

  const field =
    "w-full rounded-soft border border-[var(--border-subtle)] bg-canvas/40 px-4 py-3 font-body text-[15px] text-cream-100 outline-none transition-colors placeholder:text-cream-400/60 focus:border-accent";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-title"
      className="fixed inset-0 z-panel flex items-center justify-center px-6"
    >
      <div
        aria-hidden
        onPointerDown={() => setOpen(false)}
        className="absolute inset-0 bg-canvas/70 backdrop-blur-md"
      />
      <div
        ref={cardRef}
        className="relative w-[min(560px,calc(100vw-3rem))] overflow-hidden rounded-3xl border border-copper-500/25 bg-canvas/75 p-8 shadow-deep backdrop-blur-3xl"
      >
        <span
          aria-hidden
          className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full border border-copper-500/25 text-cream-300 transition-colors hover:border-accent hover:text-accent"
        >
          <X size={16} strokeWidth={1.6} />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-copper-300/75">
          {t("eyebrow")}
        </p>
        <h2
          id="inquiry-title"
          className="mt-2 font-display text-[clamp(22px,2.6vw,30px)] font-semibold leading-tight text-cream-100"
        >
          {t("title")}
        </h2>
        <p className="mt-3 font-body text-[14px] leading-relaxed text-cream-200/85">
          {t("subtitle")}
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <input
            ref={firstFieldRef}
            className={field}
            type="text"
            autoComplete="given-name"
            placeholder={t("firstName")}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <input
            className={field}
            type="text"
            autoComplete="family-name"
            placeholder={t("lastName")}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          <input
            className={`${field} col-span-2`}
            type="email"
            autoComplete="email"
            placeholder={t("email")}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className={`${field} col-span-2`}
            type="text"
            autoComplete="organization"
            placeholder={t("company")}
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <select
            className={`${field} col-span-2`}
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
          >
            <option value="">{t("sectorPlaceholder")}</option>
            <option value="hospitality">{t("sectorHospitality")}</option>
            <option value="restaurant">{t("sectorRestaurant")}</option>
            <option value="private">{t("sectorPrivate")}</option>
          </select>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!form.email}
          className="mt-7 w-full rounded-soft bg-gradient-to-br from-copper-500 to-copper-700 px-6 py-4 font-body text-[13px] font-semibold uppercase tracking-[0.15em] text-cream-100 shadow-copper-tight transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("submit")}
        </button>

        <span
          aria-hidden
          className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        />
      </div>
    </div>
  );
}

/** Small CTA pinned bottom-center that opens the modal. */
export function InquiryCta() {
  const t = useTranslations("inquiry");
  const inquiryOpen = useTotemStore((s) => s.inquiryOpen);
  const setOpen = useTotemStore((s) => s.setInquiryOpen);

  if (inquiryOpen) return null;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="pointer-events-auto fixed bottom-8 left-1/2 z-chrome -translate-x-1/2 rounded-full border border-copper-500/40 bg-gradient-to-br from-copper-500/90 to-copper-700/80 px-7 py-3.5 font-body text-[12px] font-semibold uppercase tracking-[0.18em] text-cream-100 shadow-copper-tight backdrop-blur-md transition-all hover:brightness-110"
    >
      {t("cta")}
    </button>
  );
}
