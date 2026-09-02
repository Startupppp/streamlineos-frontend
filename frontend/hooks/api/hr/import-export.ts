"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess, useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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

export interface HrImportJobDetail {
  job: HrImportJob;
  errorRows: HrImportRow[];
}

export interface CreateImportJobPayload {
  entity: HrImportEntity;
  fileName: string;
  rows: Record<string, unknown>[];
}

export interface CreateImportJobSummary {
  total: number;
  valid: number;
  errors: number;
  topErrors: HrImportError[];
}

export interface CreateImportJobResult {
  job: HrImportJob;
  summary: CreateImportJobSummary;
}

export interface PaginatedJobs {
  data: HrImportJob[];
  total: number;
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export type HrExportJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "expired";

export interface HrEmployeeExportFilters {
  search?: string;
  departmentId?: string;
  isActive?: "true" | "false" | "all";
  role?: string;
}

export interface HrEmployeeExportJob {
  id: string;
  entity: "employees";
  status: HrExportJobStatus;
  processedRows: number;
  rowCount: number | null;
  fileName: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface CreateHrEmployeeExportJobInput {
  filters: HrEmployeeExportFilters;
  idempotencyKey: string;
}

export function useHrImportJobs(
  entity?: HrImportEntity,
  pagination?: { cursor?: string; limit?: number },
) {
  const canImport = useCan("hr:import:manage");
  const hrEnabled = useModuleEnabled("hr");
  const cursor = pagination?.cursor;
  const limit = pagination?.limit ?? 20;
  return useQuery<PaginatedJobs>({
    queryKey: [...queryKeys.hr.importJobs(entity), cursor, limit] as const,
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedJobs>("/hr/import/jobs", {
        ...(cursor ? { cursor } : {}),
        limit: String(limit),
        ...(entity ? { entity } : {}),
      }, signal),
    staleTime: 30_000,
    enabled: hrEnabled && canImport,
  });
}

export function useHrImportJob(jobId: string | null) {
  const canImport = useCan("hr:import:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<HrImportJobDetail>({
    queryKey: queryKeys.hr.importJob(jobId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<HrImportJobDetail>(`/hr/import/jobs/${jobId}`, undefined, signal),
    enabled: hrEnabled && canImport && !!jobId,
    staleTime: 10_000,
  });
}

export function useCreateImportJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CreateImportJobResult, Error, CreateImportJobPayload>("hr:import:manage", {
    mutationKey: ["hr", "import", "jobs", "create"],
    mutationFn: (body) =>
      apiClient.post<CreateImportJobResult>("/hr/import/jobs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.importJobs() });
    },
  });
}

export function useCommitImportJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation<HrImportJob, Error, { jobId: string }>("hr:import:manage", {
    mutationKey: ["hr", "import", "jobs", "commit"],
    mutationFn: ({ jobId }) =>
      apiClient.post<HrImportJob>(`/hr/import/jobs/${jobId}/commit`, {}),
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.importJobs() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.importJob(jobId) });
    },
  });
}

export function useRollbackImportJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation<HrImportJob, Error, { jobId: string }>("hr:import:manage", {
    mutationKey: ["hr", "import", "jobs", "rollback"],
    mutationFn: ({ jobId }) =>
      apiClient.post<HrImportJob>(`/hr/import/jobs/${jobId}/rollback`, {}),
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.importJobs() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.importJob(jobId) });
    },
  });
}

export function useCreateHrEmployeeExportJob() {
  const canExport = useCan("hr:export:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useAuthorizedMutation<
    HrEmployeeExportJob,
    Error,
    CreateHrEmployeeExportJobInput
  >("hr:export:manage", {
    mutationKey: ["hr", "employee-export", "create"],
    mutationFn: ({ filters, idempotencyKey }) => {
      if (!hrEnabled || !canExport)
        return Promise.reject(new Error("Employee export access is required"));
      return apiClient.post<HrEmployeeExportJob>(
        "/hr/export/jobs",
        { filters },
        { headers: { "Idempotency-Key": idempotencyKey } },
      );
    },
  });
}

export function useHrEmployeeExportJob(exportJobId: string | null) {
  const { data: session } = useSession();
  const { data: access } = useAccess();
  const canExport = useCan("hr:export:manage");
  const hrEnabled = useModuleEnabled("hr");
  const orgId = session?.orgId ?? "";
  const actorUserId = session?.user?.id ?? "";
  const accessVersion = access?.version ?? 0;

  return useQuery<HrEmployeeExportJob, Error>({
    queryKey: queryKeys.hr.employeeExportJob(
      orgId,
      actorUserId,
      accessVersion,
      exportJobId ?? "",
    ),
    queryFn: ({ signal }) =>
      apiClient.get<HrEmployeeExportJob>(`/hr/export/jobs/${exportJobId}`, undefined, signal),
    enabled:
      hrEnabled && canExport && Boolean(orgId && actorUserId && exportJobId),
    staleTime: 1_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 3_000 : false;
    },
  });
}

export function useDownloadHrEmployeeExportJob() {
  const canExport = useCan("hr:export:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useAuthorizedMutation<Blob, Error, string>("hr:export:manage", {
    mutationKey: ["hr", "employee-export", "download"],
    mutationFn: (exportJobId) => {
      if (!hrEnabled || !canExport)
        return Promise.reject(new Error("Employee export access is required"));
      return apiClient.download(`/hr/export/jobs/${exportJobId}/download`);
    },
  });
}
