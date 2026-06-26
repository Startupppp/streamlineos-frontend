"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface ProductFilters {
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

interface ProductsResponse {
  items: unknown[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateProductInput {
  name: string;
  sku: string;
  categoryId?: number;
  uomId?: number;
  description?: string;
  costPrice?: number;
  sellingPrice?: number;
  reorderPoint?: number;
  reorderQty?: number;
  isActive?: boolean;
}

interface UpdateProductInput extends Partial<CreateProductInput> {
  productId: number;
}

interface CreateCategoryInput {
  name: string;
  description?: string;
  parentId?: number;
}

interface CreateUomInput {
  name: string;
  abbreviation: string;
}

export function useProducts(filters?: ProductFilters) {
  return useQuery<ProductsResponse, Error>({
    queryKey: queryKeys.inventory.products(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<ProductsResponse>("/inventory/products", {
        ...(filters?.categoryId ? { categoryId: String(filters.categoryId) } : {}),
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
        ...(filters?.isActive !== undefined ? { isActive: String(filters.isActive) } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useProduct(productId: number) {
  return useQuery<unknown, Error>({
    queryKey: queryKeys.inventory.product(productId),
    queryFn: () => apiClient.get<unknown>(`/inventory/products/${productId}`),
    enabled: productId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCategories() {
  return useQuery<unknown[], Error>({
    queryKey: queryKeys.inventory.categories(),
    queryFn: () => apiClient.get<unknown[]>("/inventory/products/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useUom() {
  return useQuery<unknown[], Error>({
    queryKey: queryKeys.inventory.uom(),
    queryFn: () => apiClient.get<unknown[]>("/inventory/products/uom"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateProductInput>({
    mutationFn: (data) => apiClient.post<unknown>("/inventory/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, UpdateProductInput>({
    mutationFn: ({ productId, ...data }) =>
      apiClient.patch<unknown>(`/inventory/products/${productId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.product(vars.productId) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (productId) =>
      apiClient.delete<{ success: boolean }>(`/inventory/products/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateCategoryInput>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/products/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.categories() });
    },
  });
}

export function useCreateUom() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateUomInput>({
    mutationFn: (data) =>
      apiClient.post<unknown>("/inventory/products/uom", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.uom() });
    },
  });
}
