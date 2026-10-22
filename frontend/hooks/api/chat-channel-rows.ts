import type { QueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type {
  Channel,
  CreateDMInput,
  CreateGroupChannelInput,
  CreatePrivateChannelInput,
  CreatePublicChannelInput,
  OrgUser,
  PublicChannel,
  UpdateChannelInput,
} from "@/types/chat";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import {
  nextChatTempId,
  runRollbacks,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";
import {
  patchChannelDetail,
  patchChannelRow,
  patchPublicChannel,
  removeChannelRow,
} from "@/hooks/api/chat-channel-cache";
import { patchUnreadTotal } from "@/hooks/api/chat-read-cache";

type ChannelMemberPreview = Channel["members"][number];
type ChannelDetailMember = ChatChannelDetailWire["members"][number];
type PersonRef = Pick<OrgUser, "id" | "name" | "image">;

export type ChannelCreateInput =
  | CreateDMInput
  | CreateGroupChannelInput
  | CreatePublicChannelInput
  | CreatePrivateChannelInput;

export function markStale(queryClient: QueryClient, queryKey: readonly unknown[]): void {
  void queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
}

function previewMember(channelId: number, user: PersonRef): ChannelMemberPreview {
  return {
    id: nextChatTempId(),
    channelId,
    userId: user.id,
    role: "MEMBER",
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "DEFAULT",
    user: { id: user.id, name: user.name, image: user.image },
  };
}

export function cachedOrgUser(queryClient: QueryClient, userId: string): OrgUser | undefined {
  return queryClient
    .getQueryData<OrgUser[]>(collaborationQueryKeys.chat.orgUsers())
    ?.find((user) => user.id === userId);
}

export function detailMemberFor(channelId: number, user: OrgUser): ChannelDetailMember {
  return {
    ...previewMember(channelId, user),
    lastReadAt: null,
    joinedAt: new Date().toISOString(),
    archivedAt: null,
    user: { id: user.id, name: user.name, image: user.image, email: user.email },
  };
}

export function optimisticChannelRow(
  queryClient: QueryClient,
  tempId: number,
  type: Channel["type"],
  input: ChannelCreateInput,
  self: PersonRef | null,
): Channel {
  const memberIds = "targetUserId" in input ? [input.targetUserId] : input.memberIds;
  const others = memberIds.flatMap((id) => {
    const user = cachedOrgUser(queryClient, id);
    return user ? [previewMember(tempId, user)] : [];
  });
  return {
    id: tempId,
    name: "name" in input ? input.name : "",
    type,
    avatarUrl: "avatarUrl" in input ? (input.avatarUrl ?? null) : null,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: self ? [previewMember(tempId, self), ...others] : others,
    memberCount: memberIds.length + 1,
    membersTruncated: false,
    unreadCount: 0,
    lastMessage: null,
  };
}

export function channelRowFromDetail(detail: ChatChannelDetailWire): Channel {
  return {
    id: detail.id,
    name: detail.name,
    type: detail.type,
    avatarUrl: detail.avatarUrl,
    isArchived: detail.isArchived,
    entityType: detail.entityType,
    entityId: detail.entityId,
    members: detail.members.map((member) => ({
      id: member.id,
      channelId: member.channelId,
      userId: member.userId,
      role: member.role,
      mutedUntil: member.mutedUntil,
      isFavorite: member.isFavorite,
      notificationPreference: member.notificationPreference,
      user: member.user && { id: member.user.id, name: member.user.name, image: member.user.image },
    })),
    memberCount: detail.memberCount ?? detail.members.length,
    membersTruncated: false,
    unreadCount: 0,
    lastMessage: null,
  };
}

export function publicRowFromDetail(detail: ChatChannelDetailWire): PublicChannel {
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description,
    avatarUrl: detail.avatarUrl,
    type: detail.type,
    createdAt: detail.createdAt,
    lastMessageAt: detail.lastMessageAt,
    memberCount: detail.memberCount ?? detail.members.length,
    isMember: true,
  };
}

export function channelRowFromPublic(listed: PublicChannel): Channel {
  return {
    id: listed.id,
    name: listed.name,
    type: listed.type,
    avatarUrl: listed.avatarUrl,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: [],
    memberCount: listed.memberCount + 1,
    membersTruncated: true,
    unreadCount: 0,
    lastMessage: null,
  };
}

export function adjustMembers(
  queryClient: QueryClient,
  channelId: number,
  userId: string,
  member?: ChatChannelDetailWire["members"][number],
): ChatCacheRollback[] {
  const delta = member ? 1 : -1;
  return [
    patchChannelDetail(queryClient, channelId, (detail) => ({
      ...detail,
      memberCount: detail.memberCount === undefined ? undefined : Math.max(0, detail.memberCount + delta),
      members: member
        ? [...detail.members, member]
        : detail.members.filter((m) => m.userId !== userId),
    })),
    patchChannelRow(queryClient, channelId, (channel) => ({
      ...channel,
      memberCount: Math.max(0, channel.memberCount + delta),
      members: delta < 0 ? channel.members.filter((m) => m.userId !== userId) : channel.members,
    })),
  ];
}


export function removeMembership(queryClient: QueryClient, channelId: number): ChatCacheRollback {
  const fromInbox = removeChannelRow(queryClient, collaborationQueryKeys.chat.myChannels(), channelId);
  const fromArchive = removeChannelRow(queryClient, collaborationQueryKeys.chat.archivedChannels(), channelId);
  const unread = fromInbox.removed?.unreadCount ?? fromArchive.removed?.unreadCount ?? 0;
  const rollbacks = [
    fromInbox.rollback,
    fromArchive.rollback,
    patchUnreadTotal(queryClient, (total) => total - unread),
    patchPublicChannel(queryClient, channelId, (channel) =>
      channel.isMember
        ? { ...channel, isMember: false, memberCount: Math.max(0, channel.memberCount - 1) }
        : channel,
    ),
  ];
  return () => runRollbacks(rollbacks);
}

export function patchChannelProfile(
  queryClient: QueryClient,
  channelId: number,
  { name, description, avatarUrl }: UpdateChannelInput,
): ChatCacheRollback {
  const rowPatch = {
    ...(name !== undefined && { name }),
    ...(avatarUrl !== undefined && { avatarUrl }),
  };
  const rollbacks = [
    patchChannelDetail(queryClient, channelId, (detail) => ({
      ...detail,
      ...rowPatch,
      ...(description !== undefined && { description }),
    })),
    patchChannelRow(queryClient, channelId, (channel) => ({ ...channel, ...rowPatch })),
  ];
  return () => runRollbacks(rollbacks);
}
