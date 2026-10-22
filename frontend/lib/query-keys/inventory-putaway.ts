import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryPutawayQueryKeys = {
  putaway: {
    all: [...base, "putaway"] as const,
    tasksList: [...base, "putaway", "tasks"] as const,
    tasks: (params?: Record<string, unknown>) =>
      k(...base, "putaway", "tasks", params),
    task: (taskId: number) => [...base, "putaway", "task", taskId] as const,
    suggestions: (warehouseId: number, productVariantId: number, quantity: string) =>
      [...base, "putaway", "suggestions", warehouseId, productVariantId, quantity] as const,
  },
} as const;
