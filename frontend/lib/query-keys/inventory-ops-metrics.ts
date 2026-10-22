import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryOpsMetricsQueryKeys = {
  inventoryOps: {
    all: [...base, "inventoryOps"] as const,
    throughputAll: [...base, "inventoryOps", "throughput"] as const,
    throughput: (params?: Record<string, unknown>) =>
      k(...base, "inventoryOps", "throughput", params),
    workAgingAll: [...base, "inventoryOps", "workAging"] as const,
    workAging: (params?: Record<string, unknown>) =>
      k(...base, "inventoryOps", "workAging", params),
  },
} as const;
