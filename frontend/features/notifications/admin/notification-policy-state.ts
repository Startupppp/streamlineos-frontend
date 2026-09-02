import { NOTIFICATION_CATEGORIES } from "@/features/notifications/notification-types";
import type {
  NotificationCategory,
  NotificationChannel,
  PolicyOverride,
} from "@/types/notifications";

export const NOTIFICATION_POLICY_CHANNELS: Array<{
  value: NotificationChannel;
  label: string;
}> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBHOOK", label: "Webhook" },
];

export interface CategoryState {
  muted: boolean;
  channels: NotificationChannel[];
}

export function buildInitialCategoryState(
  overrides: Record<string, PolicyOverride>,
): Record<NotificationCategory, CategoryState> {
  const result = {} as Record<NotificationCategory, CategoryState>;
  for (const cat of NOTIFICATION_CATEGORIES) {
    const ov = overrides[cat];
    result[cat] = {
      muted: ov?.muted ?? false,
      channels: ov?.channels ?? [],
    };
  }
  return result;
}
