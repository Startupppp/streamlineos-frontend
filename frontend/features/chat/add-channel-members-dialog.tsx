"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useChatOrgUsers } from "@/hooks/api/chat-core-read";
import { useAddChannelMember } from "@/hooks/api/chat-core-mutations-b";
import {
  useChannelInviteLink,
  useRegenerateInviteLink,
} from "@/hooks/api/chat-personal-b";
import { cn, resolveImageUrl } from "@/lib/utils";
import { ChatUserVirtualList } from "./chat-user-virtual-list";
import type { OrgUser } from "@/types/chat";
import { getInitials } from "@/lib/format-utils";

const INVITE_EXPIRY_OPTIONS = [
  { value: "never", label: "Never expires", ttlSeconds: undefined },
  { value: "24h", label: "Expires in 24 hours", ttlSeconds: 24 * 60 * 60 },
  { value: "7d", label: "Expires in 7 days", ttlSeconds: 7 * 24 * 60 * 60 },
  { value: "30d", label: "Expires in 30 days", ttlSeconds: 30 * 24 * 60 * 60 },
] as const;

const MEMBER_LIST_BOX_HEIGHT = 280;
const MEMBER_LIST_PADDING = 8;
const MEMBER_ROW_HEIGHT = 52;

interface AddChannelMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  existingMemberIds: Set<string>;
  isAdmin?: boolean;
}

export function AddChannelMembersDialog({
  open,
  onOpenChange,
  channelId,
  existingMemberIds,
  isAdmin = false,
}: AddChannelMembersDialogProps) {
  const { data: orgUsers } = useChatOrgUsers(open);
  const addMember = useAddChannelMember();
  const { data: inviteLink, isLoading: isInviteLinkLoading } = useChannelInviteLink(
    channelId,
    open && isAdmin,
  );
  const regenerateInviteLink = useRegenerateInviteLink();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expiry, setExpiry] = useState<string>("never");

  const inviteUrl = useMemo(() => {
    if (!inviteLink?.token || typeof window === "undefined") return null;
    return `${window.location.origin}/chat/invite/${inviteLink.token}`;
  }, [inviteLink?.token]);

  const handleCopyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [inviteUrl]);

  const handleExpiryChange = useCallback((value: string) => {
    setExpiry(value);
  }, []);

  const handleRegenerateLink = useCallback(async () => {
    const ttlSeconds = INVITE_EXPIRY_OPTIONS.find((o) => o.value === expiry)?.ttlSeconds;
    try {
      await regenerateInviteLink.mutateAsync({ channelId, ttlSeconds });
      toast.success(
        ttlSeconds === undefined
          ? "Generated a new invite link"
          : "Generated a new invite link with an expiry",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [regenerateInviteLink, channelId, expiry]);

  const availableUsers = useMemo(() => {
    if (!orgUsers) return [];
    return orgUsers.filter((u) => !existingMemberIds.has(u.id));
  }, [orgUsers, existingMemberIds]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return availableUsers;
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [availableUsers, search]);

  const toggleUser = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSearch("");
        setSelectedIds(new Set());
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleAdd = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const userId of selectedIds) {
        await addMember.mutateAsync({ channelId, userId });
      }
      toast.success(
        `Added ${selectedIds.size} member${selectedIds.size !== 1 ? "s" : ""}`,
      );
      handleClose(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [selectedIds, addMember, channelId, handleClose]);

  const renderUser = useCallback(
    (user: OrgUser) => {
      const selected = selectedIds.has(user.id);
      return (
        <button
          type="button"
          onClick={() => toggleUser(user.id)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors",
            selected && "bg-primary/5",
          )}
        >
          <div
            className={cn(
              "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
              selected
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border/60",
            )}
          >
            {selected && <Check className="h-3 w-3" />}
          </div>
          <Avatar className="w-7 shrink-0">
            <AvatarImage src={resolveImageUrl(user.image)} />
            <AvatarFallback className="text-micro">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <TruncatedText text={user.name ?? ""} className="text-label font-medium" />
            <TruncatedText text={user.email ?? ""} className="text-dense text-muted-foreground" />
          </div>
        </button>
      );
    },
    [selectedIds, toggleUser],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-base">Add members</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3">
          <div className="min-w-0 bg-muted/30 border-border/30">
          <SearchInput fill placeholder="Search people..." value={search} onValueChange={setSearch} autoFocus />
        </div>
        </div>

        <div
          className="border-t border-border/30 p-1"
          style={{ height: MEMBER_LIST_BOX_HEIGHT }}
        >
          {filteredUsers.length === 0 ? (
            <p className="text-label text-muted-foreground text-center py-8 px-4">
              {availableUsers.length === 0
                ? "Everyone in your org is already in this channel."
                : "No people match your search."}
            </p>
          ) : (
            <ChatUserVirtualList
              users={filteredUsers}
              rowHeight={MEMBER_ROW_HEIGHT}
              listHeight={MEMBER_LIST_BOX_HEIGHT - MEMBER_LIST_PADDING}
              ariaLabel="People you can add to this channel"
              renderUser={renderUser}
            />
          )}
        </div>

        {isAdmin && (
          <div className="px-4 py-3 border-t border-border/30">
            <p className="text-dense font-medium text-muted-foreground mb-1.5">
              Invite link
            </p>
            {isInviteLinkLoading ? (
              <div className="h-9 flex items-center px-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Loading link...
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={inviteUrl ?? ""}
                  className="text-xs bg-muted/30 border-border/30 flex-1 truncate"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <AnimatedIconButton
                  icon={CopyIcon}
                  iconSize={14}
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleCopyLink}
                  disabled={!inviteUrl}
                  title="Copy link"
                  aria-label="Copy invite link"
                />
                <LoadingButton
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleRegenerateLink}
                  isPending={regenerateInviteLink.isPending}
                  title="Generate new link"
                  aria-label="Generate new invite link"
                >
                  {!regenerateInviteLink.isPending && <RefreshCw className="h-3.5 w-3.5" />}
                </LoadingButton>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Select value={expiry} onValueChange={handleExpiryChange}>
                <SelectTrigger className="flex-1" aria-label="Invite link expiry">
                  <SelectValue placeholder="Select an expiry" />
                </SelectTrigger>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {INVITE_EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-micro text-muted-foreground/70 mt-1.5">
              Anyone signed in to your org with this link can join this channel. The expiry applies
              to the next link you generate; the current link keeps the expiry it was created with.
            </p>
          </div>
        )}

        <div className="px-4 py-3 border-t border-border/30 flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="flex-1 h-9"
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            isPending={addMember.isPending}
            loadingText="Adding…"
            className="flex-1 h-9"
          >
            {`Add${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
