import type { MetadataRoute } from "next";

// Next 16 file convention: this is auto-served at /manifest.webmanifest and
// auto-linked from <head>. Brief §6 #9 ("works offline after first load")
// + §1 (1080×1920 portrait totem). Brand: AURELIA, near-black #0A0A0A +
// burnished copper. SVG icon (no binary asset needed; Chrome/Edge/Safari
// kiosk all accept SVG manifest icons).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AURELIA Pro X1 — Totem",
    short_name: "AURELIA",
    description:
      "Macchina espresso prosumer dual boiler. Made in Italy. Esperienza interattiva fiera.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
