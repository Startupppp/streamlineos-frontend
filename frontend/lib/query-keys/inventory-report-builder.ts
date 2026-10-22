import { queryKeyBase as base } from "./base";

export const inventoryReportBuilderQueryKeys = {
  inventoryReportBuilder: {
    all: [...base, "inventory", "reportBuilder"] as const,
    catalog: () => [...base, "inventory", "reportBuilder", "catalog"] as const,
    ask: [...base, "inventory", "reportBuilder", "ask"] as const,
    export: [...base, "inventory", "reportBuilder", "export"] as const,
  },
} as const;
