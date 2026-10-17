import type { HrImportJob } from "@/hooks/api/hr/import-export";

export function importJob(over: Partial<HrImportJob> = {}): HrImportJob {
  return {
    id: "job-1",
    orgId: "org-1",
    entity: "document_metadata",
    fileName: "documents.csv",
    status: "committed",
    totalRows: 6,
    validRows: 6,
    errorRows: 0,
    createdRows: 0,
    updatedRows: 0,
    unchangedRows: 0,
    errors: null,
    createdBy: null,
    committedAt: "2026-09-25T00:00:00.000Z",
    rolledBackAt: null,
    createdAt: "2026-09-25T00:00:00.000Z",
    ...over,
  };
}
