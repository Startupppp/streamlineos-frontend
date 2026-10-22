import { queryKeyBase as base } from "./base";

export const inventorySystemHealthQueryKeys = {
  inventorySystemHealth: {
    all: [...base, "inventory", "systemHealth"] as const,
    metrics: [...base, "inventory", "systemHealth", "metrics"] as const,
    shelfLifeRules: [...base, "inventory", "systemHealth", "shelfLifeRules"] as const,
  },
} as const;
