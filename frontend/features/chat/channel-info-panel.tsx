"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Archive,
  ArchiveRestore,
  Bookmark,
  Pencil,
} from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import { useChatChannel, useChatOnlineUsers } from "@/hooks/api/chat-core-read";
import { useChatPins, useUnpinMessage } from "@/hooks/api/chat-search";
import { useArchiveChannel, useUnarchiveChannel } from "@/hooks/api/chat-personal-b";
import { useCan } from "@/hooks/api/access";
import { resolveImageUrl } from "@/lib/utils";
import { ChannelInfoPanelProfile } from "./channel-info-panel-profile";
import { ChannelMembersSection } from "./channel-members-section";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getInitials } from "@/lib/format-utils";
import { ConversationNotificationSettings } from "./conversation-notification-settings";
import { ChatPanelFallback } from "./chat-lazy-fallbacks";

const SharedFilesPanel = dynamic(
  () => import("./shared-files-panel").then((m) => ({ default: m.SharedFilesPanel })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading shared files" /> },
);

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
  const { data: pins } = useChatPins(channelId);
  const unpinMessage = useUnpinMessage();
  const archiveChannel = useArchiveChannel();
  const unarchiveChannel = useUnarchiveChannel();
  const canPin = useCan("chat:messages:pin");
  const [editing, setEditing] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [unpinMessageId, setUnpinMessageId] = useState<number | null>(null);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers],
  );

  const myMember = channel?.members?.find((m) => m.user?.id === currentUserId);
  const isArchivedForMe = Boolean(myMember?.archivedAt);

  async function handleConfirmArchive() {
    try {
      await archiveChannel.mutateAsync(channelId);
      setConfirmArchiveOpen(false);
      toast.success("Chat archived");
      onArchived?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleUnarchive() {
    try {
      await unarchiveChannel.mutateAsync(channelId);
      toast.success("Chat unarchived");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleRequestArchive() {
    setConfirmArchiveOpen(true);
  }

  function handleStartEditing() {
    setEditing(true);
  }

  function requestUnpinHandler(messageId: number): () => void {
    return function handleRequestUnpin(): void {
      setUnpinMessageId(messageId);
    };
  }

  function handleUnpinOpenChange(open: boolean) {
    if (!open) setUnpinMessageId(null);
  }

  function handleConfirmUnpin() {
    if (unpinMessageId === null) return;
    unpinMessage.mutate({ channelId, messageId: unpinMessageId });
    setUnpinMessageId(null);
  }

  const isAdmin = channel?.members?.some(
    (m) => m.user?.id === currentUserId && m.role === "ADMIN",
  );
  const isMultiMemberChannel = channel?.type !== "DIRECT";

  return (
    <div className="flex h-full w-80 min-w-0 flex-col overflow-hidden">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold">Details</h3>
        <div className="flex items-center gap-1">
          {isAdmin && isMultiMemberChannel && !editing && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="p-1.5 hover:bg-muted rounded-lg"
              title="Edit channel"
              aria-label="Edit channel"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <AnimatedIconButton
            type="button"
            icon={XIcon}
            iconSize={16}
            variant="ghost"
            onClick={onClose}
            className="size-8 rounded-lg p-0 text-muted-foreground"
            aria-label="Close details"
          />
        </div>
      </div>

      <Tabs defaultValue="about" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="shrink-0 px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="about" className="mt-0 flex min-h-0 flex-1 flex-col">
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
                        {canPin ? (
                          <AnimatedIconButton
                            type="button"
                            icon={XIcon}
                            iconSize={12}
                            variant="ghost"
                            onClick={requestUnpinHandler(pin.messageId)}
                            className="size-7 shrink-0 rounded p-0 text-muted-foreground hover:text-foreground"
                            title="Unpin"
                            aria-label="Unpin message"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ChannelMembersSection
                channelId={channelId}
                currentUserId={currentUserId}
                members={channel?.members ?? []}
                isAdmin={Boolean(isAdmin)}
                isMultiMemberChannel={isMultiMemberChannel}
                onlineUserIds={onlineUserIds}
                onLeftChannel={onLeftChannel}
                onClose={onClose}
              />

              {channel && myMember && (
                <ConversationNotificationSettings
                  channelId={channelId}
                  mutedUntil={myMember.mutedUntil}
                  preference={myMember.notificationPreference}
                />
              )}

              {channel?.createdAt && (
                <div className="mt-6 pt-4 border-t border-border/30">
                  <p className="text-dense text-muted-foreground text-center">
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
                    onClick={handleRequestArchive}
                    isPending={archiveChannel.isPending}
                  >
                    {!archiveChannel.isPending && <Archive className="h-3.5 w-3.5 mr-1.5" />}
                    Archive chat
                  </LoadingButton>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="mt-0 flex min-h-0 flex-1 flex-col">
          <SharedFilesPanel channelId={channelId} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmArchiveOpen}
        onOpenChange={setConfirmArchiveOpen}
        title="Archive this chat?"
        description="It moves out of your conversation list into Archive. You can unarchive it from there at any time."
        confirmLabel="Archive"
        destructive
        isPending={archiveChannel.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmArchive}
      />

      <ConfirmDialog
        open={unpinMessageId !== null}
        onOpenChange={handleUnpinOpenChange}
        title="Unpin this message?"
        description="It is removed from the pinned list for everyone in the conversation."
        confirmLabel="Unpin"
        destructive
        onConfirm={handleConfirmUnpin}
      />
    </div>
  );
}
