import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryGlReconQueryKeys = {
  inventoryGlRecon: {
    all: [...base, "inventory", "glRecon"] as const,
    reportList: [...base, "inventory", "glRecon", "report"] as const,
    report: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "glRecon", "report", params),
    periods: [...base, "inventory", "glRecon", "periods"] as const,
  },
} as const;
