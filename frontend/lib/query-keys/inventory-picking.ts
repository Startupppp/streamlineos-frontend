import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryPickingQueryKeys = {
  picking: {
    all: [...base, "picking"] as const,
    wavesList: [...base, "picking", "waves"] as const,
    waves: (params?: Record<string, unknown>) =>
      k(...base, "picking", "waves", params),
    wave: (pickListId: number) => [...base, "picking", "wave", pickListId] as const,
    exceptionsList: [...base, "picking", "exceptions"] as const,
    exceptions: (params?: Record<string, unknown>) =>
      k(...base, "picking", "exceptions", params),
  },
} as const;
