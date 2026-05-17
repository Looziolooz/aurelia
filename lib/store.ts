import { create } from "zustand";
import { type SmegColorId, DEFAULT_COLOR } from "./smegVariants";

export type TotemPhase = "attractor" | "active" | "detail";

interface TotemState {
  phase: TotemPhase;
  activeHotspotId: string | null;
  visitedHotspots: ReadonlySet<string>;
  pickerOpen: boolean;
  inquiryOpen: boolean;

  // Onboarding gate. The first-load IntroOverlay (render backdrop →
  // language choice) owns the screen until the visitor picks a language;
  // `introDone` flips true then. Reset to false on idle so the NEXT fair
  // visitor gets the full onboarding again (a new person may want a
  // different language). AttractorOverlay's global tap-to-dismiss is
  // gated on this so a stray tap during the intro can't skip the
  // language step.
  introDone: boolean;
  // Mirrors ProductCanvas' model-ready signal into the store so the
  // IntroOverlay can hold its elegant render backdrop until the heavy
  // model is actually on screen (never reveal a bare loading dot). Stays
  // true across idle resets — once built the model is still there.
  modelReady: boolean;

  // Smeg-inspired colour (glossy enamel only). Persisted across idle
  // reset on purpose: it's a deliberate visitor choice, not session noise.
  colorVariant: SmegColorId;

  enterActive: () => void;
  openHotspot: (id: string) => void;
  closeHotspot: () => void;
  resetToAttractor: () => void;
  setPickerOpen: (open: boolean) => void;
  setInquiryOpen: (open: boolean) => void;
  setColorVariant: (id: SmegColorId) => void;
  setIntroDone: (done: boolean) => void;
  setModelReady: (ready: boolean) => void;
}

export const useTotemStore = create<TotemState>((set) => ({
  phase: "attractor",
  activeHotspotId: null,
  visitedHotspots: new Set<string>(),
  pickerOpen: false,
  inquiryOpen: false,
  introDone: false,
  modelReady: false,
  colorVariant: DEFAULT_COLOR,

  enterActive: () =>
    set((state) =>
      state.phase === "attractor" ? { phase: "active" } : state,
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

  resetToAttractor: () =>
    set({
      phase: "attractor",
      activeHotspotId: null,
      visitedHotspots: new Set<string>(),
      pickerOpen: false,
      inquiryOpen: false,
      // New visitor at the kiosk → full onboarding again (incl. language).
      // modelReady is deliberately NOT reset: the model stays built, so
      // the re-shown intro reveals instantly.
      introDone: false,
    }),

  setPickerOpen: (open) => set({ pickerOpen: open }),
  setInquiryOpen: (open) => set({ inquiryOpen: open }),
  setColorVariant: (id) => set({ colorVariant: id }),
  setIntroDone: (done) => set({ introDone: done }),
  setModelReady: (ready) => set({ modelReady: ready }),
}));
