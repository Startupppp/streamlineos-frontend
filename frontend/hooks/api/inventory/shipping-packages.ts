"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PackageStatus } from "@/features/inventory/lib";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

/**
 * B6. These are the column names the API actually returns and accepts.
 *
 * They were declared as `variantId`/`qty`, which the backend's strict Zod
 * schemas reject outright on the way in and never emit on the way out — so
 * every package line rendered blank and every line save came back 400. A
 * contract that does not match is not a smaller contract, it is a broken one.
 */
export interface PackageLine {
  id: number;
  productVariantId: number;
  lotId?: number | null;
  serialId?: number | null;
  quantity: string;
}

export interface PackageWriteLine {
  productVariantId: number;
  lotId?: number;
  serialId?: number;
  quantity: string;
}

export interface Package {
  id: number;
  orgId: string;
  status: PackageStatus;
  packageNumber: string;
  shipmentId?: number | null;
  soId?: number | null;
  cartonTypeId?: number | null;
  lines?: PackageLine[];
  createdAt: string;
  updatedAt: string;
}

type PackageListResponse = {
  items: Package[];
  total: number;
  page: number;
  totalPages: number;
};

interface PackageQueryParams {
  [key: string]: unknown;
  shipmentId?: number;
  soId?: number;
  status?: PackageStatus;
  page?: number;
  limit?: number;
}

export function usePackages(params?: PackageQueryParams) {
  const canView = useCan("inventory:packages:manage");
  return useQuery<PackageListResponse, Error>({
    queryKey: queryKeys.inventory.packages(params),
    queryFn: () =>
      apiClient.get<PackageListResponse>("/inventory/packages", {
        ...(params?.shipmentId ? { shipmentId: String(params.shipmentId) } : {}),
        ...(params?.soId ? { soId: String(params.soId) } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function usePackageDetail(packageId: number) {
  const canView = useCan("inventory:packages:manage");
  return useQuery<Package, Error>({
    queryKey: queryKeys.inventory.packageDetail(packageId),
    queryFn: () => apiClient.get<Package>(`/inventory/packages/${packageId}`),
    enabled: canView && packageId > 0,
    staleTime: 60_000,
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    Package,
    Error,
    { shipmentId?: number; soId?: number; cartonTypeId?: number; lines?: PackageWriteLine[] }
  >({
    mutationKey: ["inventory", "package", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Package>("/inventory/packages", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
    },
  });
}

export function useUpdatePackageLines() {
  const qc = useQueryClient();
  return useMutation<Package, Error, { packageId: number; lines: PackageWriteLine[] }>({
    mutationKey: ["inventory", "package", "lines", "update"],
    mutationFn: ({ packageId, lines }) =>
      apiClient.patch<Package>(`/inventory/packages/${packageId}/lines`, { lines }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(vars.packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.reconciliation(vars.packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
    },
  });
}

export function useClosePackage() {
  const qc = useQueryClient();
  return useIdempotentMutation<Package, Error, { packageId: number; cartonTypeId?: number }>({
    mutationKey: ["inventory", "package", "close"],
    mutationFn: ({ packageId, ...body }, idempotencyKey) =>
      apiClient.post<Package>(`/inventory/packages/${packageId}/close`, body, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(vars.packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.reconciliation(vars.packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
    },
  });
}

export function useReopenPackage() {
  const qc = useQueryClient();
  return useIdempotentMutation<Package, Error, number>({
    mutationKey: ["inventory", "package", "reopen"],
    mutationFn: (packageId, idempotencyKey) =>
      apiClient.post<Package>(`/inventory/packages/${packageId}/reopen`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, packageId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packageDetail(packageId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.reconciliation(packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.packing.queueList });
    },
  });
}
