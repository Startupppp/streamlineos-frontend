"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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
  const { costPrice, sellingPrice, reorderPoint, sku, ...rest } = data;
  const trimmedSku = typeof sku === "string" ? sku.trim() : sku;
  return {
    ...rest,
    ...(trimmedSku ? { sku: trimmedSku } : {}),
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
  const canView = useCan("inventory:products:read");
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
    enabled: canView,
  });
}

export function useProduct(productId: number) {
  const canView = useCan("inventory:products:read");
  return useQuery<InventoryProduct, Error>({
    queryKey: queryKeys.inventory.product(productId),
    queryFn: () => apiClient.get<InventoryProduct>(`/inventory/products/${productId}`),
    enabled: canView && productId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCategories() {
  const canView = useCan("inventory:products:read");
  return useQuery<InventoryCategory[], Error>({
    queryKey: queryKeys.inventory.categories(),
    queryFn: () => apiClient.get<InventoryCategory[]>("/inventory/products/categories"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useUom() {
  const canView = useCan("inventory:products:read");
  return useQuery<InventoryUom[], Error>({
    queryKey: queryKeys.inventory.uom(),
    queryFn: () => apiClient.get<InventoryUom[]>("/inventory/products/uom"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<InventoryProduct, Error, CreateProductInput>({
    mutationKey: ["inventory", "product", "create"],
    mutationFn: (data) =>
      apiClient.post<InventoryProduct>("/inventory/products", serializeProductWrite(data)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
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
    onSuccess: (_, vars) => {
      const resolvedId = id ?? vars.productId;
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
      if (resolvedId !== undefined) {
        void qc.invalidateQueries({ queryKey: queryKeys.inventory.product(resolvedId) });
      }
    },
  });
}

/**
 * The lifecycle writes invalidate `inventory.all`, not `inventory.products()`.
 * The list factory takes a filters argument, so calling it with none yields a
 * key ending in an explicit `undefined`, which `partialMatchKey` compares
 * against the stored filters object and rejects — the list never refetched. The
 * wider prefix is also the honest one: archiving a SKU changes what every order
 * form, variant picker and stock view is allowed to show.
 */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["inventory", "product", "delete"],
    mutationFn: (productId) =>
      apiClient.delete<void>(`/inventory/products/${productId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.productsList });
    },
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation<InventoryProduct, Error, number>({
    mutationKey: ["inventory", "product", "archive"],
    mutationFn: (productId) =>
      apiClient.post<InventoryProduct>(`/inventory/products/${productId}/archive`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.productsList });
    },
  });
}

export function useRestoreProduct() {
  const qc = useQueryClient();
  return useMutation<InventoryProduct, Error, number>({
    mutationKey: ["inventory", "product", "restore"],
    mutationFn: (productId) =>
      apiClient.post<InventoryProduct>(`/inventory/products/${productId}/restore`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.productsList });
    },
  });
}

export function useProductVariants(filters?: ProductVariantFilters) {
  const canView = useCan("inventory:products:read");
  return useQuery<ProductVariantFlat[], Error>({
    queryKey: queryKeys.inventory.productVariants(filters),
    queryFn: () =>
      apiClient.get<ProductVariantFlat[]>("/inventory/products/variants", {
        ...(filters?.activeOnly ? { activeOnly: "true" } : {}),
      }),
    staleTime: 2 * 60_000,
    enabled: canView,
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
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.productVariants() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.categories() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.uom() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.categories() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}
