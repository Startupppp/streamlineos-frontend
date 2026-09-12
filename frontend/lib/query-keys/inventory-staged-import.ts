import { queryKeyBase as base } from "./base";

/**
 * The resumable import's own namespace.
 *
 * `inventory.importJobs` is the history list. A staged job's progress changes on
 * every chunk applied, and folding it into that prefix would refetch the whole
 * history on each turn of the loop.
 */
export const inventoryStagedImportQueryKeys = {
  inventoryStagedImport: {
    all: [...base, "inventory", "stagedImport"] as const,
    errors: (jobId: number, page: number) =>
      [...base, "inventory", "stagedImport", "errors", jobId, page] as const,
  },
} as const;
