"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  InventoryProduct,
  InventoryCategory,
  InventoryUom,
  InventoryProductVariant,
  ProductVariantFlat,
  ProductStatus,
  ProductType,
  CreateProductInput,
  UpdateProductInput,
  CreateProductVariantInput,
  CreateUomInput,
} from "@/types/inventory";

interface ProductFilters {
  [key: string]: unknown;
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
  status?: ProductStatus;
  productType?: ProductType;
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

interface ProductVariantFilters {
  [key: string]: unknown;
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
    queryKey: queryKeys.inventory.products(filters),
    queryFn: () =>
      apiClient.get<ProductListResponse>("/inventory/products", {
        ...(filters?.categoryId ? { categoryId: String(filters.categoryId) } : {}),
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.productType ? { productType: filters.productType } : {}),
      }),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
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
    mutationKey: ["inventory", "product", "create"],
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
    mutationKey: ["inventory", "product", "update"],
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
    mutationKey: ["inventory", "product", "delete"],
    mutationFn: (productId) =>
      apiClient.delete<void>(`/inventory/products/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
    },
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation<InventoryProduct, Error, number>({
    mutationKey: ["inventory", "product", "archive"],
    mutationFn: (productId) =>
      apiClient.post<InventoryProduct>(`/inventory/products/${productId}/archive`, {}),
    onSuccess: (_res, productId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}

export function useRestoreProduct() {
  const qc = useQueryClient();
  return useMutation<InventoryProduct, Error, number>({
    mutationKey: ["inventory", "product", "restore"],
    mutationFn: (productId) =>
      apiClient.post<InventoryProduct>(`/inventory/products/${productId}/restore`, {}),
    onSuccess: (_res, productId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}

export function useProductVariants(filters?: ProductVariantFilters) {
  return useQuery<ProductVariantFlat[], Error>({
    queryKey: queryKeys.inventory.productVariants(filters),
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
    mutationKey: ["inventory", "product", productId, "variant", "create"],
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
    mutationKey: ["inventory", "category", "create"],
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
    mutationKey: ["inventory", "uom", "create"],
    mutationFn: (data) =>
      apiClient.post<InventoryUom>("/inventory/products/uom", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.uom() });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { categoryId: number; data: { name?: string; parentCategoryId?: number | null; description?: string | null; isActive?: boolean } }
  >({
    mutationKey: ["inventory", "category", "update"],
    mutationFn: ({ categoryId, data }) =>
      apiClient.patch(`/inventory/products/categories/${categoryId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.categories() });
    },
  });
}

export function useUpdateProductVariant(productId: number) {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { variantId: number; data: { name?: string; sku?: string; barcode?: string; costPrice?: string; sellingPrice?: string; isActive?: boolean } }
  >({
    mutationKey: ["inventory", "product", productId, "variant", "update"],
    mutationFn: ({ variantId, data }) =>
      apiClient.patch(`/inventory/products/${productId}/variants/${variantId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}
