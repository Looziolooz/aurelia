import { create } from "zustand";
import { type SmegColorId, DEFAULT_COLOR } from "./smegVariants";

export type TotemPhase = "attractor" | "active" | "detail";

interface TotemState {
  phase: TotemPhase;
  activeHotspotId: string | null;
  visitedHotspots: ReadonlySet<string>;
  pickerOpen: boolean;
  inquiryOpen: boolean;

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
}

export const useTotemStore = create<TotemState>((set) => ({
  phase: "attractor",
  activeHotspotId: null,
  visitedHotspots: new Set<string>(),
  pickerOpen: false,
  inquiryOpen: false,
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
    }),

  setPickerOpen: (open) => set({ pickerOpen: open }),
  setInquiryOpen: (open) => set({ inquiryOpen: open }),
  setColorVariant: (id) => set({ colorVariant: id }),
}));
