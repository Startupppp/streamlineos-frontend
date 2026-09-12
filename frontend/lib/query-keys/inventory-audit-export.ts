import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * Checksummed evidence bundles of the ledger.
 *
 * Separate from `inventory.auditEvents`, which is the trail itself: reading the
 * trail and taking evidence away are different rights, and a job settling
 * asynchronously must not invalidate the trail behind it.
 */
export const inventoryAuditExportQueryKeys = {
  inventoryAuditExport: {
    all: [...base, "inventory", "auditExport"] as const,
    jobsAll: [...base, "inventory", "auditExport", "jobs"] as const,
    jobs: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "auditExport", "jobs", params),
    /**
     * Restored: `useAuditExportJob` (`hooks/api/inventory/audit-export.ts`) reads
     * this. It was deleted as a leaf with no reader while that hook was calling
     * it, and the hook was then deleted too rather than the key being put back.
     */
    job: (jobId: number) => [...base, "inventory", "auditExport", "job", jobId] as const,
    verification: (jobId: number) =>
      [...base, "inventory", "auditExport", "verify", jobId] as const,
  },
} as const;
