import type { PermissionKey } from "@/lib/rbac/permissions";

export type CommandKind =
  | { kind: "PERMISSIONED"; permission: PermissionKey }
  | { kind: "SELF"; reason: string };

export interface CommandEntry {
  endpoint: string;
  classification: CommandKind;
}

export const NOTIFICATION_COMMANDS = {
  markRead: {
    endpoint: "PATCH /notifications/:id/read",
    classification: { kind: "SELF" as const, reason: "user manages their own notification" },
  },
  markAllRead: {
    endpoint: "PATCH /notifications/read-all",
    classification: { kind: "SELF" as const, reason: "user manages their own notifications" },
  },
  bulkMarkRead: {
    endpoint: "POST /notifications/bulk/read",
    classification: { kind: "SELF" as const, reason: "user manages their own notifications" },
  },
  archive: {
    endpoint: "PATCH /notifications/:id/archive",
    classification: { kind: "SELF" as const, reason: "user manages their own notification" },
  },
  unarchive: {
    endpoint: "PATCH /notifications/:id/unarchive",
    classification: { kind: "SELF" as const, reason: "user manages their own notification" },
  },
  delete: {
    endpoint: "DELETE /notifications/:id",
    classification: { kind: "SELF" as const, reason: "user manages their own notification" },
  },
  pin: {
    endpoint: "PATCH /notifications/:id/pin",
    classification: { kind: "SELF" as const, reason: "user manages their own notification" },
  },
  unpin: {
    endpoint: "PATCH /notifications/:id/unpin",
    classification: { kind: "SELF" as const, reason: "user manages their own notification" },
  },
  snooze: {
    endpoint: "PATCH /notifications/:id/snooze",
    classification: { kind: "SELF" as const, reason: "user manages their own notification" },
  },
  bulkArchive: {
    endpoint: "POST /notifications/bulk/archive",
    classification: { kind: "SELF" as const, reason: "user manages their own notifications" },
  },
  bulkDelete: {
    endpoint: "POST /notifications/bulk/delete",
    classification: { kind: "SELF" as const, reason: "user manages their own notifications" },
  },
  approve: {
    endpoint: "POST /notifications/:id/approve",
    classification: { kind: "SELF" as const, reason: "user acts on their own actionable notification" },
  },
  reject: {
    endpoint: "POST /notifications/:id/reject",
    classification: { kind: "SELF" as const, reason: "user acts on their own actionable notification" },
  },
} satisfies Record<string, CommandEntry>;

export const CHAT_COMMANDS = {
  createChannel: {
    endpoint: "POST /chat/channels",
    classification: { kind: "PERMISSIONED" as const, permission: "chat:channels:write" },
  },
  markChannelRead: {
    endpoint: "POST /chat/channels/:id/read",
    classification: { kind: "SELF" as const, reason: "user marks their own channel as read" },
  },
} satisfies Record<string, CommandEntry>;

export type NotificationCommandName = keyof typeof NOTIFICATION_COMMANDS;
export type ChatCommandName = keyof typeof CHAT_COMMANDS;

export const ALL_COMMANDS = {
  notifications: NOTIFICATION_COMMANDS,
  chat: CHAT_COMMANDS,
} as const;

export type CommandDomain = keyof typeof ALL_COMMANDS;
