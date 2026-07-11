"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type HrImportEntity =
  | "employees"
  | "leave_balances"
  | "attendance"
  | "assets"
  | "document_metadata";

export type HrImportStatus =
  | "validating"
  | "previewed"
  | "committing"
  | "committed"
  | "rolled_back"
  | "failed";

export type HrImportRowStatus = "valid" | "error" | "committed";

export interface HrImportError {
  row: number;
  field?: string;
  message: string;
}

export interface HrImportJob {
  id: string;
  orgId: string;
  entity: HrImportEntity;
  fileName: string;
  status: HrImportStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: HrImportError[] | null;
  createdBy: string | null;
  committedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
}

export interface HrImportRow {
  id: string;
  jobId: string;
  rowNumber: number;
  payload: Record<string, unknown>;
  status: HrImportRowStatus;
  error: string | null;
  createdRecordRef: { table: string; id: string | number } | null;
}

export interface HrImportJobDetail extends HrImportJob {
  errorRows: HrImportRow[];
}

export interface CreateImportJobPayload {
  entity: HrImportEntity;
  fileName: string;
  rows: Record<string, unknown>[];
}

export interface PaginatedJobs {
  data: HrImportJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const KEYS = {
  jobs: (entity?: HrImportEntity) =>
    ["hr", "import", "jobs", entity ?? "all"] as const,
  job: (jobId: string) => ["hr", "import", "jobs", jobId] as const,
};

export function useHrImportJobs(entity?: HrImportEntity) {
  const entityParam = entity ? `&entity=${entity}` : "";
  return useQuery<PaginatedJobs>({
    queryKey: KEYS.jobs(entity),
    queryFn: () =>
      apiClient.get<PaginatedJobs>(
        `/hr/import/jobs?page=1&limit=20${entityParam}`,
      ),
    staleTime: 30_000,
  });
}

export function useHrImportJob(jobId: string | null) {
  return useQuery<HrImportJobDetail>({
    queryKey: KEYS.job(jobId ?? ""),
    queryFn: () =>
      apiClient.get<HrImportJobDetail>(`/hr/import/jobs/${jobId}`),
    enabled: !!jobId,
    staleTime: 10_000,
  });
}

export function useCreateImportJob() {
  const qc = useQueryClient();
  return useMutation<HrImportJob, Error, CreateImportJobPayload>({
    mutationKey: ["hr", "import", "jobs", "create"],
    mutationFn: (body) => apiClient.post<HrImportJob>("/hr/import/jobs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "import", "jobs"] });
    },
  });
}

export function useCommitImportJob() {
  const qc = useQueryClient();
  return useMutation<HrImportJob, Error, { jobId: string }>({
    mutationKey: ["hr", "import", "jobs", "commit"],
    mutationFn: ({ jobId }) =>
      apiClient.post<HrImportJob>(`/hr/import/jobs/${jobId}/commit`, {}),
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: ["hr", "import", "jobs"] });
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) });
    },
  });
}

export function useRollbackImportJob() {
  const qc = useQueryClient();
  return useMutation<HrImportJob, Error, { jobId: string }>({
    mutationKey: ["hr", "import", "jobs", "rollback"],
    mutationFn: ({ jobId }) =>
      apiClient.post<HrImportJob>(`/hr/import/jobs/${jobId}/rollback`, {}),
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: ["hr", "import", "jobs"] });
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) });
    },
  });
}
