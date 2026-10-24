"use client";

import { useCallback, useState } from "react";
import { Bell, BellOff, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useMuteChannel,
  useSetNotificationPreference,
  useUnmuteChannel,
} from "@/hooks/api/chat-settings";
import type { ChatNotificationPreference } from "@/types/chat";
import {
  CHAT_NOTIFICATION_OPTIONS,
  isChatNotificationPreference,
} from "./chat-notification-preferences";

const MENU_ITEM_CLASS =
  "relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-2.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none md:py-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

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
  onRequestClose,
}: {
  channelId: number;
  isMuted: boolean;
  notificationPreference: ChatNotificationPreference;
  onRequestClose?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [muteExpanded, setMuteExpanded] = useState(false);
  const muteChannel = useMuteChannel();
  const unmuteChannel = useUnmuteChannel();
  const setNotificationPreference = useSetNotificationPreference();

  const handleMute = useCallback(
    async (duration: MuteDuration) => {
      try {
        await muteChannel.mutateAsync({ channelId, duration });
        toast.success("Conversation muted");
        onRequestClose?.();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [muteChannel, channelId, onRequestClose],
  );

  const handleUnmute = useCallback(async () => {
    try {
      await unmuteChannel.mutateAsync(channelId);
      toast.success("Conversation unmuted");
      onRequestClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [unmuteChannel, channelId, onRequestClose]);

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
    <div>
      <button
        type="button"
        role="menuitem"
        aria-expanded={expanded}
        className={MENU_ITEM_CLASS}
        onClick={() => setExpanded((value) => !value)}
      >
        {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        <span className="flex-1 text-left">Notification Settings</span>
        <ChevronRight
          className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
          aria-hidden="true"
        />
      </button>

      {expanded ? (
        <div className="ml-2 border-l border-border/60 pl-1">
          {isMuted ? (
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => void handleUnmute()}
            >
              Unmute Conversation
            </button>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                aria-expanded={muteExpanded}
                className={MENU_ITEM_CLASS}
                onClick={() => setMuteExpanded((value) => !value)}
              >
                <span className="flex-1 text-left">Mute Conversation</span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    muteExpanded && "rotate-90",
                  )}
                  aria-hidden="true"
                />
              </button>
              {muteExpanded
                ? MUTE_DURATIONS.map((duration) => (
                    <button
                      key={duration.value}
                      type="button"
                      role="menuitem"
                      className={cn(MENU_ITEM_CLASS, "pl-4")}
                      onClick={() => void handleMute(duration.value)}
                    >
                      {duration.label}
                    </button>
                  ))
                : null}
            </>
          )}

          <div role="separator" className="my-1 h-px bg-border" />
          <p className="px-2 py-1 text-dense font-semibold text-muted-foreground">
            Notify me about
          </p>
          {CHAT_NOTIFICATION_OPTIONS.map((option) => {
            const checked = notificationPreference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                className={MENU_ITEM_CLASS}
                onClick={() => void handleNotificationPreferenceChange(option.value)}
              >
                <Check
                  className={cn("h-4 w-4", checked ? "opacity-100" : "opacity-0")}
                  aria-hidden="true"
                />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
