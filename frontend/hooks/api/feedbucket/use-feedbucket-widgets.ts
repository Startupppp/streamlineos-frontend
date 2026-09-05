"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type {
  FeedbucketWidget,
  CreateFeedbucketWidgetInput,
  UpdateFeedbucketWidgetInput,
} from "@/types/feedbucket";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export function useFeedbucketWidgets() {
  return useGatedQuery("feedbucket:widgets:view", {
    queryKey: growthAndSignQueryKeys.feedbucket.widgets(),
    queryFn: ({ signal }) => apiClient.get<FeedbucketWidget[]>("/feedbucket/widgets", undefined, signal),
    staleTime: 30_000,
  });
}

export function useCreateFeedbucketWidget() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:widgets:create", {
    mutationKey: ["feedbucket", "widgets", "create"],
    mutationFn: (input: CreateFeedbucketWidgetInput) =>
      apiClient.post<FeedbucketWidget>("/feedbucket/widgets", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.widgets() });
    },
  });
}

export function useUpdateFeedbucketWidget() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:widgets:update", {
    mutationKey: ["feedbucket", "widgets", "update"],
    mutationFn: ({ widgetId, input }: { widgetId: number; input: UpdateFeedbucketWidgetInput }) =>
      apiClient.patch<FeedbucketWidget>(`/feedbucket/widgets/${widgetId}`, input),
    onSuccess: (_, { widgetId }) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.widgets() });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.widget(widgetId) });
    },
  });
}

export function useRotateFeedbucketWidgetKey() {
  const qc = useQueryClient();
  return useAuthorizedMutation("feedbucket:widgets:manage", {
    mutationKey: ["feedbucket", "widgets", "rotate-key"],
    mutationFn: (widgetId: number) =>
      apiClient.post<FeedbucketWidget>(`/feedbucket/widgets/${widgetId}/rotate-key`),
    onSuccess: (_, widgetId) => {
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.widgets() });
      void qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.feedbucket.widget(widgetId) });
    },
  });
}
