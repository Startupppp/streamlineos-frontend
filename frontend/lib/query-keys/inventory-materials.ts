import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryMaterialsQueryKeys = {
  inventoryOpsBoard: {
    all: [...base, "inventoryOpsBoard"] as const,
    summary: [...base, "inventoryOpsBoard", "summary"] as const,
    attention: [...base, "inventoryOpsBoard", "attention"] as const,
    zones: [...base, "inventoryOpsBoard", "zones"] as const,
  },
  inventoryProjects: {
    all: [...base, "inventoryProjects"] as const,
    listAll: [...base, "inventoryProjects", "list"] as const,
    list: (params?: Record<string, unknown>) => k(...base, "inventoryProjects", "list", params),
    detail: (projectId: number) => [...base, "inventoryProjects", "detail", projectId] as const,
    atRisk: [...base, "inventoryProjects", "atRisk"] as const,
  },
} as const;
