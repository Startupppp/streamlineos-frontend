"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  Channel,
  CreateDMInput,
  CreateGroupChannelInput,
  CreatePublicChannelInput,
  CreatePrivateChannelInput,
  UpdateChannelInput,
} from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import {
  cancelLoadedQueries,
  nextChatTempId,
  runRollbacks,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";
import {
  cancelChatChannelQueries,
  findChannelRow,
  findPublicChannel,
  insertChannelRow,
  patchChannelDetail,
  patchPublicChannel,
  replaceChannelRow,
} from "@/hooks/api/chat-channel-cache";
import {
  adjustMembers,
  cachedOrgUser,
  channelRowFromDetail,
  channelRowFromPublic,
  detailMemberFor,
  markStale,
  optimisticChannelRow,
  patchChannelProfile,
  publicRowFromDetail,
  removeMembership,
  type ChannelCreateInput,
} from "@/hooks/api/chat-channel-rows";
import { refreshJoinedChannel } from "@/hooks/api/chat-read-cache";
import { refreshRealtimeCapability } from "./chat-shared";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);

const chatChannelDetailContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.chatChannelDetailContract),
);

interface RollbackContext {
  rollback: ChatCacheRollback;
}

interface CreateContext extends RollbackContext {
  tempId: number;
}

function useCreateChannel<TInput extends ChannelCreateInput>(type: Channel["type"], mutationKey: string) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const self = session?.user;
  const myChannelsKey = collaborationQueryKeys.chat.myChannels();
  return useAuthorizedMutation<ChatChannelDetailWire, Error, TInput, CreateContext>("chat:channels:write", {
    mutationKey: ["chat", "channels", mutationKey],
    mutationFn: (input) =>
      apiClient.post<ChatChannelDetailWire>("/chat/channels", { type, ...input }, undefined, chatChannelDetailContract),
    onMutate: async (input) => {
      await cancelLoadedQueries(queryClient, [myChannelsKey]);
      const tempId = nextChatTempId();
      const person = self?.id ? { id: self.id, name: self.name ?? null, image: self.image ?? null } : null;
      const row = optimisticChannelRow(queryClient, tempId, type, input, person);
      return { tempId, rollback: insertChannelRow(queryClient, myChannelsKey, row) };
    },
    onError: (_error, _input, context) => context?.rollback(),
    onSuccess: (detail, _input, context) => {
      refreshRealtimeCapability();
      queryClient.setQueryData<ChatChannelDetailWire>(collaborationQueryKeys.chat.channel(detail.id), detail);
      replaceChannelRow(
        queryClient,
        myChannelsKey,
        context.tempId,
        findChannelRow(queryClient, detail.id) ?? channelRowFromDetail(detail),
      );
      if (type === "PUBLIC")
        insertChannelRow(queryClient, collaborationQueryKeys.chat.publicChannels(), publicRowFromDetail(detail));
    },
  });
}

export function useCreateDMChannel() {
  return useCreateChannel<CreateDMInput>("DIRECT", "create-dm");
}

export function useCreateGroupChannel() {
  return useCreateChannel<CreateGroupChannelInput>("GROUP", "create-group");
}

export function useCreatePublicChannel() {
  return useCreateChannel<CreatePublicChannelInput>("PUBLIC", "create-public");
}

export function useCreatePrivateChannel() {
  return useCreateChannel<CreatePrivateChannelInput>("PRIVATE", "create-private");
}

export function useJoinChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ ok: boolean }, Error, number, RollbackContext>("chat:channels:write", {
    mutationKey: ["chat", "channels", "join"],
    mutationFn: (channelId) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/join`, undefined, undefined, chatOkContract),
    onMutate: async (channelId) => {
      await cancelChatChannelQueries(queryClient, channelId);
      const listed = findPublicChannel(queryClient, channelId);
      const rollbacks = [
        patchPublicChannel(queryClient, channelId, (channel) =>
          channel.isMember ? channel : { ...channel, isMember: true, memberCount: channel.memberCount + 1 },
        ),
      ];
      if (listed && !findChannelRow(queryClient, channelId))
        rollbacks.push(
          insertChannelRow(queryClient, collaborationQueryKeys.chat.myChannels(), channelRowFromPublic(listed)),
        );
      return { rollback: () => runRollbacks(rollbacks) };
    },
    onError: (_error, _channelId, context) => context?.rollback(),
    onSuccess: (_data, channelId) => {
      refreshRealtimeCapability();
      refreshJoinedChannel(queryClient, channelId);
    },
  });
}

export function useLeaveChannel() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  return useAuthorizedMutation<{ ok: boolean }, Error, number, RollbackContext>("chat:channels:write", {
    mutationKey: ["chat", "channels", "leave"],
    mutationFn: (channelId) =>
      apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/leave`, undefined, undefined, chatOkContract),
    onMutate: async (channelId) => {
      await cancelChatChannelQueries(queryClient, channelId);
      const rollbacks = [removeMembership(queryClient, channelId)];
      if (currentUserId)
        rollbacks.push(...adjustMembers(queryClient, channelId, currentUserId));
      return { rollback: () => runRollbacks(rollbacks) };
    },
    onError: (_error, _channelId, context) => context?.rollback(),
    onSuccess: () => {
      refreshRealtimeCapability();
    },
  });
}

export function useAddChannelMember() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ ok: boolean }, Error, { channelId: number; userId: string }, RollbackContext>(
    "chat:channels:write",
    {
      mutationKey: ["chat", "channels", "add-member"],
      mutationFn: ({ channelId, userId }) =>
        apiClient.post<{ ok: boolean }>(`/chat/channels/${channelId}/members`, { userId }, undefined, chatOkContract),
      onMutate: async ({ channelId, userId }) => {
        await cancelChatChannelQueries(queryClient, channelId);
        const user = cachedOrgUser(queryClient, userId);
        if (!user) return { rollback: () => undefined };
        const member = detailMemberFor(channelId, user);
        const rollbacks = adjustMembers(queryClient, channelId, userId, member);
        return { rollback: () => runRollbacks(rollbacks) };
      },
      onError: (_error, _variables, context) => context?.rollback(),
      onSuccess: (_data, { channelId }) => markStale(queryClient, collaborationQueryKeys.chat.channel(channelId)),
    },
  );
}

export function useRemoveChannelMember() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ ok: boolean }, Error, { channelId: number; userId: string }, RollbackContext>(
    "chat:channels:write",
    {
      mutationKey: ["chat", "channels", "remove-member"],
      mutationFn: ({ channelId, userId }) =>
        apiClient.delete<{ ok: boolean }>(
          `/chat/channels/${channelId}/members/${userId}`,
          undefined,
          undefined,
          chatOkContract,
        ),
      onMutate: async ({ channelId, userId }) => {
        await cancelChatChannelQueries(queryClient, channelId);
        const rollbacks = adjustMembers(queryClient, channelId, userId);
        return { rollback: () => runRollbacks(rollbacks) };
      },
      onError: (_error, _variables, context) => context?.rollback(),
    },
  );
}

export function useUpdateChannelMemberRole() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { ok: boolean },
    Error,
    { channelId: number; userId: string; role: "ADMIN" | "MEMBER" },
    RollbackContext
  >("chat:channels:write", {
    mutationKey: ["chat", "channels", "member-role"],
    mutationFn: ({ channelId, userId, role }) =>
      apiClient.patch<{ ok: boolean }>(
        `/chat/channels/${channelId}/members/${userId}/role`,
        { role },
        undefined,
        chatOkContract,
      ),
    onMutate: async ({ channelId, userId, role }) => {
      await cancelChatChannelQueries(queryClient, channelId);
      return {
        rollback: patchChannelDetail(queryClient, channelId, (detail) => ({
          ...detail,
          members: detail.members.map((m) => (m.user?.id === userId ? { ...m, role } : m)),
        })),
      };
    },
    onError: (_error, _variables, context) => context?.rollback(),
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ ok: boolean }, Error, UpdateChannelInput & { channelId: number }, RollbackContext>(
    "chat:channels:write",
    {
      mutationKey: ["chat", "channels", "update"],
      mutationFn: ({ channelId, ...update }) =>
        apiClient.patch<{ ok: boolean }>(`/chat/channels/${channelId}`, update, undefined, chatOkContract),
      onMutate: async ({ channelId, name, description, avatarUrl }) => {
        await cancelChatChannelQueries(queryClient, channelId);
        return { rollback: patchChannelProfile(queryClient, channelId, { name, description, avatarUrl }) };
      },
      onError: (_error, _variables, context) => context?.rollback(),
    },
  );
}
