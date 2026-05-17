"use client";

/**
 * Attivazione kiosk-mode da URL flag (?kiosk=1):
 *   - imposta body[data-kiosk="true"]   -> CSS nasconde il cursore (globals.css)
 *   - intercetta contextmenu / drag / selection per evitare gesti
 *     accidentali su un totem touch screen
 *   - opzionalmente richiede fullscreen via gesto utente al primo tap
 *
 * Quando il flag non c'e' il componente non monta alcun listener:
 * comportamento dev/desktop invariato.
 */

import { useEffect } from "react";

export function KioskModeToggle() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("kiosk") !== "1") return;

    document.body.setAttribute("data-kiosk", "true");

    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("dragstart", prevent);
    document.addEventListener("selectstart", prevent);

    // Richiede il fullscreen al primo tap (browsers richiedono user gesture).
    const requestFs = () => {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          /* user denied or unsupported */
        });
      }
      window.removeEventListener("pointerdown", requestFs);
    };
    window.addEventListener("pointerdown", requestFs, { once: true });

    return () => {
      document.body.removeAttribute("data-kiosk");
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("selectstart", prevent);
      window.removeEventListener("pointerdown", requestFs);
    };
  }, []);

  return null;
}
