import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryQualityPlanQueryKeys = {
  inspectionPlans: {
    all: [...base, "inspectionPlans"] as const,
    plansList: [...base, "inspectionPlans", "plans"] as const,
    plans: (params?: Record<string, unknown>) =>
      k(...base, "inspectionPlans", "plans", params),
    plan: (planId: number) => [...base, "inspectionPlans", "plan", planId] as const,
    versions: (planId: number) =>
      [...base, "inspectionPlans", "versions", planId] as const,
  },
} as const;
