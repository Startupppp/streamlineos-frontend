"use client";

import { useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useChatOrgUsers, useCreateDMChannel } from "@/hooks/api";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/format-utils";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { ChannelSectionList } from "./channel-section-list";
import type { ChatSearchScope } from "./chat-search-scope";
import type { Channel } from "./chat-types";

interface ChannelSidebarSearchResultsProps {
  scope: ChatSearchScope;
  search: string;
  channels: Channel[];
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}

export function ChannelSidebarSearchResults({
  scope,
  search,
  channels,
  activeChannelId,
  currentUserId,
  onlineUserIds,
  onSelectChannel,
  onStartCall,
  onOpenSettings,
}: ChannelSidebarSearchResultsProps) {
  if (scope === "people") {
    return (
      <PeopleSearchResults
        search={search}
        currentUserId={currentUserId}
        onlineUserIds={onlineUserIds}
        onSelectChannel={onSelectChannel}
      />
    );
  }

  const q = search.trim().toLowerCase();
  const matched = q
    ? channels.filter(
        (ch) =>
          ch.type !== "DIRECT" &&
          (ch.name.toLowerCase().includes(q) ||
            ch.lastMessage?.content?.toLowerCase().includes(q)),
      )
    : channels.filter((ch) => ch.type !== "DIRECT");

  if (matched.length === 0) {
    return (
      <EmptyState
        compact
        illustrationPreset="mail"
        title="No channels found"
        description={
          q ? "Try a different name or clear the search." : "No channels to show yet."
        }
      />
    );
  }

  return (
    <ChannelSectionList
      channels={matched}
      label="Channels"
      activeChannelId={activeChannelId}
      currentUserId={currentUserId}
      onlineUserIds={onlineUserIds}
      onSelectChannel={onSelectChannel}
      onStartCall={onStartCall}
      onOpenSettings={onOpenSettings}
    />
  );
}

function PeopleSearchResults({
  search,
  currentUserId,
  onlineUserIds,
  onSelectChannel,
}: {
  search: string;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
}) {
  const { data: orgUsers, isLoading } = useChatOrgUsers();
  const createDM = useCreateDMChannel();

  const filtered = useMemo(() => {
    if (!orgUsers) return [];
    const q = search.trim().toLowerCase();
    return orgUsers.filter((user) => {
      if (!q) return true;
      return (
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q)
      );
    });
  }, [orgUsers, search]);

  const handleSelectUser = useCallback(
    async (userId: string) => {
      try {
        const channel = await createDM.mutateAsync({ targetUserId: userId });
        onSelectChannel(channel.id);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [createDM, onSelectChannel],
  );

  if (isLoading) {
    return (
      <div className="space-y-2 p-2" aria-busy="true">
        <span role="status" className="sr-only">
          Loading people…
        </span>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        compact
        illustrationPreset="mail"
        title="No people found"
        description={
          search.trim()
            ? "Try a different name or email."
            : "No people available to message."
        }
      />
    );
  }

  return (
    <div role="list" aria-label="People">
      {filtered.map((user) => (
        <PersonRow
          key={user.id}
          userId={user.id}
          name={user.name}
          email={user.email}
          image={user.image}
          isOnline={onlineUserIds.has(user.id)}
          isSelf={user.id === currentUserId}
          isPending={createDM.isPending}
          onSelect={handleSelectUser}
        />
      ))}
    </div>
  );
}

function PersonRow({
  userId,
  name,
  email,
  image,
  isOnline,
  isSelf,
  isPending,
  onSelect,
}: {
  userId: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isOnline: boolean;
  isSelf: boolean;
  isPending: boolean;
  onSelect: (userId: string) => void;
}) {
  const handleClick = useCallback(() => onSelect(userId), [onSelect, userId]);

  return (
    <button
      type="button"
      role="listitem"
      onClick={handleClick}
      disabled={isPending}
      className="flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={resolveImageUrl(image)} />
          <AvatarFallback className="text-micro font-medium">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {isOnline ? (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-status-success-fill" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <TruncatedText
          text={isSelf ? `${name ?? "You"} (you)` : (name ?? "")}
          className="text-label font-medium"
        />
        <TruncatedText
          text={isSelf ? "Note to self" : (email ?? "")}
          className="text-dense text-muted-foreground"
        />
      </div>
    </button>
  );
}
