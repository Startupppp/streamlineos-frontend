"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface ListCategoriesParams {
  cursor?: string;
  limit?: number;
}

export interface ListAssetsParams {
  cursor?: string;
  limit?: number;
  status?: AssetStatus;
  categoryId?: number;
}

export interface ListRunsParams {
  cursor?: string;
  limit?: number;
}

const assetKeys = {
  all: [...accountingAndSupportQueryKeys.accounting.all, "assets"] as const,
  categories: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "assets", "categories", params] as const,
  assets: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "assets", "list", params] as const,
  asset: (id: number) =>
    [...accountingAndSupportQueryKeys.accounting.all, "assets", "detail", id] as const,
  runs: (params?: object) =>
    [...accountingAndSupportQueryKeys.accounting.all, "assets", "depreciation-runs", params] as const,
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
  return useQuery<CursorPage<AssetCategory>, Error>({
    queryKey: assetKeys.categories(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<AssetCategory>>("/accounting/assets/categories", toQuery(params), signal),
    staleTime: 120_000,
    enabled: can,
  });
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AssetCategory, Error, CreateCategoryInput>("accounting:assets:manage", {
    mutationKey: ["accounting", "assets", "categories", "create"],
    mutationFn: (data) => apiClient.post<AssetCategory>("/accounting/assets/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.categories() });
    },
  });
}

export function useUpdateAssetCategory(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AssetCategory, Error, UpdateCategoryInput>("accounting:assets:manage", {
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
  return useQuery<CursorPage<AssetListItem>, Error>({
    queryKey: assetKeys.assets(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<AssetListItem>>("/accounting/assets", toQuery(params), signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AssetListItem, Error, CreateAssetInput>("accounting:assets:create", {
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
    queryFn: ({ signal }) => apiClient.get<AssetDetail>(`/accounting/assets/${assetId}`, undefined, signal),
    staleTime: 30_000,
    enabled: can && assetId > 0,
  });
}

export function useUpdateAsset(assetId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AssetDetail, Error, UpdateAssetInput>("accounting:assets:update", {
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
  return useAuthorizedMutation<AssetDetail, Error, void>("accounting:assets:update", {
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
  return useAuthorizedMutation<AssetDetail, Error, DisposeAssetInput>("accounting:assets:manage", {
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
  return useQuery<CursorPage<DepreciationRun>, Error>({
    queryKey: assetKeys.runs(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<DepreciationRun>>("/accounting/assets/depreciation/runs", toQuery(params), signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateDepreciationRun() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DepreciationRun, Error, CreateRunInput>("accounting:assets:manage", {
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
  return useAuthorizedMutation<DepreciationRun, Error, void>("accounting:assets:manage", {
    mutationKey: ["accounting", "assets", "depreciation-runs", runId, "reverse"],
    mutationFn: () =>
      apiClient.post<DepreciationRun>(`/accounting/assets/depreciation/runs/${runId}/reverse`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.runs() });
      queryClient.invalidateQueries({ queryKey: assetKeys.assets() });
    },
  });
}
