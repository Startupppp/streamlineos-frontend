"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { supportChannelContract as supportChannelContractType } from "@/hooks/api/support/support-channel-schema";

const supportChannelListContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.supportChannelListContract),
);
const supportChannelContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.supportChannelContract),
);
const channelSuccessContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.channelSuccessContract),
);

export type SupportChannelType = "email" | "chat" | "whatsapp" | "sms";

export type SupportChannel = z.infer<typeof supportChannelContractType>;

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
  return useGatedQuery("support:channels:manage", {
    queryKey: supportAndWorkflowsQueryKeys.supportChannels.list(),
    queryFn: ({ signal }) => apiClient.get("/support/channels", undefined, signal, supportChannelListContract),
    staleTime: 60_000,
  });
}

export function useCreateSupportChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:channels:manage", {
    mutationKey: ["support", "channels", "create"],
    mutationFn: (input: CreateSupportChannelInput) =>
      apiClient.post("/support/channels", input, undefined, supportChannelContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportChannels.all }),
  });
}

export function useUpdateSupportChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:channels:manage", {
    mutationKey: ["support", "channels", "update"],
    mutationFn: ({ id, ...input }: UpdateSupportChannelInput & { id: number }) =>
      apiClient.patch(`/support/channels/${id}`, input, undefined, supportChannelContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportChannels.all }),
  });
}

export function useDeleteSupportChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:channels:manage", {
    mutationKey: ["support", "channels", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/channels/${id}`, undefined, undefined, channelSuccessContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportChannels.all }),
  });
}
