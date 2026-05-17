import { getTranslations } from "next-intl/server";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ColorVariantSwitcher } from "@/components/ColorVariantSwitcher";
import { AttractorOverlay } from "@/components/AttractorOverlay";
import { HotspotPanel } from "@/components/HotspotPanel";
import { HotspotSidebar } from "@/components/HotspotSidebar";
import { HotspotCalibrator } from "@/components/HotspotCalibrator";
import { KioskModeToggle } from "@/components/KioskModeToggle";
import { InfoRequestModal, InquiryCta } from "@/components/InfoRequestModal";

// ProductViewer is mounted in app/[locale]/layout.tsx so it survives the
// /it ↔ /en ↔ /sv client-side route transitions. Keeping it here would
// re-mount the Canvas and re-parse the GLB on every language toggle.

export default async function LocaleHome() {
  const t = await getTranslations();

  return (
    <>
      <header className="pointer-events-none absolute top-0 left-0 right-0 z-chrome flex flex-col items-center gap-1 px-6 pt-8 text-center">
        <p className="font-body text-[14px] uppercase tracking-[0.1em] text-cream-400">
          {t("product.origin")}
        </p>
        <h1 className="font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight tracking-[-0.01em] text-cream-100">
          {t("product.name")}
        </h1>
      </header>

      <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-chrome flex justify-center px-6 pb-6 text-center">
        <p className="max-w-2xl font-body text-[16px] leading-relaxed text-cream-400">
          {t("footer.disclaimer")}
        </p>
      </footer>

      <LanguagePicker />
      <ColorVariantSwitcher />
      <AttractorOverlay />
      <HotspotSidebar />
      <HotspotPanel />
      <InquiryCta />
      <InfoRequestModal />
      <HotspotCalibrator />
      <KioskModeToggle />
    </>
  );
}
