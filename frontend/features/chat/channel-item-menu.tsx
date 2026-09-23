"use client";

import { useCallback, useMemo, useState } from "react";
import type React from "react";
import {
  Bell,
  BellOff,
  EyeOff,
  Phone,
  Settings,
  Star,
  UserPlus,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useArchiveChannel,
  useFavoriteChannel,
  useMuteChannel,
  useSetNotificationPreference,
  useUnfavoriteChannel,
  useUnmuteChannel,
} from "@/hooks/api/chat-personal-b";
import { AddChannelMembersDialog } from "./add-channel-members-dialog";
import type { Channel } from "./chat-types";
import {
  CHAT_NOTIFICATION_OPTIONS,
  isChatNotificationPreference,
} from "./chat-notification-preferences";

const MUTE_DURATIONS: { value: "15m" | "1h" | "8h" | "24h" | "forever"; label: string }[] = [
  { value: "15m", label: "For 15 minutes" },
  { value: "1h", label: "For 1 hour" },
  { value: "8h", label: "For 8 hours" },
  { value: "24h", label: "For 24 hours" },
  { value: "forever", label: "Until turned back on" },
];

type MuteDuration = (typeof MUTE_DURATIONS)[number]["value"];

function MuteDurationItem({
  duration,
  label,
  onMute,
}: {
  duration: MuteDuration;
  label: string;
  onMute: (duration: MuteDuration) => void;
}) {
  const handleSelect = useCallback(
    (event: Event) => {
      event.preventDefault();
      onMute(duration);
    },
    [onMute, duration],
  );
  return <DropdownMenuItem onSelect={handleSelect}>{label}</DropdownMenuItem>;
}

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const favoriteChannel = useFavoriteChannel();
  const unfavoriteChannel = useUnfavoriteChannel();
  const muteChannel = useMuteChannel();
  const unmuteChannel = useUnmuteChannel();
  const setNotificationPreference = useSetNotificationPreference();
  const archiveChannel = useArchiveChannel();

  const myMembership = useMemo(
    () => channel.members?.find((m) => m.user?.id === currentUserId),
    [channel.members, currentUserId],
  );
  const isAdmin = myMembership?.role === "ADMIN";
  const isFavorite = Boolean(myMembership?.isFavorite);
  const isMuted = Boolean(myMembership?.mutedUntil && new Date(myMembership.mutedUntil) > new Date());
  const notificationPreference = myMembership?.notificationPreference ?? "DEFAULT";

  const existingMemberIds = useMemo(
    () => new Set((channel.members ?? []).map((m) => m.user?.id).filter(Boolean) as string[]),
    [channel.members],
  );

  const handleToggleFavorite = useCallback(
    async (event: Event) => {
      event.preventDefault();
      try {
        if (isFavorite) {
          await unfavoriteChannel.mutateAsync(channel.id);
          toast.success("Removed from favorites");
        } else {
          await favoriteChannel.mutateAsync(channel.id);
          toast.success("Added to favorites");
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [isFavorite, favoriteChannel, unfavoriteChannel, channel.id],
  );

  const handleMute = useCallback(
    async (duration: MuteDuration) => {
      try {
        await muteChannel.mutateAsync({ channelId: channel.id, duration });
        toast.success("Conversation muted");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [muteChannel, channel.id],
  );

  const handleMuteDuration = useCallback(
    (duration: MuteDuration) => { void handleMute(duration); },
    [handleMute],
  );

  const handleUnmute = useCallback(
    async (event: Event) => {
      event.preventDefault();
      try {
        await unmuteChannel.mutateAsync(channel.id);
        toast.success("Conversation unmuted");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [unmuteChannel, channel.id],
  );

  const handleNotificationPreferenceChange = useCallback(
    async (value: string) => {
      try {
        if (!isChatNotificationPreference(value)) return;
        await setNotificationPreference.mutateAsync({
          channelId: channel.id,
          preference: value,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [setNotificationPreference, channel.id],
  );

  const handleHideUntilUnread = useCallback(
    async (event: Event) => {
      event.preventDefault();
      try {
        await archiveChannel.mutateAsync(channel.id);
        toast.success("Hidden until the next message");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [archiveChannel, channel.id],
  );

  const handleStartCall = useCallback(
    (event: Event) => {
      event.preventDefault();
      onStartCall?.(channel.id, "huddle");
    },
    [onStartCall, channel.id],
  );

  const handleStopPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const handleOpenInvite = useCallback((event: Event) => {
    event.preventDefault();
    setInviteOpen(true);
  }, []);

  const handleOpenSettings = useCallback(
    (event: Event) => {
      event.preventDefault();
      onOpenSettings?.(channel.id);
    },
    [onOpenSettings, channel.id],
  );

  const { iconRef: menuIconRef, hoverHandlers: menuHoverHandlers } = useAnimatedIcon();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label="Conversation options"
            className="absolute right-2 top-[11px] z-10 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/90 opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-all duration-150 data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto"
            {...menuHoverHandlers}
          >
            <EllipsisIcon ref={menuIconRef} size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={handleStartCall}>
            <Phone className="h-4 w-4" />
            Start Call
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleOpenInvite}>
            <UserPlus className="h-4 w-4" />
            Invite People
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleFavorite}>
            <Star className={isFavorite ? "h-4 w-4 fill-amber-400 text-status-warning-ink" : "h-4 w-4"} />
            {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              Notification Settings
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {isMuted ? (
                <DropdownMenuItem onSelect={handleUnmute}>Unmute Conversation</DropdownMenuItem>
              ) : (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Mute Conversation</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {MUTE_DURATIONS.map((duration) => (
                      <DropdownMenuItem
                        key={duration.value}
                        onSelect={(event) => {
                          event.preventDefault();
                          void handleMute(duration.value);
                        }}
                      >
                        {duration.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-dense font-semibold text-muted-foreground">
                Notify me about
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={notificationPreference}
                onValueChange={handleNotificationPreferenceChange}
              >
                {CHAT_NOTIFICATION_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={handleOpenSettings}>
            <Settings className="h-4 w-4" />
            Advanced Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleHideUntilUnread}>
            <EyeOff className="h-4 w-4" />
            Hide Until New Message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
