"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { Product, CreateProductInput, UpdateProductInput, ProductsResponse } from "@/types/crm/products";

export function useProducts(search?: string) {
  const canManage = useCan("crm:products:manage");
  return useQuery({
    queryKey: queryKeys.crmProducts.list(search ? { search } : undefined),
    queryFn: () => apiClient.get<ProductsResponse>("/crm/products", search ? { search } : undefined),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canManage,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "products", "create"],
    mutationFn: (input: CreateProductInput) => apiClient.post<Product>("/crm/products", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmProducts.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
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
  return useMutation({
    mutationKey: ["crm", "products", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/crm/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmProducts.all });
    },
  });
}
