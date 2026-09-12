"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
      onClick={handleClick}
      disabled={isPending}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
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
      <Badge
        variant="outline"
        className="text-micro shrink-0 border-border/40"
      >
        {user.role}
      </Badge>
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
  const { data: orgUsers, isLoading } = useChatOrgUsers();
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
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-base">New Direct Message</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-3">
          <div className="min-w-0 bg-muted/30 border-border/30">
          <SearchInput fill placeholder="Search by name or email..." value={search} onValueChange={handleSearchChange} autoFocus />
        </div>
        </div>
        <div
          className="border-t border-border/30 p-1"
          style={{ height: DM_LIST_BOX_HEIGHT }}
        >
          {filteredUsers.length === 0 ? (
            !isLoading && (
              <div className="text-center py-10">
                <Users className="w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-label text-muted-foreground">
                  No users found
                </p>
              </div>
            )
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
