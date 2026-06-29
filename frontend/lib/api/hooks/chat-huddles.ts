"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Huddle, HuddleSignalInput } from "@/types/chat";

export function useActiveHuddle(channelId: number) {
  return useQuery({
    queryKey: queryKeys.chat.huddle(channelId),
    queryFn: () => apiClient.get<Huddle | null>(`/chat/channels/${channelId}/huddle`),
    staleTime: 10_000,
    enabled: channelId > 0,
  });
}

export function useStartHuddle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: number) =>
      apiClient.post<Huddle>(`/chat/channels/${channelId}/huddle/start`),
    onSuccess: (_data, channelId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(channelId) });
    },
  });
}

export function useJoinHuddle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ huddleId, channelId }: { huddleId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/huddles/${huddleId}/join`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useLeaveHuddle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ huddleId, channelId }: { huddleId: number; channelId: number }) =>
      apiClient.post<{ ok: boolean }>(`/chat/huddles/${huddleId}/leave`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useSetHuddleMute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ huddleId, channelId, muted }: { huddleId: number; channelId: number; muted: boolean }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/huddles/${huddleId}/mute`, { muted }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useRaiseHand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ huddleId, channelId, raised }: { huddleId: number; channelId: number; raised: boolean }) =>
      apiClient.patch<{ ok: boolean }>(`/chat/huddles/${huddleId}/hand`, { raised }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.huddle(variables.channelId) });
    },
  });
}

export function useSendHuddleSignal() {
  return useMutation({
    mutationFn: ({ huddleId, ...signal }: { huddleId: number } & HuddleSignalInput) =>
      apiClient.post<{ ok: boolean }>(`/chat/huddles/${huddleId}/signal`, signal),
  });
}
