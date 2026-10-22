import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryRecallSimulationQueryKeys = {
  recallSimulation: {
    all: [...base, "recallSimulation"] as const,
    impactList: [...base, "recallSimulation", "impact"] as const,
    impact: (selection?: Record<string, unknown>) =>
      k(...base, "recallSimulation", "impact", selection),
  },
} as const;
