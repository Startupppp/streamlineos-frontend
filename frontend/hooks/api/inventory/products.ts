"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  ProductStatus,
  ProductType,
  CreateProductInput,
  UpdateProductInput,
  CreateProductVariantInput,
  CreateUomInput,
} from "@/types/inventory";
import type {
  InvUomShape,
  InvCategoryShape,
  InvProductVariantShape,
  InvProductBaseShape,
  InvProductShape,
  InvProductListShape,
  InvVariantListShape,
  InvVariantFlatShape,
} from "@/hooks/api/inventory/products-schema";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface ProductFilters {
  [key: string]: unknown;
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
  status?: ProductStatus;
  productType?: ProductType;
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

const listProductsContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.listProductsContract),
);
const getProductContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.getProductContract),
);
const invProductBaseResultContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.invProductBaseContract),
);
const listCategoriesContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.listCategoriesContract),
);
const listUomContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.listUomContract),
);
const listVariantsContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.listVariantsContract),
);
const invProductVariantContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.invProductVariantContract),
);
const invCategoryContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.invCategoryContract),
);
const invUomContract = lazyContract(() =>
  import("@/hooks/api/inventory/products-schema").then((m) => m.invUomContract),
);

export type {
  InvUomShape,
  InvCategoryShape,
  InvProductVariantShape,
  InvProductBaseShape,
  InvProductShape,
  InvProductListShape,
  InvVariantListShape,
  InvVariantFlatShape,
};

export function useProducts(filters?: ProductFilters) {
  const canView = useCan("inventory:products:read");
  return useQuery<InvProductListShape, Error>({
    queryKey: queryKeys.inventory.products(filters),
    queryFn: ({ signal }) =>
      apiClient.get<InvProductListShape>("/inventory/products", {
        ...(filters?.categoryId ? { categoryId: String(filters.categoryId) } : {}),
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.productType ? { productType: filters.productType } : {}),
      }, signal, listProductsContract),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useProduct(productId: number) {
  const canView = useCan("inventory:products:read");
  return useQuery<InvProductShape, Error>({
    queryKey: queryKeys.inventory.product(productId),
    queryFn: ({ signal }) => apiClient.get<InvProductShape>(`/inventory/products/${productId}`, undefined, signal, getProductContract),
    enabled: canView && productId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCategories() {
  const canView = useCan("inventory:products:read");
  return useQuery<InvCategoryShape[], Error>({
    queryKey: queryKeys.inventory.categories(),
    queryFn: ({ signal }) => apiClient.get<InvCategoryShape[]>("/inventory/products/categories", undefined, signal, listCategoriesContract),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useUom() {
  const canView = useCan("inventory:products:read");
  return useQuery<InvUomShape[], Error>({
    queryKey: queryKeys.inventory.uom(),
    queryFn: ({ signal }) => apiClient.get<InvUomShape[]>("/inventory/products/uom", undefined, signal, listUomContract),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvProductBaseShape, Error, CreateProductInput>("inventory:products:create", {
    mutationKey: ["inventory", "product", "create"],
    mutationFn: (data) =>
      apiClient.post<InvProductBaseShape>("/inventory/products", serializeProductWrite(data), undefined, invProductBaseResultContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
    },
  });
}

export function useUpdateProduct(id?: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvProductBaseShape, Error, UpdateProductPayload>("inventory:products:update", {
    mutationKey: ["inventory", "product", "update"],
    mutationFn: ({ productId, ...data }) => {
      const resolvedId = id ?? productId;
      if (resolvedId === undefined) throw new Error("Product id is required");
      return apiClient.patch<InvProductBaseShape>(
        `/inventory/products/${resolvedId}`,
        serializeProductWrite(data),
        undefined,
        invProductBaseResultContract,
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

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("inventory:products:delete", {
    mutationKey: ["inventory", "product", "delete"],
    mutationFn: (productId) =>
      apiClient.delete<void>(`/inventory/products/${productId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
    },
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvProductBaseShape, Error, number>("inventory:products:update", {
    mutationKey: ["inventory", "product", "archive"],
    mutationFn: (productId) =>
      apiClient.post<InvProductBaseShape>(`/inventory/products/${productId}/archive`, {}, undefined, invProductBaseResultContract),
    onSuccess: (_, productId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}

export function useRestoreProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvProductBaseShape, Error, number>("inventory:products:update", {
    mutationKey: ["inventory", "product", "restore"],
    mutationFn: (productId) =>
      apiClient.post<InvProductBaseShape>(`/inventory/products/${productId}/restore`, {}, undefined, invProductBaseResultContract),
    onSuccess: (_, productId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.products() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}

export function useProductVariants(filters?: ProductVariantFilters) {
  const canView = useCan("inventory:products:read");
  return useQuery<InvVariantFlatShape[], Error>({
    queryKey: queryKeys.inventory.productVariants(filters),
    queryFn: async ({ signal }) =>
      (await apiClient.get<InvVariantListShape>("/inventory/products/variants", {
        ...(filters?.activeOnly ? { activeOnly: "true" } : {}),
      }, signal, listVariantsContract)).items,
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCreateProductVariant(productId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvProductVariantShape, Error, CreateProductVariantInput>("inventory:products:update", {
    mutationKey: ["inventory", "product", productId, "variant", "create"],
    mutationFn: (data) =>
      apiClient.post<InvProductVariantShape>(
        `/inventory/products/${productId}/variants`,
        serializeVariantWrite(data),
        undefined,
        invProductVariantContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.productVariants() });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvCategoryShape, Error, CreateCategoryInput>("inventory:products:create", {
    mutationKey: ["inventory", "category", "create"],
    mutationFn: (data) =>
      apiClient.post<InvCategoryShape>("/inventory/products/categories", data, undefined, invCategoryContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.categories() });
    },
  });
}

export function useCreateUom() {
  const qc = useQueryClient();
  return useAuthorizedMutation<InvUomShape, Error, CreateUomInput>("inventory:products:create", {
    mutationKey: ["inventory", "uom", "create"],
    mutationFn: (data) =>
      apiClient.post<InvUomShape>("/inventory/products/uom", data, undefined, invUomContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.uom() });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    unknown,
    Error,
    { categoryId: number; data: { name?: string; parentCategoryId?: number | null; description?: string | null; isActive?: boolean } }
  >("inventory:products:update", {
    mutationKey: ["inventory", "category", "update"],
    mutationFn: ({ categoryId, data }) =>
      apiClient.patch(`/inventory/products/categories/${categoryId}`, data, undefined, invCategoryContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.categories() });
    },
  });
}

export function useUpdateProductVariant(productId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    unknown,
    Error,
    { variantId: number; data: { name?: string; sku?: string; barcode?: string; costPrice?: string; sellingPrice?: string; isActive?: boolean } }
  >("inventory:products:update", {
    mutationKey: ["inventory", "product", productId, "variant", "update"],
    mutationFn: ({ variantId, data }) =>
      apiClient.patch(`/inventory/products/${productId}/variants/${variantId}`, data, undefined, invProductVariantContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}
