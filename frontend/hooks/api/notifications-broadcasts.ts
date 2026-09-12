"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { broadcastListContract, broadcastRowContract, broadcastSuccessContract } from "@/hooks/api/notifications-schema";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  Broadcast,
  BroadcastListResponse,
  CreateBroadcastInput,
  UpdateBroadcastInput,
} from "@/types/notifications";
import { toStringParams } from "./notifications-shared";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const useBroadcasts = (
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<BroadcastListResponse, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("notifications:broadcasts:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<BroadcastListResponse, Error>({
    queryKey: platformCoreQueryKeys.notifications.broadcasts(params),
    queryFn: ({ signal }) =>
      apiClient.get<BroadcastListResponse>(
        "/broadcasts",
        params ? toStringParams(params) : undefined,
        signal,
        broadcastListContract,
      ),
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
};

export const useCreateBroadcast = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Broadcast, Error, CreateBroadcastInput>("notifications:broadcasts:manage", {
    mutationKey: ["notifications", "broadcasts", "create"],
    mutationFn: (dto) => apiClient.post<Broadcast>("/broadcasts", dto, undefined, broadcastRowContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.broadcasts() });
    },
  });
};

export const useUpdateBroadcast = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Broadcast, Error, { id: number } & UpdateBroadcastInput>("notifications:broadcasts:manage", {
    mutationKey: ["notifications", "broadcasts", "update"],
    mutationFn: ({ id, ...dto }) => apiClient.patch<Broadcast>(`/broadcasts/${id}`, dto, undefined, broadcastRowContract),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.broadcasts() });
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.broadcast(vars.id) });
    },
  });
};

export const usePublishBroadcast = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("notifications:broadcasts:manage", {
    mutationKey: ["notifications", "broadcasts", "publish"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/broadcasts/${id}/publish`, undefined, undefined, broadcastSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.broadcasts() });
    },
  });
};

export const useCancelBroadcast = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("notifications:broadcasts:manage", {
    mutationKey: ["notifications", "broadcasts", "cancel"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/broadcasts/${id}/cancel`, undefined, undefined, broadcastSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.broadcasts() });
    },
  });
};

export const useDismissBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "broadcasts", "dismiss"],
    mutationFn: (broadcastId) => apiClient.post<{ success: boolean }>(`/broadcasts/${broadcastId}/dismiss`, undefined, undefined, broadcastSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all });
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.broadcasts() });
    },
  });
};

export const useDeleteBroadcast = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("notifications:broadcasts:manage", {
    mutationKey: ["notifications", "broadcasts", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/broadcasts/${id}`, undefined, undefined, broadcastSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.broadcasts() });
    },
  });
};
