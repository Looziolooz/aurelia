import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { PWARegister } from "@/components/PWARegister";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURELIA Pro X1 — Il caffè, scolpito.",
  description:
    "Macchina espresso prosumer dual boiler. Made in Italy. Esperienza interattiva fiera.",
  applicationName: "AURELIA Pro X1 Totem",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aggressive asset prefetch — HDR env map is the only external asset
          * (the espresso machine is procedural, no GLB). Starts the fetch at
          * T=0, before React hydration, so drei's Environment component finds
          * it cached when the Canvas mounts. */}
        <link rel="preload" as="fetch" href="/hdr/studio_small_03_1k.hdr" crossOrigin="anonymous" />
      </head>
      <body
        className="min-h-screen overflow-hidden bg-canvas font-body text-cream-100"
        suppressHydrationWarning
      >
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
