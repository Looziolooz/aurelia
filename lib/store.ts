import { create } from "zustand";
import { type SmegColorId, DEFAULT_COLOR } from "./smegVariants";

// "intro" — the first-load cinematic (IntroCinematic) owns the screen and
// auto-plays the brand cold-open while the heavy R3F model builds behind
// it. It is NOT a language gate (decision 2026-05-18): it auto-resolves
// to "active" when the film ends AND the model is ready, or instantly on
// a tap-to-skip. On 60 s idle the kiosk resets to "intro" so the film
// replays as the attractor for the next fair visitor.
export type TotemPhase = "intro" | "active" | "detail";

interface TotemState {
  phase: TotemPhase;
  activeHotspotId: string | null;
  visitedHotspots: ReadonlySet<string>;
  pickerOpen: boolean;
  inquiryOpen: boolean;

  // Mirrors ProductCanvas' model-ready signal into the store. The
  // cinematic holds its final hero frame until this is true, so we never
  // hand off to a bare loading dot. Stays true across idle resets — once
  // built the model is still there, so the replayed film reveals instantly.
  modelReady: boolean;

  // Smeg-inspired colour (glossy enamel only). Persisted across idle
  // reset on purpose: it's a deliberate visitor choice, not session noise.
  colorVariant: SmegColorId;

  // Called by IntroCinematic when the film resolves (end-of-timeline with
  // the model ready, or a tap-to-skip). Only transitions out of "intro"
  // so it can never clobber an open "detail" panel.
  enterActive: () => void;
  openHotspot: (id: string) => void;
  closeHotspot: () => void;
  resetIdle: () => void;
  setPickerOpen: (open: boolean) => void;
  setInquiryOpen: (open: boolean) => void;
  setColorVariant: (id: SmegColorId) => void;
  setModelReady: (ready: boolean) => void;
}

export const useTotemStore = create<TotemState>((set) => ({
  phase: "intro",
  activeHotspotId: null,
  visitedHotspots: new Set<string>(),
  pickerOpen: false,
  inquiryOpen: false,
  modelReady: false,
  colorVariant: DEFAULT_COLOR,

  enterActive: () =>
    set((state) =>
      state.phase === "intro" ? { phase: "active" } : state,
    ),

  openHotspot: (id) =>
    set((state) => {
      const next = new Set(state.visitedHotspots);
      next.add(id);
      return {
        phase: "detail",
        activeHotspotId: id,
        visitedHotspots: next,
      };
    }),

  closeHotspot: () =>
    set({ phase: "active", activeHotspotId: null }),

  resetIdle: () =>
    set({
      // New fair visitor → replay the brand cinematic as the attractor.
      phase: "intro",
      activeHotspotId: null,
      visitedHotspots: new Set<string>(),
      pickerOpen: false,
      inquiryOpen: false,
      // modelReady is deliberately NOT reset: the model stays built, so
      // the replayed film hands off the instant its timeline ends.
    }),

  setPickerOpen: (open) => set({ pickerOpen: open }),
  setInquiryOpen: (open) => set({ inquiryOpen: open }),
  setColorVariant: (id) => set({ colorVariant: id }),
  setModelReady: (ready) => set({ modelReady: ready }),
}));
