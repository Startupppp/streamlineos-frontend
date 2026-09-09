"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { JobStatus } from "@/features/inventory/lib";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

type ReservationStrategy = "MANUAL" | "AUTO_ON_CONFIRM" | "FEFO" | "FIFO";
type ExpiryPolicy = "BLOCK" | "WARN" | "ALLOW";
type CostingMethod = "FIFO" | "LIFO" | "WEIGHTED_AVG" | "STANDARD";

export interface InventorySettings {
  allowNegativeStock: boolean;
  allowBackorders: boolean;
  reservationStrategy: ReservationStrategy;
  defaultCostingMethod: CostingMethod;
  expiryReservationPolicy: ExpiryPolicy;
  inspectionOnReceipt: boolean;
  inspectionOnReturn: boolean;
  overReceiptTolerancePct: number;
  requirePoApproval: boolean;
  adjustmentApprovalThreshold: number;
  autoReserveOnConfirm: boolean;
  allowPartialShipment: boolean;
  packageRequiredForShipping: boolean;
  packWarehouse: boolean;
  packKirana: boolean;
  packPharmacy: boolean;
  packGst: boolean;
  packMaterials: boolean;
}

/**
 * E1 — which packs this organisation runs.
 *
 * Read through `useInventoryPacks`, which is gated on the read key every
 * inventory role holds rather than on `inventory:settings:manage`: navigation,
 * form fields and validation all have to know, and gating it on the
 * administration key would show a pharmacy's MRP field only to the person who
 * administers the module.
 */
export interface InventoryPacks {
  warehouse: boolean;
  kirana: boolean;
  pharmacy: boolean;
  gst: boolean;
  /** B1 — construction and interior materials: catalogue attributes, dark stores, projects. */
  materials: boolean;
}

export interface NumberSequence {
  id: number;
  sequenceType: string;
  label: string;
  prefix: string;
  padding: number;
  nextNumber: number;
}

interface SettingsHealth {
  reconciliationSampleResult: string | null;
  expiredReservationsCount: number;
  failedJobsCount: number;
  failedWebhooksCount: number;
  failedPublicationsCount: number;
}

export interface ImportPreviewResult {
  columns: string[];
  mappedFields: Record<string, string>;
  validRows: number;
  errors: { row: number; field: string; message: string }[];
  sample: Record<string, unknown>[];
}

interface ImportJobListItem {
  id: number;
  importType: string;
  status: JobStatus;
  totalRows: number;
  processedRows: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface ImportJobDetail extends ImportJobListItem {
  errors: { row: number; field: string; message: string }[];
}

interface ImportJobListResponse {
  items: ImportJobListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export function useInventorySettings() {
  const canView = useCan("inventory:settings:manage");
  return useQuery<InventorySettings, Error>({
    queryKey: queryKeys.inventory.settings(),
    queryFn: () => apiClient.get<InventorySettings>("/inventory/settings"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useInventoryPacks() {
  const canRead = useCan("inventory:products:read");
  return useQuery<InventoryPacks, Error>({
    queryKey: queryKeys.inventory.packs(),
    queryFn: () => apiClient.get<InventoryPacks>("/inventory/settings/packs"),
    staleTime: 5 * 60_000,
    enabled: canRead,
  });
}

export function useUpdateInventorySettings() {
  const qc = useQueryClient();
  return useMutation<InventorySettings, Error, Partial<InventorySettings>>({
    mutationKey: ["inventory", "settings", "update"],
    mutationFn: (data) => apiClient.patch<InventorySettings>("/inventory/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.settings() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packs() });
    },
  });
}

export function useNumberSequences() {
  const canView = useCan("inventory:settings:manage");
  return useQuery<NumberSequence[], Error>({
    queryKey: queryKeys.inventory.numberSequences(),
    queryFn: () => apiClient.get<NumberSequence[]>("/inventory/settings/number-sequences"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useUpdateNumberSequence() {
  const qc = useQueryClient();
  return useMutation<
    NumberSequence,
    Error,
    { sequenceId: number; data: { prefix?: string; padding?: number; nextNumber?: number } }
  >({
    mutationKey: ["inventory", "settings", "numberSequence", "update"],
    mutationFn: ({ sequenceId, data }) =>
      apiClient.patch<NumberSequence>(
        `/inventory/settings/number-sequences/${sequenceId}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.numberSequences() });
    },
  });
}

export function useSettingsHealth() {
  const canView = useCan("inventory:settings:manage");
  return useQuery<SettingsHealth, Error>({
    queryKey: [...queryKeys.inventory.settings(), "health"],
    queryFn: () => apiClient.get<SettingsHealth>("/inventory/settings/health"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useExpireStaleReservations() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationKey: ["inventory", "settings", "expire-reservations"],
    mutationFn: () =>
      apiClient.post<void>(
        "/inventory/settings/maintenance/expire-reservations",
        undefined,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.reservations() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useImportPreview() {
  return useMutation<ImportPreviewResult, Error, FormData>({
    mutationKey: ["inventory", "import", "preview"],
    mutationFn: (formData) =>
      apiClient.upload<ImportPreviewResult>("/inventory/import/preview", formData),
  });
}

/*
 * `useCreateImportJob` was removed here.
 *
 * It posted to the single-shot `POST /inventory/import/jobs`, which takes the
 * whole file in one body, and the only caller handed it `preview.sample` — the
 * backend's own `rows.slice(0, 20)`. Importing five thousand products applied
 * twenty of them under a job that reported COMPLETED. The staged routes
 * (`hooks/api/inventory/staged-import.ts`) replace it rather than sit beside it:
 * they take the file in chunks, resume from the next unprocessed row, and can
 * say which lines were rejected and why.
 */

export function useImportJobs(params?: { page?: number }) {
  const canView = useCan("inventory:import");
  return useQuery<ImportJobListResponse, Error>({
    queryKey: queryKeys.inventory.importJobs(params),
    queryFn: () =>
      apiClient.get<ImportJobListResponse>("/inventory/import/jobs", {
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useImportJob(id: number, refetchInterval?: number | false) {
  const canView = useCan("inventory:import");
  return useQuery<ImportJobDetail, Error>({
    queryKey: queryKeys.inventory.importJob(id),
    queryFn: () => apiClient.get<ImportJobDetail>(`/inventory/import/jobs/${id}`),
    enabled: canView && id > 0,
    staleTime: 15_000,
    ...(refetchInterval !== undefined ? { refetchInterval } : {}),
  });
}

export type ExportType = "products" | "stock" | "movements" | "reorder" | "valuation" | "lots-serials";

export interface ExportJob {
  id: number;
  orgId: string;
  jobType: ExportType;
  status: JobStatus;
  fileName: string | null;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[] | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}


interface CreateExportJobInput {
  exportType: ExportType;
  filters?: Record<string, unknown>;
}

export function useCreateExportJob() {
  const qc = useQueryClient();
  return useIdempotentMutation<ExportJob, Error, CreateExportJobInput>({
    mutationKey: ["inventory", "export", "job", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<ExportJob>("/inventory/export/jobs", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.exportJobs() });
    },
  });
}

export function useDownloadExportJob() {
  return useMutation<Blob, Error, number>({
    mutationKey: ["inventory", "export", "job", "download"],
    mutationFn: (jobId) => apiClient.download(`/inventory/export/jobs/${jobId}/download`),
  });
}

