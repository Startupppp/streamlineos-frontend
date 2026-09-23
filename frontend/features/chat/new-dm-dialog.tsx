"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import {
  useChatOrgUsers,
  useChatOnlineUsers,
  useCreateDMChannel,
} from "@/hooks/api";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ChatUserVirtualList } from "./chat-user-virtual-list";
import { getInitials } from "@/lib/format-utils";
import { ChatDialogHeader } from "./chat-dialog-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

const DM_LIST_BOX_HEIGHT = 340;
const DM_LIST_PADDING = 8;
const DM_ROW_HEIGHT = 56;

type OrgUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

interface DMUserItemProps {
  user: OrgUser;
  isOnline: boolean;
  isPending: boolean;
  isSelf?: boolean;
  onSelect: (userId: string) => void;
}

function DMUserItem({
  user,
  isOnline,
  isPending,
  isSelf,
  onSelect,
}: DMUserItemProps) {
  const handleClick = useCallback(() => onSelect(user.id), [user.id, onSelect]);
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={resolveImageUrl(user.image)} />
          <AvatarFallback className="text-micro font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-status-success-fill border-2 border-background" />
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <TruncatedText
          text={isSelf ? `${user.name ?? "You"} (you)` : (user.name ?? "")}
          className="text-label font-medium"
        />
        <TruncatedText
          text={isSelf ? "Note to self" : (user.email ?? "")}
          className="text-dense text-muted-foreground"
        />
      </div>
      {user.role ? (
        <>
          <Badge
            variant="outline"
            className="hidden shrink-0 border-border/40 text-micro sm:inline-flex"
          >
            {user.role}
          </Badge>
          <span className="sr-only sm:hidden">{user.role}</span>
        </>
      ) : null}
    </button>
  );
}

export function NewDMDialog({
  open,
  onOpenChange,
  onCreated,
  hideTrigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channelId: number) => void;
  hideTrigger?: boolean;
}) {
  const {
    data: orgUsers,
    error: usersError,
    isError: isUsersError,
    isLoading,
    refetch: refetchUsers,
  } = useChatOrgUsers();
  const { data: onlineUsers } = useChatOnlineUsers();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const createDM = useCreateDMChannel();
  const [search, setSearch] = useState("");

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers],
  );

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    [],
  );
  const handleRetryUsers = useCallback(() => {
    void refetchUsers();
  }, [refetchUsers]);
  const handleSelectUser = useCallback(
    async (userId: string) => {
      try {
        const channel = await createDM.mutateAsync({ targetUserId: userId });
        onCreated(channel.id);
        onOpenChange(false);
        setSearch("");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [createDM, onCreated, onOpenChange],
  );

  const filteredUsers = useMemo(() => {
    if (!orgUsers) return [];
    const q = search.trim().toLowerCase();
    const matched = q
      ? orgUsers.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q),
        )
      : orgUsers;
    if (!currentUserId) return matched;
    const self = matched.find((u) => u.id === currentUserId);
    if (!self) return matched;
    return [self, ...matched.filter((u) => u.id !== currentUserId)];
  }, [orgUsers, search, currentUserId]);

  const renderUser = useCallback(
    (user: OrgUser) => (
      <DMUserItem
        user={user}
        isOnline={onlineUserIds.has(user.id)}
        isPending={createDM.isPending}
        isSelf={user.id === currentUserId}
        onSelect={handleSelectUser}
      />
    ),
    [onlineUserIds, createDM.isPending, currentUserId, handleSelectUser],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            variant="ghost"
            size="icon"
            className="w-7 rounded-lg"
            title="New Direct Message"
            aria-label="New Direct Message"
          />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <ChatDialogHeader
          title="New direct message"
          description="Search for a teammate and start a private conversation."
        />
        <div className="px-4 pb-3">
          <SearchInput
            fill
            placeholder="Search by name or email..."
            value={search}
            onValueChange={handleSearchChange}
            autoFocus
          />
        </div>
        <div
          className="border-t border-border/30 p-1"
          style={{ height: DM_LIST_BOX_HEIGHT }}
        >
          {isLoading ? (
            <div className="space-y-2 p-2" aria-busy="true">
              <span role="status" className="sr-only">Loading people…</span>
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex items-center gap-3 px-2 py-1.5">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : isUsersError ? (
            <ErrorState
              compact
              className="h-full"
              title="Couldn't load people"
              description={getErrorMessage(usersError)}
              onRetry={handleRetryUsers}
            />
          ) : filteredUsers.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-label text-muted-foreground">
                  No users found
                </p>
              </div>
          ) : (
            <ChatUserVirtualList
              users={filteredUsers}
              rowHeight={DM_ROW_HEIGHT}
              listHeight={DM_LIST_BOX_HEIGHT - DM_LIST_PADDING}
              ariaLabel="People you can message"
              renderUser={renderUser}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
