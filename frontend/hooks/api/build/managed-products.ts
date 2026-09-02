"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  ManagedProduct,
  ManagedProductsPage,
  CreateManagedProductInput,
  UpdateManagedProductInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface ListManagedProductsParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export function useManagedProducts(params?: ListManagedProductsParams) {
  const canView = useCan("build:managed-products:view");
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams["cursor"] = params.cursor;
  if (params?.limit) queryParams["limit"] = String(params.limit);
  if (params?.status) queryParams["status"] = params.status;

  return useQuery<ManagedProductsPage>({
    queryKey: queryKeys.projects.managedProducts.list(
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProductsPage>("/build/managed-products", queryParams, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useManagedProduct(managedProductId: number) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ManagedProduct>({
    queryKey: queryKeys.projects.managedProducts.detail(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProduct>(`/build/managed-products/${managedProductId}`, undefined, signal),
    enabled: canView && !!managedProductId,
    staleTime: 60_000,
  });
}

export function useCreateManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:create", {
    mutationKey: ["projects", "managed-products", "create"],
    mutationFn: (data: CreateManagedProductInput) =>
      apiClient.post<ManagedProduct>("/build/managed-products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.managedProducts.list() });
    },
  });
}

export function useUpdateManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", "update"],
    mutationFn: ({
      managedProductId,
      ...data
    }: UpdateManagedProductInput & { managedProductId: number }) =>
      apiClient.patch<ManagedProduct>(
        `/build/managed-products/${managedProductId}`,
        data,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.managedProducts.list() });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.managedProducts.detail(vars.managedProductId),
      });
    },
  });
}

export function useDeleteManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:delete", {
    mutationKey: ["projects", "managed-products", "delete"],
    mutationFn: (managedProductId: number) =>
      apiClient.delete<void>(`/build/managed-products/${managedProductId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.managedProducts.list() });
    },
  });
}
