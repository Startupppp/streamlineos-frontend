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
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useChatOrgUsers,
  useAddChannelMember,
  useChannelInviteLink,
  useRegenerateInviteLink,
} from "@/hooks/api";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";

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

  const handleRegenerateLink = useCallback(async () => {
    try {
      await regenerateInviteLink.mutateAsync(channelId);
      toast.success("Generated a new invite link");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [regenerateInviteLink, channelId]);

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-[16px]">Add members</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3">
          <div className="min-w-0 bg-muted/30 border-border/30">
          <SearchInput fill placeholder="Search people..." value={search} onValueChange={setSearch} autoFocus />
        </div>
        </div>

        <ScrollArea className="h-[280px] border-t border-border/30">
          <div className="p-1">
            {filteredUsers.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-8 px-4">
                {availableUsers.length === 0
                  ? "Everyone in your org is already in this channel."
                  : "No people match your search."}
              </p>
            ) : (
              filteredUsers.map((user) => {
                const selected = selectedIds.has(user.id);
                return (
                  <button
                    key={user.id}
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
                      <AvatarFallback className="text-[9px]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <TruncatedText text={user.name ?? ""} className="text-[13px] font-medium" />
                      <TruncatedText text={user.email ?? ""} className="text-[11px] text-muted-foreground" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {isAdmin && (
          <div className="px-4 py-3 border-t border-border/30">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
              Invite link
            </p>
            {isInviteLinkLoading ? (
              <div className="h-9 flex items-center px-3 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Loading link...
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={inviteUrl ?? ""}
                  className="text-[12px] bg-muted/30 border-border/30 flex-1 truncate"
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
            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
              Anyone signed in to your org with this link can join this channel.
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
