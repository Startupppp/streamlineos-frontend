"use client";

import { useCallback } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMuteChannel,
  useSetNotificationPreference,
  useUnmuteChannel,
} from "@/hooks/api/chat-personal-b";
import type { ChatNotificationPreference } from "@/types/chat";
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

export function ChannelNotificationSubmenu({
  channelId,
  isMuted,
  notificationPreference,
}: {
  channelId: number;
  isMuted: boolean;
  notificationPreference: ChatNotificationPreference;
}) {
  const muteChannel = useMuteChannel();
  const unmuteChannel = useUnmuteChannel();
  const setNotificationPreference = useSetNotificationPreference();

  const handleMute = useCallback(
    async (duration: MuteDuration) => {
      try {
        await muteChannel.mutateAsync({ channelId, duration });
        toast.success("Conversation muted");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [muteChannel, channelId],
  );

  const handleUnmute = useCallback(
    async (event: Event) => {
      event.preventDefault();
      try {
        await unmuteChannel.mutateAsync(channelId);
        toast.success("Conversation unmuted");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [unmuteChannel, channelId],
  );

  const handleNotificationPreferenceChange = useCallback(
    async (value: string) => {
      try {
        if (!isChatNotificationPreference(value)) return;
        await setNotificationPreference.mutateAsync({
          channelId,
          preference: value,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [setNotificationPreference, channelId],
  );

  return (
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
  );
}
