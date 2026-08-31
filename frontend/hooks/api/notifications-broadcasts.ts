"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Broadcast,
  BroadcastListResponse,
  CreateBroadcastInput,
  UpdateBroadcastInput,
} from "@/types/notifications";
import { toStringParams } from "./notifications-shared";
import { useCan } from "@/hooks/api/access";

export const useBroadcasts = (
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<BroadcastListResponse, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:broadcasts:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<BroadcastListResponse, Error>({
    queryKey: queryKeys.notifications.broadcasts(params),
    queryFn: () =>
      apiClient.get<BroadcastListResponse>(
        "/broadcasts",
        params ? toStringParams(params) : undefined,
      ),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useCreateBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<Broadcast, Error, CreateBroadcastInput>({
    mutationKey: ["notifications", "broadcasts", "create"],
    mutationFn: (dto) => apiClient.post<Broadcast>("/broadcasts", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};

export const useUpdateBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<Broadcast, Error, { id: number } & UpdateBroadcastInput>({
    mutationKey: ["notifications", "broadcasts", "update"],
    mutationFn: ({ id, ...dto }) => apiClient.patch<Broadcast>(`/broadcasts/${id}`, dto),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcast(vars.id) });
    },
  });
};

export const usePublishBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "broadcasts", "publish"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/broadcasts/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};

export const useCancelBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "broadcasts", "cancel"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/broadcasts/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};

export const useDeleteBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "broadcasts", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/broadcasts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.broadcasts() });
    },
  });
};
