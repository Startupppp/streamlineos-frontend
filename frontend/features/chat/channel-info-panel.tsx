"use client";

import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Archive,
  ArchiveRestore,
  BellOff,
  BellRing,
  Bookmark,
  Pencil,
} from "lucide-react";
import { XIcon, UserPlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import {
  useChatChannel,
  useChatOnlineUsers,
  useChatPins,
  useUnpinMessage,
  useArchiveChannel,
  useUnarchiveChannel,
  useMuteChannel,
  useUnmuteChannel,
  useRemoveChannelMember,
  useActiveHuddle,
} from "@/hooks/api";
import type { ChannelMember } from "@/types/chat";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";
import { AddChannelMembersDialog } from "./add-channel-members-dialog";
import { ChannelMemberRow } from "./channel-member-row";
import { ChannelInfoPanelProfile } from "./channel-info-panel-profile";
import { TruncatedText } from "@/components/ui/truncated-text";

const CloseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function CloseButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <XIcon ref={iconRef} size={16} className="text-muted-foreground" />
    </button>
  );
});

const UnpinButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function UnpinButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <XIcon ref={iconRef} size={12} />
    </button>
  );
});

const AddMemberButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function AddMemberButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} type="button" {...hoverHandlers} className={className} {...props}>
      <UserPlusIcon ref={iconRef} size={14} />
      Add
    </button>
  );
});

export function ChannelInfoPanel({
  channelId,
  currentUserId,
  onClose,
  onLeftChannel,
  onArchived,
}: {
  channelId: number;
  currentUserId: string;
  onClose: () => void;
  onLeftChannel?: () => void;
  onArchived?: () => void;
}) {
  const { data: channel } = useChatChannel(channelId);
  const { data: onlineUsers } = useChatOnlineUsers();
  const { data: activeHuddle } = useActiveHuddle(channelId);
  const { data: pins } = useChatPins(channelId);
  const unpinMessage = useUnpinMessage();
  const archiveChannel = useArchiveChannel();
  const unarchiveChannel = useUnarchiveChannel();
  const muteChannel = useMuteChannel();
  const unmuteChannel = useUnmuteChannel();
  const removeMember = useRemoveChannelMember();
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers],
  );

  const mutedInCallUserIds = useMemo(
    () =>
      new Set(
        (activeHuddle?.participants ?? [])
          .filter((p) => !p.leftAt && p.isMuted)
          .map((p) => p.userId),
      ),
    [activeHuddle],
  );

  const { onlineMembers, offlineMembers } = useMemo(() => {
    const members = channel?.members ?? [];
    const byName = (a: ChannelMember, b: ChannelMember) =>
      (a.user?.name ?? "").localeCompare(b.user?.name ?? "");
    const online = members
      .filter((m) => onlineUserIds.has(m.user?.id ?? ""))
      .sort(byName);
    const offline = members
      .filter((m) => !onlineUserIds.has(m.user?.id ?? ""))
      .sort(byName);
    return { onlineMembers: online, offlineMembers: offline };
  }, [channel?.members, onlineUserIds]);

  const myMember = channel?.members?.find((m) => m.user?.id === currentUserId);
  const isArchivedForMe = Boolean(myMember?.archivedAt);

  const handleArchive = useCallback(async () => {
    try {
      await archiveChannel.mutateAsync(channelId);
      toast.success("Chat archived");
      onArchived?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [archiveChannel, channelId, onArchived]);

  const handleUnarchive = useCallback(async () => {
    try {
      await unarchiveChannel.mutateAsync(channelId);
      toast.success("Chat unarchived");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [unarchiveChannel, channelId]);

  const isAdmin = channel?.members?.some(
    (m) => m.user?.id === currentUserId && m.role === "ADMIN",
  );
  const isMultiMemberChannel = channel?.type !== "DIRECT";

  const existingMemberIds = useMemo(
    () => new Set(channel?.members?.map((m) => m.user?.id).filter(Boolean) as string[]),
    [channel?.members],
  );

  const handleRemoveMember = useCallback(
    async (userId: string, userName: string | null | undefined, isYou: boolean) => {
      const label = isYou ? "leave this channel" : `remove ${userName ?? "this member"}`;
      if (!window.confirm(`Are you sure you want to ${label}?`)) return;

      setRemovingUserId(userId);
      try {
        await removeMember.mutateAsync({ channelId, userId });
        toast.success(isYou ? "You left the channel" : "Member removed");
        if (isYou) {
          onLeftChannel?.();
          onClose();
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setRemovingUserId(null);
      }
    },
    [channelId, removeMember, onLeftChannel, onClose],
  );

  const [editing, setEditing] = useState(false);

  return (
    <div className="flex h-full w-80 min-w-0 flex-col overflow-hidden">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold">Details</h3>
        <div className="flex items-center gap-1">
          {isAdmin && isMultiMemberChannel && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 hover:bg-muted rounded-lg"
              title="Edit channel"
              aria-label="Edit channel"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <CloseButton
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg"
            aria-label="Close"
          />
        </div>
      </div>

      <ScrollArea className="min-w-0 flex-1">
        <div className="min-w-0 w-full max-w-full overflow-x-hidden p-4">
          <ChannelInfoPanelProfile
            channel={channel}
            currentUserId={currentUserId}
            isAdmin={Boolean(isAdmin)}
            onlineUserIds={onlineUserIds}
            editing={editing}
            onEditingChange={setEditing}
          />

          {pins && pins.length > 0 && (
            <div className="mb-6">
              <h5 className="text-dense font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
                <Bookmark className="h-3 w-3" />
                Pinned Messages ({pins.length})
              </h5>
              <div className="space-y-1.5">
                {pins.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-start gap-2.5 px-2 py-2 rounded-lg bg-muted/20 border border-border/20 hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarImage
                        src={resolveImageUrl(pin.message.sender?.image)}
                      />
                      <AvatarFallback className="text-micro font-bold">
                        {getInitials(pin.message.sender?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <TruncatedText text={pin.message.sender?.name ?? ""} className="text-dense font-semibold" />
                      <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                        {pin.message.content ??
                          (pin.message.attachments.length > 0
                            ? `${pin.message.attachments.length} attachment(s)`
                            : "")}
                      </p>
                    </div>
                    <UnpinButton
                      onClick={() =>
                        unpinMessage.mutate({
                          channelId,
                          messageId: pin.messageId,
                        })
                      }
                      className="shrink-0 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                      title="Unpin"
                      aria-label="Unpin message"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h5 className="text-dense font-bold text-muted-foreground uppercase tracking-wider">
                Members ({channel?.members?.length ?? 0})
              </h5>
              {isAdmin && isMultiMemberChannel && (
                <AddMemberButton
                  onClick={() => setShowAddMembers(true)}
                  className="inline-flex items-center gap-1 text-dense font-medium text-primary hover:text-primary/80 transition-colors"
                />
              )}
            </div>

            {onlineMembers.length > 0 && (
              <div className="mb-3">
                <p className="text-micro font-bold text-status-success-ink uppercase tracking-wider px-2 mb-1">
                  Online — {onlineMembers.length}
                </p>
                <div className="space-y-0.5">
                  {onlineMembers.map((m) => (
                    <ChannelMemberRow
                      key={m.user?.id}
                      member={m}
                      isOnline
                      isMutedInCall={mutedInCallUserIds.has(m.user?.id ?? "")}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      isMultiMemberChannel={isMultiMemberChannel}
                      isRemoving={removingUserId === m.user?.id}
                      onRemove={handleRemoveMember}
                    />
                  ))}
                </div>
              </div>
            )}

            {offlineMembers.length > 0 && (
              <div>
                <p className="text-micro font-bold text-muted-foreground/60 uppercase tracking-wider px-2 mb-1">
                  Offline — {offlineMembers.length}
                </p>
                <div className="space-y-0.5">
                  {offlineMembers.map((m) => (
                    <ChannelMemberRow
                      key={m.user?.id}
                      member={m}
                      isOnline={false}
                      isMutedInCall={mutedInCallUserIds.has(m.user?.id ?? "")}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      isMultiMemberChannel={isMultiMemberChannel}
                      isRemoving={removingUserId === m.user?.id}
                      onRemove={handleRemoveMember}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {channel?.type !== "DIRECT" &&
            (() => {
              const myMember = channel?.members?.find(
                (m) => m.user?.id === currentUserId,
              );
              const mutedUntil = myMember?.mutedUntil;
              const isMuted =
                mutedUntil !== null &&
                mutedUntil !== undefined &&
                new Date(mutedUntil) > new Date();
              const MUTE_OPTIONS = [
                { label: "15 minutes", value: "15m" },
                { label: "1 hour", value: "1h" },
                { label: "8 hours", value: "8h" },
                { label: "24 hours", value: "24h" },
                { label: "Forever", value: "forever" },
              ];
              return (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <h5 className="text-dense font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
                    {isMuted ? (
                      <BellOff className="h-3 w-3" />
                    ) : (
                      <BellRing className="h-3 w-3" />
                    )}
                    Notifications
                  </h5>
                  {isMuted ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground px-1">
                        Muted until{" "}
                        {mutedUntil &&
                        new Date(mutedUntil).getFullYear() >= 2099
                          ? "forever"
                          : mutedUntil
                            ? new Date(mutedUntil).toLocaleString()
                            : ""}
                      </p>
                      <LoadingButton
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => unmuteChannel.mutate(channelId)}
                        isPending={unmuteChannel.isPending}
                      >
                        Unmute
                      </LoadingButton>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {MUTE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            muteChannel.mutate({
                              channelId,
                              duration: opt.value,
                            })
                          }
                          disabled={muteChannel.isPending}
                          className="inline-flex h-8 items-center justify-center px-2 rounded-lg border border-border/50 text-dense font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

          {channel?.createdAt && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-dense text-muted-foreground/50 text-center">
                {channel.type === "GROUP"
                  ? `Created ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`
                  : `Started ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`}
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border/30">
            {isArchivedForMe ? (
              <LoadingButton
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleUnarchive}
                isPending={unarchiveChannel.isPending}
              >
                {!unarchiveChannel.isPending && <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />}
                Unarchive chat
              </LoadingButton>
            ) : (
              <LoadingButton
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleArchive}
                isPending={archiveChannel.isPending}
              >
                {!archiveChannel.isPending && <Archive className="h-3.5 w-3.5 mr-1.5" />}
                Archive chat
              </LoadingButton>
            )}
          </div>
        </div>
      </ScrollArea>

      <AddChannelMembersDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        channelId={channelId}
        existingMemberIds={existingMemberIds}
        isAdmin={isAdmin}
      />
    </div>
  );
}
