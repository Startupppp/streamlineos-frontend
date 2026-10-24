"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CircleDot,
  EyeOff,
  Phone,
  Settings,
  Star,
  UserPlus,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useArchiveChannel,
  useFavoriteChannel,
  useMarkChannelUnread,
  useUnfavoriteChannel,
} from "@/hooks/api/chat-settings";
import { AddChannelMembersDialog } from "./add-channel-members-dialog";
import type { Channel } from "@/types/chat";
import { ChannelNotificationSubmenu } from "./channel-notification-submenu";
import { conversationConfirmName } from "./channel-member-lookup";

const MENU_ITEM_CLASS =
  "relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-2.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none md:py-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

export function ChannelItemMenu({
  channel,
  currentUserId,
  onStartCall,
  onOpenSettings,
}: {
  channel: Channel;
  currentUserId: string;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmHideOpen, setConfirmHideOpen] = useState(false);
  const favoriteChannel = useFavoriteChannel();
  const unfavoriteChannel = useUnfavoriteChannel();
  const archiveChannel = useArchiveChannel();
  const markUnread = useMarkChannelUnread();

  const myMembership = useMemo(
    () => channel.members?.find((m) => m.user?.id === currentUserId),
    [channel.members, currentUserId],
  );
  const isAdmin = myMembership?.role === "ADMIN";
  const isMultiMemberChannel = channel.type !== "DIRECT";
  const isFavorite = Boolean(myMembership?.isFavorite);
  const isMuted = Boolean(myMembership?.mutedUntil && new Date(myMembership.mutedUntil) > new Date());
  const notificationPreference = myMembership?.notificationPreference ?? "DEFAULT";

  const existingMemberIds = useMemo(
    () => new Set((channel.members ?? []).map((m) => m.user?.id).filter(Boolean) as string[]),
    [channel.members],
  );

  const closeMenu = useCallback(() => setOpen(false), []);

  const handleToggleFavorite = useCallback(async () => {
    try {
      if (isFavorite) {
        await unfavoriteChannel.mutateAsync(channel.id);
        toast.success("Removed from Starred");
      } else {
        await favoriteChannel.mutateAsync(channel.id);
        toast.success("Added to Starred");
      }
      closeMenu();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [isFavorite, favoriteChannel, unfavoriteChannel, channel.id, closeMenu]);

  const handleRequestHide = useCallback(() => {
    closeMenu();
    setConfirmHideOpen(true);
  }, [closeMenu]);

  const handleHideUntilUnread = useCallback(async () => {
    try {
      await archiveChannel.mutateAsync(channel.id);
      toast.success("Hidden until the next message");
      setConfirmHideOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [archiveChannel, channel.id]);

  const handleMarkUnread = useCallback(async () => {
    try {
      await markUnread.mutateAsync(channel.id);
      toast.success("Marked as unread");
      closeMenu();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [markUnread, channel.id, closeMenu]);

  const handleStartCall = useCallback(() => {
    closeMenu();
    onStartCall?.(channel.id, "huddle");
  }, [onStartCall, channel.id, closeMenu]);

  const handleOpenInvite = useCallback(() => {
    closeMenu();
    setInviteOpen(true);
  }, [closeMenu]);

  const handleOpenSettings = useCallback(() => {
    closeMenu();
    onOpenSettings?.(channel.id);
  }, [onOpenSettings, channel.id, closeMenu]);

  const { iconRef: menuIconRef, hoverHandlers: menuHoverHandlers } = useAnimatedIcon();

  return (
    <>
      <ResponsivePopover open={open} onOpenChange={setOpen} collapseBelow="lg">
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label="Conversation options"
            className="absolute right-1 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-lg:pointer-events-auto max-lg:opacity-100 lg:pointer-events-none lg:size-9 lg:opacity-0 lg:group-hover/item:pointer-events-auto lg:group-hover/item:opacity-100 lg:group-focus-within/item:pointer-events-auto lg:group-focus-within/item:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
            {...menuHoverHandlers}
          >
            <EllipsisIcon ref={menuIconRef} size={14} />
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          align="end"
          title="Conversation options"
          showHeader
          className="w-[min(16rem,calc(100vw-2rem))] p-1 md:w-64"
        >
          <div
            role="menu"
            aria-label="Conversation options"
            className="flex flex-col gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={handleStartCall}
            >
              <Phone className="h-4 w-4" />
              Start Call
            </button>
            {channel.unreadCount === 0 ? (
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={() => void handleMarkUnread()}
              >
                <CircleDot className="h-4 w-4" />
                Mark as unread
              </button>
            ) : null}
            {isAdmin && isMultiMemberChannel ? (
              <>
                <div role="separator" className="my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  className={MENU_ITEM_CLASS}
                  onClick={handleOpenInvite}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite People
                </button>
              </>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => void handleToggleFavorite()}
            >
              <Star
                className={
                  isFavorite ? "h-4 w-4 fill-amber-400 text-status-warning-ink" : "h-4 w-4"
                }
              />
              {isFavorite ? "Remove from Starred" : "Add to Starred"}
            </button>
            <ChannelNotificationSubmenu
              channelId={channel.id}
              isMuted={isMuted}
              notificationPreference={notificationPreference}
              onRequestClose={closeMenu}
            />
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={handleOpenSettings}
            >
              <Settings className="h-4 w-4" />
              Advanced Settings
            </button>
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={handleRequestHide}
            >
              <EyeOff className="h-4 w-4" />
              Hide Until New Message
            </button>
          </div>
        </ResponsivePopoverContent>
      </ResponsivePopover>

      <ConfirmDialog
        open={confirmHideOpen}
        onOpenChange={setConfirmHideOpen}
        title={`Hide ${conversationConfirmName(channel, currentUserId)}?`}
        description="It moves to Archived and comes back when someone sends a new message."
        confirmLabel="Hide conversation"
        destructive
        keepOpenOnConfirm
        isPending={archiveChannel.isPending}
        onConfirm={handleHideUntilUnread}
      />

      <AddChannelMembersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        channelId={channel.id}
        existingMemberIds={existingMemberIds}
        isAdmin={isAdmin}
      />
    </>
  );
}
