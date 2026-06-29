"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  InventoryProduct,
  InventoryCategory,
  InventoryUom,
  InventoryProductVariant,
  ProductVariantFlat,
  ProductStatus,
  CreateProductInput,
  UpdateProductInput,
  CreateProductVariantInput,
} from "@/types/inventory";

interface ProductFilters {
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
  status?: ProductStatus;
}

interface ProductListResponse {
  items: InventoryProduct[];
  total: number;
  page: number;
  totalPages: number;
}

type UpdateProductPayload = UpdateProductInput & { productId?: number };

interface CreateCategoryInput {
  name: string;
  description?: string;
  parentCategoryId?: number;
}

interface CreateUomInput {
  name: string;
  abbreviation: string;
}

interface ProductVariantFilters {
  activeOnly?: boolean;
}

function serializeProductWrite(data: CreateProductInput | UpdateProductInput) {
  const { costPrice, sellingPrice, reorderPoint, ...rest } = data;
  return {
    ...rest,
    ...(costPrice !== undefined ? { costPrice: costPrice.toFixed(4) } : {}),
    ...(sellingPrice !== undefined ? { sellingPrice: sellingPrice.toFixed(4) } : {}),
    ...(reorderPoint !== undefined ? { reorderPoint: reorderPoint.toFixed(4) } : {}),
  };
}

function serializeVariantWrite(data: CreateProductVariantInput) {
  const { costPrice, sellingPrice, ...rest } = data;
  return {
    ...rest,
    ...(costPrice !== undefined ? { costPrice: costPrice.toFixed(4) } : {}),
    ...(sellingPrice !== undefined ? { sellingPrice: sellingPrice.toFixed(4) } : {}),
  };
}

export function useProducts(filters?: ProductFilters) {
  return useQuery<ProductListResponse, Error>({
    queryKey: queryKeys.inventory.products(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<ProductListResponse>("/inventory/products", {
        ...(filters?.categoryId ? { categoryId: String(filters.categoryId) } : {}),
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useProduct(productId: number) {
  return useQuery<InventoryProduct, Error>({
    queryKey: queryKeys.inventory.product(productId),
    queryFn: () => apiClient.get<InventoryProduct>(`/inventory/products/${productId}`),
    enabled: productId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCategories() {
  return useQuery<InventoryCategory[], Error>({
    queryKey: queryKeys.inventory.categories(),
    queryFn: () => apiClient.get<InventoryCategory[]>("/inventory/products/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useUom() {
  return useQuery<InventoryUom[], Error>({
    queryKey: queryKeys.inventory.uom(),
    queryFn: () => apiClient.get<InventoryUom[]>("/inventory/products/uom"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<InventoryProduct, Error, CreateProductInput>({
    mutationFn: (data) =>
      apiClient.post<InventoryProduct>("/inventory/products", serializeProductWrite(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateProduct(id?: number) {
  const qc = useQueryClient();
  return useMutation<InventoryProduct, Error, UpdateProductPayload>({
    mutationFn: ({ productId, ...data }) => {
      const resolvedId = id ?? productId;
      if (resolvedId === undefined) throw new Error("Product id is required");
      return apiClient.patch<InventoryProduct>(
        `/inventory/products/${resolvedId}`,
        serializeProductWrite(data),
      );
    },
    onSuccess: (_res, vars) => {
      const resolvedId = id ?? vars.productId;
      qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
      if (resolvedId !== undefined) {
        qc.invalidateQueries({ queryKey: queryKeys.inventory.product(resolvedId) });
      }
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (productId) =>
      apiClient.delete<void>(`/inventory/products/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
    },
  });
}

export function useProductVariants(filters?: ProductVariantFilters) {
  return useQuery<ProductVariantFlat[], Error>({
    queryKey: queryKeys.inventory.productVariants(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<ProductVariantFlat[]>("/inventory/products/variants", {
        ...(filters?.activeOnly ? { activeOnly: "true" } : {}),
      }),
    staleTime: 2 * 60_000,
  });
}

export function useCreateProductVariant(productId: number) {
  const qc = useQueryClient();
  return useMutation<InventoryProductVariant, Error, CreateProductVariantInput>({
    mutationFn: (data) =>
      apiClient.post<InventoryProductVariant>(
        `/inventory/products/${productId}/variants`,
        serializeVariantWrite(data),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.productVariants() });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<InventoryCategory, Error, CreateCategoryInput>({
    mutationFn: (data) =>
      apiClient.post<InventoryCategory>("/inventory/products/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.categories() });
    },
  });
}

export function useCreateUom() {
  const qc = useQueryClient();
  return useMutation<InventoryUom, Error, CreateUomInput>({
    mutationFn: (data) =>
      apiClient.post<InventoryUom>("/inventory/products/uom", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.uom() });
    },
  });
}
