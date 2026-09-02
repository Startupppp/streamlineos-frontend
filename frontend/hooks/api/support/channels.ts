"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type SupportChannelType = "email" | "chat" | "whatsapp" | "sms";

export interface SupportChannel {
  id: number;
  orgId: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportChannelInput {
  type: SupportChannelType;
  name: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateSupportChannelInput {
  name?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export function useSupportChannels() {
  return useQuery({
    queryKey: queryKeys.supportChannels.list(),
    queryFn: ({ signal }) => apiClient.get<SupportChannel[]>("/support/channels", undefined, signal),
    staleTime: 60_000,
  });
}

export function useCreateSupportChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:channels:manage", {
    mutationKey: ["support", "channels", "create"],
    mutationFn: (input: CreateSupportChannelInput) =>
      apiClient.post<SupportChannel>("/support/channels", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportChannels.all }),
  });
}

export function useUpdateSupportChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:channels:manage", {
    mutationKey: ["support", "channels", "update"],
    mutationFn: ({ id, ...input }: UpdateSupportChannelInput & { id: number }) =>
      apiClient.patch<SupportChannel>(`/support/channels/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportChannels.all }),
  });
}

export function useDeleteSupportChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["support", "channels", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/channels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportChannels.all }),
  });
}
