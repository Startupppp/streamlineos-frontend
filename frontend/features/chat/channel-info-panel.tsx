"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Archive,
  ArchiveRestore,
  BellOff,
  BellRing,
  Bookmark,
  Camera,
  ImageIcon,
  Loader2,
  Pencil,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import {
  useChatChannel,
  useChatOnlineUsers,
  useUpdateChannel,
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
import { apiClient } from "@/lib/api-client";
import { getInitials } from "./chat-helpers";
import { AddChannelMembersDialog } from "./add-channel-members-dialog";
import { ChannelAvatar } from "./channel-avatar";
import { ChannelMemberRow } from "./channel-member-row";

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
  const updateChannel = useUpdateChannel();
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
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);
  const quickAvatarRef = useRef<HTMLInputElement>(null);

  const handleOpenAvatarInput = useCallback(() => {
    editAvatarRef.current?.click();
  }, []);
  const handleOpenQuickAvatarInput = useCallback(() => {
    quickAvatarRef.current?.click();
  }, []);
  const handleCancelEdit = useCallback(() => setEditing(false), []);
  const handleEditNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value),
    [],
  );
  const handleEditDescChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEditDesc(e.target.value),
    [],
  );

  const startEditing = () => {
    setEditName(channel?.name ?? "");
    setEditDesc(channel?.description ?? "");
    setEditAvatar(channel?.avatarUrl ?? "");
    setEditing(true);
  };

  const handleEditAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    saveImmediately = false,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "chat-avatars");
      const data = await apiClient.upload<{ url?: string }>(
        "/storage/upload",
        formData,
      );
      if (!data.url) {
        toast.error("Upload failed");
        return;
      }
      if (saveImmediately) {
        await updateChannel.mutateAsync({ channelId, avatarUrl: data.url });
        toast.success("Channel photo updated");
      } else {
        setEditAvatar(data.url);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingAvatar(false);
      if (editAvatarRef.current) editAvatarRef.current.value = "";
      if (quickAvatarRef.current) quickAvatarRef.current.value = "";
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateChannel.mutateAsync({
        channelId,
        name: editName.trim() || undefined,
        description: editDesc.trim(),
        avatarUrl: editAvatar,
      });
      setEditing(false);
      toast.success("Channel updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const otherMember =
    channel?.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;
  const displayName =
    channel?.type === "DIRECT"
      ? (otherMember?.name ?? "Unknown")
      : (channel?.name ?? "Channel");

  return (
    <div className="flex flex-col h-full w-80">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <h3 className="text-[14px] font-bold">Details</h3>
        <div className="flex items-center gap-1">
          {isAdmin && isMultiMemberChannel && !editing && (
            <button
              onClick={startEditing}
              className="p-1.5 hover:bg-muted rounded-lg"
              title="Edit channel"
              aria-label="Edit channel"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {editing ? (
            <div className="space-y-4 mb-6">
              <div className="flex justify-center">
                <input
                  ref={editAvatarRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleEditAvatarUpload(e, false)}
                  className="hidden"
                  aria-label="Upload channel avatar"
                />
                <button
                  type="button"
                  onClick={handleOpenAvatarInput}
                  disabled={uploadingAvatar}
                  className="relative group"
                >
                  {editAvatar ? (
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-border/40">
                      <Image
                        src={resolveImageUrl(editAvatar) ?? ""}
                        alt="Avatar"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border border-blue/10">
                      {uploadingAvatar ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-blue/40" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Name
                </Label>
                <Input
                  value={editName}
                  onChange={handleEditNameChange}
                  className="h-8 text-[13px] bg-muted/30"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Description
                </Label>
                <Input
                  value={editDesc}
                  onChange={handleEditDescChange}
                  placeholder="Add a description..."
                  className="h-8 text-[13px] bg-muted/30"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="flex-1 h-8 text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateChannel.isPending || !editName.trim()}
                  className="flex-1 h-8 text-[12px]"
                >
                  {updateChannel.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center mb-6">
              <input
                ref={quickAvatarRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleEditAvatarUpload(e, true)}
                className="hidden"
                aria-label="Upload channel photo"
              />
              {channel?.type === "DIRECT" ? (
                <div className="mb-3">
                  <ChannelAvatar
                    type={channel.type}
                    otherMember={otherMember}
                    className="h-20 w-20"
                    rounded="2xl"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={isAdmin ? handleOpenQuickAvatarInput : undefined}
                  disabled={!isAdmin || uploadingAvatar}
                  className="relative group mb-3 disabled:cursor-default"
                  title={isAdmin ? "Change channel photo" : undefined}
                  aria-label={isAdmin ? "Change channel photo" : undefined}
                >
                  <ChannelAvatar
                    type={channel?.type}
                    name={channel?.name}
                    avatarUrl={channel?.avatarUrl}
                    className="h-20 w-20"
                    rounded="2xl"
                    iconClassName="h-8 w-8"
                  />
                  {isAdmin && (
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {uploadingAvatar ? (
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </div>
                  )}
                </button>
              )}
              <h4 className="text-[17px] font-bold">{displayName}</h4>
              {channel?.type === "DIRECT" ? (
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {otherMember
                    ? onlineUserIds.has(otherMember.id)
                      ? "Online"
                      : "Offline"
                    : ""}
                </p>
              ) : (
                channel?.description && (
                  <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">
                    {channel.description}
                  </p>
                )
              )}
            </div>
          )}

          {pins && pins.length > 0 && (
            <div className="mb-6">
              <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
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
                      <AvatarFallback className="text-[8px] font-bold">
                        {getInitials(pin.message.sender?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">
                        {pin.message.sender?.name}
                      </p>
                      <p className="text-[12px] text-muted-foreground line-clamp-2 break-words">
                        {pin.message.content ??
                          (pin.message.attachments.length > 0
                            ? `${pin.message.attachments.length} attachment(s)`
                            : "")}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        unpinMessage.mutate({
                          channelId,
                          messageId: pin.messageId,
                        })
                      }
                      className="shrink-0 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                      title="Unpin"
                      aria-label="Unpin message"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Members ({channel?.members?.length ?? 0})
              </h5>
              {isAdmin && isMultiMemberChannel && (
                <button
                  type="button"
                  onClick={() => setShowAddMembers(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>

            {onlineMembers.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider px-2 mb-1">
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
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 mb-1">
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
                  <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
                    {isMuted ? (
                      <BellOff className="h-3 w-3" />
                    ) : (
                      <BellRing className="h-3 w-3" />
                    )}
                    Notifications
                  </h5>
                  {isMuted ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] text-muted-foreground px-1">
                        Muted until{" "}
                        {mutedUntil &&
                        new Date(mutedUntil).getFullYear() >= 2099
                          ? "forever"
                          : mutedUntil
                            ? new Date(mutedUntil).toLocaleString()
                            : ""}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-[12px]"
                        onClick={() => unmuteChannel.mutate(channelId)}
                        disabled={unmuteChannel.isPending}
                      >
                        {unmuteChannel.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        ) : null}
                        Unmute
                      </Button>
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
                          className="h-7 px-2 rounded-lg border border-border/50 text-[11px] font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
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
              <p className="text-[11px] text-muted-foreground/50 text-center">
                {channel.type === "GROUP"
                  ? `Created ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`
                  : `Started ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`}
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border/30">
            {isArchivedForMe ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[12px]"
                onClick={handleUnarchive}
                disabled={unarchiveChannel.isPending}
              >
                {unarchiveChannel.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : (
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                )}
                Unarchive chat
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[12px]"
                onClick={handleArchive}
                disabled={archiveChannel.isPending}
              >
                {archiveChannel.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                )}
                Archive chat
              </Button>
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
