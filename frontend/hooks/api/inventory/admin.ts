"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { JobStatus } from "@/features/inventory/lib";

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
  return useQuery<InventorySettings, Error>({
    queryKey: queryKeys.inventory.settings(),
    queryFn: () => apiClient.get<InventorySettings>("/inventory/settings"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateInventorySettings() {
  const qc = useQueryClient();
  return useMutation<InventorySettings, Error, Partial<InventorySettings>>({
    mutationKey: ["inventory", "settings", "update"],
    mutationFn: (data) => apiClient.patch<InventorySettings>("/inventory/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.settings() });
    },
  });
}

export function useNumberSequences() {
  return useQuery<NumberSequence[], Error>({
    queryKey: queryKeys.inventory.numberSequences(),
    queryFn: () => apiClient.get<NumberSequence[]>("/inventory/settings/number-sequences"),
    staleTime: 5 * 60_000,
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
  return useQuery<SettingsHealth, Error>({
    queryKey: [...queryKeys.inventory.settings(), "health"],
    queryFn: () => apiClient.get<SettingsHealth>("/inventory/settings/health"),
    staleTime: 30_000,
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
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.settings() });
    },
  });
}

export function useBarcodeLookup(code: string) {
  return useQuery<BarcodeLookupResult, Error>({
    queryKey: queryKeys.inventory.barcodeLookup(code),
    queryFn: () =>
      apiClient.get<BarcodeLookupResult>("/inventory/barcode/lookup", { code }),
    enabled: code.length > 0,
    staleTime: 2 * 60_000,
  });
}

export function useImportPreview() {
  return useMutation<ImportPreviewResult, Error, FormData>({
    mutationKey: ["inventory", "import", "preview"],
    mutationFn: (formData) =>
      apiClient.upload<ImportPreviewResult>("/inventory/import/preview", formData),
  });
}

export function useCreateImportJob() {
  const qc = useQueryClient();
  return useMutation<ImportJobDetail, Error, { importType: string; rows?: Record<string, unknown>[] }>({
    mutationKey: ["inventory", "import", "job", "create"],
    mutationFn: (data) => apiClient.post<ImportJobDetail>("/inventory/import/jobs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.importJobs() });
    },
  });
}

export function useImportJobs(params?: { page?: number }) {
  return useQuery<ImportJobListResponse, Error>({
    queryKey: queryKeys.inventory.importJobs(params),
    queryFn: () =>
      apiClient.get<ImportJobListResponse>("/inventory/import/jobs", {
        ...(params?.page !== undefined ? { page: String(params.page) } : {}),
      }),
    staleTime: 30_000,
  });
}

export function useImportJob(id: number, refetchInterval?: number | false) {
  return useQuery<ImportJobDetail, Error>({
    queryKey: queryKeys.inventory.importJob(id),
    queryFn: () => apiClient.get<ImportJobDetail>(`/inventory/import/jobs/${id}`),
    enabled: id > 0,
    staleTime: 15_000,
    ...(refetchInterval !== undefined ? { refetchInterval } : {}),
  });
}

