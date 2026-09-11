import {
  NOTIFICATION_CATEGORY_VALUES,
  type NotificationType,
  type NotificationPriority,
  type NotificationCategory,
} from "@/types/notifications";

export function parseNotifType(raw: string): NotificationType {
  if (raw === "SUCCESS" || raw === "WARNING" || raw === "ERROR") return raw;
  return "INFO";
}

export function parseNotifPriority(raw: string): NotificationPriority {
  if (raw === "LOW" || raw === "HIGH" || raw === "CRITICAL") return raw;
  return "NORMAL";
}

export function parseNotifCategory(raw: string): NotificationCategory {
  const found = NOTIFICATION_CATEGORY_VALUES.find((v) => v === raw);
  return found ?? "SYSTEM";
}
