import { format, isToday, isYesterday } from "date-fns";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import { isStorageObjectKey } from "@/lib/utils";

export type ChatOrgUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export function buildChatUserMap(
  users: ChatOrgUser[] | undefined,
): Map<string, NamedUser> {
  const map = new Map<string, NamedUser>();
  for (const user of users ?? []) {
    map.set(user.id, { name: user.name, email: user.email });
  }
  return map;
}

/**
 * `userId` is nullable because a message whose `organization_members` row is gone
 * arrives with `senderId: null`. Declared non-nullable, this signature forced
 * every caller to lie about a value the wire has always been able to omit.
 */
export function resolveChatUserName(
  userId: string | null,
  embedded: { name?: string | null; email?: string | null } | null | undefined,
  userMap: Map<string, NamedUser>,
): string {
  if (embedded?.name?.trim()) return embedded.name.trim();
  const mapped = userId === null ? undefined : userMap.get(userId);
  if (mapped) return getUserDisplayName(mapped);
  return "Unknown";
}

function toDate(date: Date | string | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;

  if (typeof date === "string" && !date.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(date) && !date.includes("T")) {
    return new Date(date.replace(" ", "T") + "Z");
  }
  return new Date(date);
}

export function formatMessageTime(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  return format(d, "h:mm a");
}

export function formatMessageTimeFull(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy") + " at " + format(d, "h:mm a");
}

export function formatChannelTime(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function getFileExt(name: string) {
  return name.split(".").pop()?.toUpperCase() || "FILE";
}

export function getFileColor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return { bg: "bg-status-danger-surface", text: "text-status-danger-ink", badge: "bg-status-danger-fill" };
    case "doc": case "docx": return { bg: "bg-status-info-surface", text: "text-status-info-ink", badge: "bg-status-info-fill" };
    case "xls": case "xlsx": return { bg: "bg-status-success-surface", text: "text-status-success-ink", badge: "bg-status-success-fill" };
    case "ppt": case "pptx": return { bg: "bg-status-warning-surface", text: "text-status-warning-ink", badge: "bg-status-warning-fill" };
    case "zip": case "rar": return { bg: "bg-status-warning-surface", text: "text-status-warning-ink", badge: "bg-status-warning-fill" };
    default: return { bg: "bg-muted", text: "text-muted-foreground", badge: "bg-status-neutral-fill" };
  }
}

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function getDateLabel(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}

export function getForwardLabel(forwardCount: number | undefined): string | null {
  if (!forwardCount || forwardCount < 1) return null;
  return forwardCount > 3 ? "Forwarded multiple times" : "Forwarded";
}

/** Normalize legacy `> quoted` forwards and metadata-based forwards for display. */
export function getForwardedDisplay(content: string | null, forwardCount?: number) {
  if (forwardCount && forwardCount > 0) {
    return {
      label: getForwardLabel(forwardCount),
      content,
    };
  }

  if (!content) return { label: null, content };

  const legacyMatch = content.match(/^(.*?)(?:\n\n)?> (.+)$/s);
  if (legacyMatch) {
    const prefix = legacyMatch[1]?.trim();
    const body = legacyMatch[2] ?? "";
    return {
      label: "Forwarded" as const,
      content: prefix ? `${prefix}\n\n${body}` : body,
    };
  }

  if (content.startsWith("> ")) {
    return { label: "Forwarded" as const, content: content.slice(2) };
  }

  return { label: null, content };
}
