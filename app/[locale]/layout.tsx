import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { LocaleHtmlLangSync } from "@/components/LocaleHtmlLangSync";
import { IdleResetProvider } from "@/components/IdleResetProvider";
import { ProductViewer } from "@/components/ProductViewer";
import { IntroCinematic } from "@/components/IntroCinematic";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "ui" });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <LocaleHtmlLangSync locale={locale} />
      <a href="#main" className="skip-link">
        {t("skipToContent")}
      </a>
      <main id="main" className="relative h-screen w-screen">
        {/* ProductViewer lives in the layout, not the page, so it survives
         *  client-side locale switches (/it → /en). The 3D Canvas is
         *  expensive to re-mount and the GLB has to re-parse on every
         *  language toggle if mounted in the page. */}
        <ProductViewer />
        {/* Brand cold-open. In the layout (not the page) so it survives
         *  locale switches and is always present to replay as the
         *  attractor when the store resets phase → "intro" on idle.
         *  GPU-free: it plays while the R3F model builds behind it. */}
        <IntroCinematic />
        <IdleResetProvider>{children}</IdleResetProvider>
      </main>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
