import type { Channel, ChatNotificationPreference } from "@/types/chat";

export type ChatAlertKind = "message" | "mention";

export type ChatAlertDecision =
  | "alert"
  | "own-message"
  | "active-channel"
  | "muted"
  | "preference";

const GENERAL_ALERTS_SUPPRESSED: ReadonlySet<ChatNotificationPreference> =
  new Set(["NOTHING", "MENTIONS"]);

export interface ChatViewerChannelState {
  readonly mutedUntil: Date | string | null;
  readonly notificationPreference: ChatNotificationPreference;
}

export function viewerChannelState(
  channel: Channel | undefined,
  currentUserId: string | undefined,
): ChatViewerChannelState | undefined {
  if (channel === undefined || currentUserId === undefined) return undefined;
  const mine = channel.members?.find((m) => m.user?.id === currentUserId);
  if (mine === undefined) return undefined;
  return {
    mutedUntil: mine.mutedUntil,
    notificationPreference: mine.notificationPreference,
  };
}

function muteIsActive(
  mutedUntil: Date | string | null,
  now: Date,
): boolean {
  if (mutedUntil === null) return false;
  const until = new Date(mutedUntil).getTime();
  if (Number.isNaN(until)) return false;
  return until > now.getTime();
}

export function chatAlertDecision(input: {
  readonly kind: ChatAlertKind;
  readonly channelId: number;
  readonly senderId: unknown;
  readonly currentUserId: string | undefined;
  readonly activeChannelId: number | null;
  readonly viewer: ChatViewerChannelState | undefined;
  readonly now?: Date;
}): ChatAlertDecision {
  const now = input.now ?? new Date();

  if (
    input.currentUserId !== undefined &&
    input.senderId === input.currentUserId
  )
    return "own-message";

  if (input.channelId === input.activeChannelId) return "active-channel";

  const viewer = input.viewer;
  if (viewer === undefined) return "alert";

  if (input.kind === "message") {
    if (muteIsActive(viewer.mutedUntil, now)) return "muted";
    if (GENERAL_ALERTS_SUPPRESSED.has(viewer.notificationPreference))
      return "preference";
    return "alert";
  }

  if (viewer.notificationPreference === "NOTHING") return "preference";
  return "alert";
}

export function chatAlertIsRaised(decision: ChatAlertDecision): boolean {
  return decision === "alert";
}
