"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateProductInput,
  CreateProductVariantInput,
  CreatePurchaseOrderInput,
  CreateVendorInput,
  GoodsReceiptNote,
  InventoryCategory,
  InventoryProduct,
  InventoryProductVariant,
  InventoryUom,
  InventoryVendor,
  ProductVariantFlat,
  PurchaseOrder,
  PurchaseOrderSummary,
  ReceiveGoodsInput,
  UpdateProductInput,
  UpdateProductVariantInput,
  UpdateVendorInput,
} from "@/types/inventory";

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: number;
  search?: string;
}

export function useProducts(params: ListProductsParams = {}) {
  return useQuery<ListResponse<InventoryProduct>, Error>({
    queryKey: queryKeys.inventory.products(params),
    queryFn: () =>
      apiClient.get<ListResponse<InventoryProduct>>("/inventory/products", toQuery(params)),
    staleTime: 60_000,
  });
}

export function useProduct(productId: number) {
  return useQuery<InventoryProduct, Error>({
    queryKey: queryKeys.inventory.product(productId),
    queryFn: () => apiClient.get<InventoryProduct>(`/inventory/products/${productId}`),
    enabled: Number.isInteger(productId) && productId > 0,
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation<InventoryProduct, Error, CreateProductInput>({
    mutationFn: (data) => apiClient.post<InventoryProduct>("/inventory/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateProduct(productId: number) {
  const queryClient = useQueryClient();
  return useMutation<InventoryProduct, Error, UpdateProductInput>({
    mutationFn: (data) =>
      apiClient.patch<InventoryProduct>(`/inventory/products/${productId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
    },
  });
}

export function useProductCategories() {
  return useQuery<InventoryCategory[], Error>({
    queryKey: queryKeys.inventory.categories(),
    queryFn: () => apiClient.get<InventoryCategory[]>("/inventory/products/categories"),
    staleTime: 300_000,
  });
}

export function useProductUoms() {
  return useQuery<InventoryUom[], Error>({
    queryKey: queryKeys.inventory.uom(),
    queryFn: () => apiClient.get<InventoryUom[]>("/inventory/products/uom"),
    staleTime: 300_000,
  });
}

export function useCreateProductVariant(productId: number) {
  const queryClient = useQueryClient();
  return useMutation<InventoryProductVariant, Error, CreateProductVariantInput>({
    mutationFn: (data) =>
      apiClient.post<InventoryProductVariant>(`/inventory/products/${productId}/variants`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateProductVariant(productId: number, variantId: number) {
  const queryClient = useQueryClient();
  return useMutation<InventoryProductVariant, Error, UpdateProductVariantInput>({
    mutationFn: (data) =>
      apiClient.patch<InventoryProductVariant>(
        `/inventory/products/${productId}/variants/${variantId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.product(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export interface ListVendorsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: boolean;
}

export function useVendors(params: ListVendorsParams = {}) {
  return useQuery<ListResponse<InventoryVendor>, Error>({
    queryKey: queryKeys.inventory.vendors(params),
    queryFn: () =>
      apiClient.get<ListResponse<InventoryVendor>>("/inventory/vendors", toQuery(params)),
    staleTime: 60_000,
  });
}

export function useVendor(vendorId: number) {
  return useQuery<InventoryVendor, Error>({
    queryKey: queryKeys.inventory.vendor(vendorId),
    queryFn: () => apiClient.get<InventoryVendor>(`/inventory/vendors/${vendorId}`),
    enabled: Number.isInteger(vendorId) && vendorId > 0,
    staleTime: 60_000,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation<InventoryVendor, Error, CreateVendorInput>({
    mutationFn: (data) => apiClient.post<InventoryVendor>("/inventory/vendors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateVendor(vendorId: number) {
  const queryClient = useQueryClient();
  return useMutation<InventoryVendor, Error, UpdateVendorInput>({
    mutationFn: (data) => apiClient.patch<InventoryVendor>(`/inventory/vendors/${vendorId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export interface ListPurchaseOrdersParams {
  page?: number;
  pageSize?: number;
  status?: string;
  vendorId?: number;
}

export function usePurchaseOrders(params: ListPurchaseOrdersParams = {}) {
  return useQuery<ListResponse<PurchaseOrderSummary>, Error>({
    queryKey: queryKeys.inventory.purchaseOrders(params),
    queryFn: () =>
      apiClient.get<ListResponse<PurchaseOrderSummary>>("/inventory/purchase-orders", toQuery(params)),
    staleTime: 30_000,
  });
}

export function usePurchaseOrder(poId: number) {
  return useQuery<PurchaseOrder, Error>({
    queryKey: queryKeys.inventory.purchaseOrder(poId),
    queryFn: () => apiClient.get<PurchaseOrder>(`/inventory/purchase-orders/${poId}`),
    enabled: Number.isInteger(poId) && poId > 0,
    staleTime: 30_000,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation<PurchaseOrder, Error, CreatePurchaseOrderInput>({
    mutationFn: (data) => apiClient.post<PurchaseOrder>("/inventory/purchase-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useSendPurchaseOrder(poId: number) {
  const queryClient = useQueryClient();
  return useMutation<PurchaseOrder, Error, void>({
    mutationFn: () => apiClient.post<PurchaseOrder>(`/inventory/purchase-orders/${poId}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

export function useReceiveGoods(poId: number) {
  const queryClient = useQueryClient();
  return useMutation<GoodsReceiptNote, Error, ReceiveGoodsInput>({
    mutationFn: (data) =>
      apiClient.post<GoodsReceiptNote>(`/inventory/purchase-orders/${poId}/receive`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrder(poId) });
    },
  });
}

export function useVendorPurchaseOrders(vendorId: number) {
  return useQuery<ListResponse<PurchaseOrderSummary>, Error>({
    queryKey: queryKeys.inventory.purchaseOrders({ vendorId }),
    queryFn: () =>
      apiClient.get<ListResponse<PurchaseOrderSummary>>("/inventory/purchase-orders", {
        vendorId: String(vendorId),
      }),
    enabled: Number.isInteger(vendorId) && vendorId > 0,
    staleTime: 30_000,
  });
}

export interface ListProductVariantsParams {
  search?: string;
  activeOnly?: boolean;
}

export function useProductVariants(params: ListProductVariantsParams = {}) {
  return useQuery<ProductVariantFlat[], Error>({
    queryKey: queryKeys.inventory.products(params),
    queryFn: () =>
      apiClient.get<ProductVariantFlat[]>("/inventory/products/variants", toQuery(params)),
    staleTime: 120_000,
  });
}
