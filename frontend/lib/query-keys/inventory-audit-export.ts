import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryAuditExportQueryKeys = {
  inventoryAuditExport: {
    all: [...base, "inventory", "auditExport"] as const,
    jobsAll: [...base, "inventory", "auditExport", "jobs"] as const,
    jobs: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "auditExport", "jobs", params),
    job: (jobId: number) => [...base, "inventory", "auditExport", "job", jobId] as const,
    verification: (jobId: number) =>
      [...base, "inventory", "auditExport", "verify", jobId] as const,
  },
} as const;
