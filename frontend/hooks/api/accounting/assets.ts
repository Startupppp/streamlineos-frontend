"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  AssetCategory,
  AssetDetail,
  AssetListItem,
  AssetStatus,
  CreateAssetInput,
  CreateCategoryInput,
  CreateRunInput,
  DepreciationRun,
  DisposeAssetInput,
  UpdateAssetInput,
  UpdateCategoryInput,
} from "@/types/accounting/assets";

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListCategoriesParams {
  page?: number;
  pageSize?: number;
}

export interface ListAssetsParams {
  page?: number;
  pageSize?: number;
  status?: AssetStatus;
  categoryId?: number;
}

export interface ListRunsParams {
  page?: number;
  pageSize?: number;
}

const assetKeys = {
  all: [...queryKeys.accounting.all, "assets"] as const,
  categories: (params?: object) =>
    [...queryKeys.accounting.all, "assets", "categories", params] as const,
  assets: (params?: object) =>
    [...queryKeys.accounting.all, "assets", "list", params] as const,
  asset: (id: number) =>
    [...queryKeys.accounting.all, "assets", "detail", id] as const,
  runs: (params?: object) =>
    [...queryKeys.accounting.all, "assets", "depreciation-runs", params] as const,
};

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export function useAssetCategories(params: ListCategoriesParams = {}) {
  const can = useCan("accounting:assets:read");
  return useQuery<ListResponse<AssetCategory>, Error>({
    queryKey: assetKeys.categories(params),
    queryFn: () =>
      apiClient.get<ListResponse<AssetCategory>>("/accounting/assets/categories", toQuery(params)),
    staleTime: 120_000,
    enabled: can,
  });
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation<AssetCategory, Error, CreateCategoryInput>({
    mutationKey: ["accounting", "assets", "categories", "create"],
    mutationFn: (data) => apiClient.post<AssetCategory>("/accounting/assets/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.categories() });
    },
  });
}

export function useUpdateAssetCategory(id: number) {
  const queryClient = useQueryClient();
  return useMutation<AssetCategory, Error, UpdateCategoryInput>({
    mutationKey: ["accounting", "assets", "categories", id, "update"],
    mutationFn: (data) =>
      apiClient.patch<AssetCategory>(`/accounting/assets/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.categories() });
    },
  });
}

export function useAssets(params: ListAssetsParams = {}) {
  const can = useCan("accounting:assets:read");
  return useQuery<ListResponse<AssetListItem>, Error>({
    queryKey: assetKeys.assets(params),
    queryFn: () =>
      apiClient.get<ListResponse<AssetListItem>>("/accounting/assets", toQuery(params)),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation<AssetListItem, Error, CreateAssetInput>({
    mutationKey: ["accounting", "assets", "create"],
    mutationFn: (data) => apiClient.post<AssetListItem>("/accounting/assets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.assets() });
    },
  });
}

export function useAsset(assetId: number) {
  const can = useCan("accounting:assets:read");
  return useQuery<AssetDetail, Error>({
    queryKey: assetKeys.asset(assetId),
    queryFn: () => apiClient.get<AssetDetail>(`/accounting/assets/${assetId}`),
    staleTime: 30_000,
    enabled: can && assetId > 0,
  });
}

export function useUpdateAsset(assetId: number) {
  const queryClient = useQueryClient();
  return useMutation<AssetDetail, Error, UpdateAssetInput>({
    mutationKey: ["accounting", "assets", assetId, "update"],
    mutationFn: (data) => apiClient.patch<AssetDetail>(`/accounting/assets/${assetId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.asset(assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.assets() });
    },
  });
}

export function useActivateAsset(assetId: number) {
  const queryClient = useQueryClient();
  return useMutation<AssetDetail, Error, void>({
    mutationKey: ["accounting", "assets", assetId, "activate"],
    mutationFn: () => apiClient.post<AssetDetail>(`/accounting/assets/${assetId}/activate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.asset(assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.assets() });
    },
  });
}

export function useDisposeAsset(assetId: number) {
  const queryClient = useQueryClient();
  return useMutation<AssetDetail, Error, DisposeAssetInput>({
    mutationKey: ["accounting", "assets", assetId, "dispose"],
    mutationFn: (data) => apiClient.post<AssetDetail>(`/accounting/assets/${assetId}/dispose`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.asset(assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.assets() });
    },
  });
}

export function useDepreciationRuns(params: ListRunsParams = {}) {
  const can = useCan("accounting:assets:read");
  return useQuery<ListResponse<DepreciationRun>, Error>({
    queryKey: assetKeys.runs(params),
    queryFn: () =>
      apiClient.get<ListResponse<DepreciationRun>>("/accounting/assets/depreciation/runs", toQuery(params)),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateDepreciationRun() {
  const queryClient = useQueryClient();
  return useMutation<DepreciationRun, Error, CreateRunInput>({
    mutationKey: ["accounting", "assets", "depreciation-runs", "create"],
    mutationFn: (data) =>
      apiClient.post<DepreciationRun>("/accounting/assets/depreciation/runs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.runs() });
      queryClient.invalidateQueries({ queryKey: assetKeys.assets() });
    },
  });
}

export function useReverseDepreciationRun(runId: number) {
  const queryClient = useQueryClient();
  return useMutation<DepreciationRun, Error, void>({
    mutationKey: ["accounting", "assets", "depreciation-runs", runId, "reverse"],
    mutationFn: () =>
      apiClient.post<DepreciationRun>(`/accounting/assets/depreciation/runs/${runId}/reverse`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.runs() });
      queryClient.invalidateQueries({ queryKey: assetKeys.assets() });
    },
  });
}
