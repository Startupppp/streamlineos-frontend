import { queryKeyBase as base } from "./base";

export const inventoryStagedImportQueryKeys = {
  inventoryStagedImport: {
    all: [...base, "inventory", "stagedImport"] as const,
    errors: (jobId: number, page: number) =>
      [...base, "inventory", "stagedImport", "errors", jobId, page] as const,
  },
} as const;
