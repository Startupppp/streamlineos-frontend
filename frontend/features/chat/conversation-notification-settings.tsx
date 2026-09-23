"use client";

import Link from "next/link";
import { useCallback } from "react";
import { BellOff, BellRing, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMuteChannel,
  useSetNotificationPreference,
  useUnmuteChannel,
} from "@/hooks/api/chat-personal-b";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ChatNotificationPreference } from "@/types/chat";
import {
  CHAT_NOTIFICATION_OPTIONS,
  isChatNotificationPreference,
} from "./chat-notification-preferences";

const MUTE_OPTIONS = [
  { label: "15 minutes", value: "15m" },
  { label: "1 hour", value: "1h" },
  { label: "8 hours", value: "8h" },
  { label: "24 hours", value: "24h" },
  { label: "Forever", value: "forever" },
] as const;

interface ConversationNotificationSettingsProps {
  channelId: number;
  mutedUntil?: string | null;
  preference?: ChatNotificationPreference;
}

export function ConversationNotificationSettings({
  channelId,
  mutedUntil,
  preference = "DEFAULT",
}: ConversationNotificationSettingsProps) {
  const muteChannel = useMuteChannel();
  const unmuteChannel = useUnmuteChannel();
  const setPreference = useSetNotificationPreference();
  const isMuted = Boolean(mutedUntil && new Date(mutedUntil) > new Date());

  const handlePreferenceChange = useCallback(
    async (value: string) => {
      if (!isChatNotificationPreference(value)) return;
      try {
        await setPreference.mutateAsync({ channelId, preference: value });
        toast.success("Conversation notifications updated");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [channelId, setPreference],
  );

  const handleUnmute = useCallback(async () => {
    try {
      await unmuteChannel.mutateAsync(channelId);
      toast.success("Conversation unmuted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [channelId, unmuteChannel]);

  const handleMute = useCallback(
    async (duration: (typeof MUTE_OPTIONS)[number]["value"]) => {
      try {
        await muteChannel.mutateAsync({ channelId, duration });
        toast.success("Conversation muted");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [channelId, muteChannel],
  );

  return (
    <section className="mt-4 border-t border-border/30 pt-4" aria-labelledby="conversation-notifications-heading">
      <h5
        id="conversation-notifications-heading"
        className="mb-3 flex items-center gap-1.5 px-1 text-dense font-bold uppercase tracking-wider text-muted-foreground"
      >
        {isMuted ? <BellOff className="size-3" /> : <BellRing className="size-3" />}
        Notifications
      </h5>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="conversation-notification-preference" className="px-1 text-xs font-medium">
            Notify me about
          </label>
          <Select
            value={preference}
            onValueChange={handlePreferenceChange}
            disabled={setPreference.isPending}
          >
            <SelectTrigger id="conversation-notification-preference" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHAT_NOTIFICATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="px-1 text-dense text-muted-foreground">
            {CHAT_NOTIFICATION_OPTIONS.find((option) => option.value === preference)?.description}
          </p>
        </div>

        {isMuted ? (
          <div className="space-y-2">
            <p className="px-1 text-xs text-muted-foreground">
              Muted until{" "}
              {mutedUntil && new Date(mutedUntil).getFullYear() >= 2099
                ? "forever"
                : mutedUntil
                  ? new Date(mutedUntil).toLocaleString()
                  : ""}
            </p>
            <LoadingButton
              variant="outline"
              size="sm"
              className="h-8 w-full text-xs"
              onClick={handleUnmute}
              isPending={unmuteChannel.isPending}
            >
              Unmute conversation
            </LoadingButton>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {MUTE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => void handleMute(option.value)}
                disabled={muteChannel.isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border/50 px-2 text-dense font-medium transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                Mute {option.label}
              </button>
            ))}
          </div>
        )}

        <Link
          href="/settings/notifications/my-preferences"
          className="flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <UserRoundCog className="size-3.5" />
          Profile notification preferences
        </Link>
      </div>
    </section>
  );
}
