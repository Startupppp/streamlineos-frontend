import type { ChatNotificationPreference } from "@/types/chat";

export const CHAT_NOTIFICATION_OPTIONS: ReadonlyArray<{
  value: ChatNotificationPreference;
  label: string;
  description: string;
}> = [
  {
    value: "DEFAULT",
    label: "Use workspace default",
    description: "Follow the notification default set for this workspace.",
  },
  {
    value: "ALL",
    label: "All messages",
    description: "Notify you whenever someone sends a message.",
  },
  {
    value: "MENTIONS",
    label: "Mentions only",
    description: "Notify you only when someone mentions you.",
  },
  {
    value: "NOTHING",
    label: "Nothing",
    description: "Do not notify you about new messages here.",
  },
];

export function isChatNotificationPreference(
  value: string,
): value is ChatNotificationPreference {
  return CHAT_NOTIFICATION_OPTIONS.some((option) => option.value === value);
}
