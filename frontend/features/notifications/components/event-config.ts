"use client";
import type { NotificationChannel, NotificationPriority } from "@/types/notifications";

export const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBHOOK", label: "Webhook" },
];

export const PRIORITIES: Array<{ value: NotificationPriority; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const QUIET_HOURS_OPTIONS = [
  { value: "respect", label: "Respect quiet hours" },
  { value: "bypass_if_high", label: "Bypass if HIGH or CRITICAL" },
  { value: "always_bypass", label: "Always bypass quiet hours" },
] as const;

export const priorityBadgeClass: Record<NotificationPriority, string> = {
  CRITICAL: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  HIGH: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  NORMAL: "bg-muted text-muted-foreground border-border",
  LOW: "bg-muted text-muted-foreground border-border",
};
