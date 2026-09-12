import {
  NOTIFICATION_CATEGORY_VALUES,
  type Notification,
  type NotificationType,
  type NotificationPriority,
  type NotificationCategory,
} from "@/types/notifications";
import type {
  BroadcastInboxItem,
  NotificationInboxItem,
} from "@/types/inbox";

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

export function toDrawerNotification(
  item: NotificationInboxItem | BroadcastInboxItem,
): Notification {
  return {
    id: item.id,
    orgId: "",
    userId: null,
    type: parseNotifType(item.notifType),
    priority: parseNotifPriority(item.priority),
    category: parseNotifCategory(item.category),
    sourceModule: item.sourceModule,
    eventKey: item.kind === "notification" ? item.eventKey : null,
    title: item.subject,
    message: item.body,
    link: item.deepLink,
    isRead: item.isRead,
    pinned: item.kind === "notification" ? item.pinned : false,
    channel: "IN_APP",
    archivedAt: null,
    snoozedUntil: null,
    createdAt: item.timestamp,
  };
}
