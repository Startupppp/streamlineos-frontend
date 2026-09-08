"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { JobStatus } from "@/features/inventory/lib";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const invSettingsContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.invSettingsContract),
);
const numberSequencesArrayContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.numberSequencesArrayContract),
);
const updateNumberSequenceContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.updateNumberSequenceContract),
);
const healthContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.healthContract),
);
const barcodeLookupContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.barcodeLookupContract),
);
const importPreviewContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.importPreviewContract),
);
const importJobDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.importJobDetailContract),
);
const listImportJobsContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.listImportJobsContract),
);
const createExportJobContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.createExportJobContract),
);
const expireReservationsContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.expireReservationsContract),
);

export interface InventorySettings {
  allowNegativeStock: boolean;
  allowBackorders: boolean;
  reservationStrategy: string;
  defaultCostingMethod: string;
  expiryReservationPolicy: string;
  inspectionOnReceipt: boolean;
  inspectionOnReturn: boolean;
  overReceiptTolerancePct: string;
  requirePoApproval: boolean;
  adjustmentApprovalThreshold: string | null;
  autoReserveOnConfirm: boolean;
  allowPartialShipment: boolean;
  packageRequiredForShipping: boolean;
  channelPublishPolicy: string | null;
}

export interface NumberSequence {
  id?: number;
  orgId?: string;
  docType: string;
  prefix: string;
  nextNumber: number;
  padding: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SettingsHealth {
  ledgerReconciliation: {
    sampleSize: number;
    transactionCount: number;
    status: string;
  };
  activeExpiredReservations: number;
  failedImportJobs: number;
  failedExportJobs: number;
  failedWebhookEvents: number;
  failedChannelPublications: number;
}

export type BarcodeLookupResult =
  | { type: "product"; productId: number; productName: string; sku: string }
  | { type: "variant"; variantId: number; productName: string; variantSku: string; barcode: string }
  | { type: "lot"; lotId: number; lotNumber: string; variantSku: string; productName: string }
  | { type: "serial"; serialId: number; serialNumber: string; variantSku: string; productName: string }
  | { type: "location"; locationId: number; locationName: string; warehouseName: string }
  | { type: "not_found" };

export interface ImportPreviewResult {
  columns: string[];
  mappedFields: Record<string, string>;
  validRows: number;
  errors: { row: number; field: string; message: string }[];
  sample: Record<string, unknown>[];
}

interface ImportJobListItem {
  id: number;
  orgId: string;
  jobType: string;
  status: string;
  fileName: string | null;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[] | null;
  createdBy: string;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ImportJobDetail extends ImportJobListItem {}

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
    queryFn: ({ signal }) => apiClient.get<InventorySettings>("/inventory/settings", undefined, signal, invSettingsContract),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useUpdateInventorySettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InventorySettings, Error, Partial<InventorySettings>>("inventory:settings:manage", {
    mutationKey: ["inventory", "settings", "update"],
    mutationFn: (data) => apiClient.patch<InventorySettings>("/inventory/settings", data, undefined, invSettingsContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.settings() });
    },
  });
}

export function useNumberSequences() {
  const canView = useCan("inventory:settings:manage");
  return useQuery<NumberSequence[], Error>({
    queryKey: queryKeys.inventory.numberSequences(),
    queryFn: ({ signal }) => apiClient.get<NumberSequence[]>("/inventory/settings/number-sequences", undefined, signal, numberSequencesArrayContract),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useUpdateNumberSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    NumberSequence,
    Error,
    { sequenceId: number; data: { prefix?: string; padding?: number; nextNumber?: number } }
  >("inventory:settings:manage", {
    mutationKey: ["inventory", "settings", "numberSequence", "update"],
    mutationFn: ({ sequenceId, data }) =>
      apiClient.patch<NumberSequence>(
        `/inventory/settings/number-sequences/${sequenceId}`,
        data,
        undefined,
        updateNumberSequenceContract,
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
    queryFn: ({ signal }) => apiClient.get<SettingsHealth>("/inventory/settings/health", undefined, signal, healthContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useExpireStaleReservations() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ expired: number }, Error, void>("inventory:settings:manage", {
    mutationKey: ["inventory", "settings", "expire-reservations"],
    mutationFn: () =>
      apiClient.post<{ expired: number }>(
        "/inventory/settings/maintenance/expire-reservations",
        undefined,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        expireReservationsContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.reservations() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useBarcodeLookup(code: string) {
  const canView = useCan("inventory:stock:read");
  return useQuery<BarcodeLookupResult, Error>({
    queryKey: queryKeys.inventory.barcodeLookup(code),
    queryFn: ({ signal }) =>
      apiClient.get<BarcodeLookupResult>("/inventory/barcode/lookup", { code }, signal, barcodeLookupContract),
    enabled: canView && code.length > 0,
    staleTime: 2 * 60_000,
  });
}

export function useImportPreview() {
  return useAuthorizedMutation<ImportPreviewResult, Error, FormData>("inventory:import", {
    mutationKey: ["inventory", "import", "preview"],
    mutationFn: (formData) =>
      apiClient.upload<ImportPreviewResult>("/inventory/import/preview", formData, importPreviewContract),
  });
}

export function useCreateImportJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ImportJobDetail, Error, { importType: string; rows?: Record<string, unknown>[] }>("inventory:import", {
    mutationKey: ["inventory", "import", "job", "create"],
    mutationFn: (data) => apiClient.post<ImportJobDetail>("/inventory/import/jobs", data, undefined, importJobDetailContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.importJobs() });
    },
  });
}

export function useImportJobs(params?: { page?: number }) {
  const canView = useCan("inventory:import");
  return useQuery<ImportJobListResponse, Error>({
    queryKey: queryKeys.inventory.importJobs(params),
    queryFn: ({ signal }) =>
      apiClient.get<ImportJobListResponse>("/inventory/import/jobs", {
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
      }, signal, listImportJobsContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useImportJob(id: number, refetchInterval?: number | false) {
  const canView = useCan("inventory:import");
  return useQuery<ImportJobDetail, Error>({
    queryKey: queryKeys.inventory.importJob(id),
    queryFn: ({ signal }) => apiClient.get<ImportJobDetail>(`/inventory/import/jobs/${id}`, undefined, signal, importJobDetailContract),
    enabled: canView && id > 0,
    staleTime: 15_000,
    ...(refetchInterval !== undefined ? { refetchInterval } : {}),
  });
}

export type ExportType = "products" | "stock" | "movements" | "reorder" | "valuation" | "lots-serials";

export interface ExportJob {
  id: number;
  orgId: string;
  jobType: string;
  status: string;
  fileName: string | null;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[] | null;
  createdBy: string;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateExportJobInput {
  exportType: ExportType;
  filters?: Record<string, unknown>;
}

export function useCreateExportJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ExportJob, Error, CreateExportJobInput>("inventory:export", {
    mutationKey: ["inventory", "export", "job", "create"],
    mutationFn: (data) => apiClient.post<ExportJob>("/inventory/export/jobs", data, undefined, createExportJobContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.exportJobs() });
    },
  });
}

export function useDownloadExportJob() {
  return useAuthorizedMutation<Blob, Error, number>("inventory:export", {
    mutationKey: ["inventory", "export", "job", "download"],
    mutationFn: (jobId) => apiClient.download(`/inventory/export/jobs/${jobId}/download`),
  });
}
