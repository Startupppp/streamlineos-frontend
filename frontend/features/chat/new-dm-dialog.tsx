"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { getInitials } from "./chat-helpers";
import { TruncatedText } from "@/components/ui/truncated-text";

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
  onSelect: (userId: string) => void;
}

function DMUserItem({ user, isOnline, isPending, onSelect }: DMUserItemProps) {
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
          <AvatarFallback className="text-[10px] font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <TruncatedText text={user.name ?? ""} className="text-[13px] font-medium" />
        <TruncatedText text={user.email ?? ""} className="text-[11px] text-muted-foreground" />
      </div>
      <Badge
        variant="outline"
        className="text-[10px] shrink-0 border-border/40"
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
    if (!search) return orgUsers;
    const q = search.toLowerCase();
    return orgUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [orgUsers, search]);

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
          <DialogTitle className="text-[16px]">New Direct Message</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-3">
          <div className="min-w-0 bg-muted/30 border-border/30">
          <SearchInput fill placeholder="Search by name or email..." value={search} onValueChange={handleSearchChange} autoFocus />
        </div>
        </div>
        <ScrollArea className="h-[340px] border-t border-border/30">
          <div className="p-1">
            {filteredUsers.map((user) => (
              <DMUserItem
                key={user.id}
                user={user}
                isOnline={onlineUserIds.has(user.id)}
                isPending={createDM.isPending}
                onSelect={handleSelectUser}
              />
            ))}
            {filteredUsers.length === 0 && !isLoading && (
              <div className="text-center py-10">
                <Users className="w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">
                  No users found
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
