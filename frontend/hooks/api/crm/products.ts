"use client";

import { useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { Product, CreateProductInput, UpdateProductInput, ProductsResponse } from "@/types/crm/products";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const crmProductsLazy = lazyContract(() =>
  import("@/hooks/api/crm/products-schema").then((m) => m.crmProductsListContract),
);

export function useProducts(search?: string) {
  return useGatedQuery("crm:products:manage", {
    queryKey: queryKeys.crmProducts.list(search ? { search } : undefined),
    queryFn: ({ signal }) => apiClient.get<ProductsResponse>("/crm/products", search ? { search } : undefined, signal, crmProductsLazy),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:products:manage", {
    mutationKey: ["crm", "products", "create"],
    mutationFn: (input: CreateProductInput) => apiClient.post<Product>("/crm/products", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmProducts.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:products:manage", {
    mutationKey: ["crm", "products", "update"],
    mutationFn: ({ id, ...data }: UpdateProductInput) =>
      apiClient.patch<Product>(`/crm/products/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmProducts.all });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:products:manage", {
    mutationKey: ["crm", "products", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/crm/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmProducts.all });
    },
  });
}
