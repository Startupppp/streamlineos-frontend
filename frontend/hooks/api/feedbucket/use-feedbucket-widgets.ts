"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  FeedbucketWidget,
  CreateFeedbucketWidgetInput,
  UpdateFeedbucketWidgetInput,
} from "@/types/feedbucket";

export function useFeedbucketWidgets() {
  return useQuery({
    queryKey: queryKeys.feedbucket.widgets(),
    queryFn: ({ signal }) => apiClient.get<FeedbucketWidget[]>("/feedbucket/widgets", undefined, signal),
    staleTime: 30_000,
  });
}

export function useCreateFeedbucketWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["feedbucket", "widgets", "create"],
    mutationFn: (input: CreateFeedbucketWidgetInput) =>
      apiClient.post<FeedbucketWidget>("/feedbucket/widgets", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.widgets() });
    },
  });
}

export function useUpdateFeedbucketWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["feedbucket", "widgets", "update"],
    mutationFn: ({ widgetId, input }: { widgetId: number; input: UpdateFeedbucketWidgetInput }) =>
      apiClient.patch<FeedbucketWidget>(`/feedbucket/widgets/${widgetId}`, input),
    onSuccess: (_, { widgetId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.widgets() });
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.widget(widgetId) });
    },
  });
}

export function useRotateFeedbucketWidgetKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["feedbucket", "widgets", "rotate-key"],
    mutationFn: (widgetId: number) =>
      apiClient.post<FeedbucketWidget>(`/feedbucket/widgets/${widgetId}/rotate-key`),
    onSuccess: (_, widgetId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.widgets() });
      void qc.invalidateQueries({ queryKey: queryKeys.feedbucket.widget(widgetId) });
    },
  });
}
