import { NOTIFICATION_CATEGORIES } from "@/features/notifications/notification-types";
import type {
  NotificationCategory,
  NotificationChannel,
  PolicyOverride,
} from "@/types/notifications";

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
