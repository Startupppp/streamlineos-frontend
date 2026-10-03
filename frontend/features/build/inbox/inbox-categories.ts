import type { NotificationCategory, NotificationSection } from "@/types/notifications";

export const BUILD_INBOX_ACTIVE_SECTIONS = [
  { value: "ALL", label: "All active" },
  { value: "UNREAD", label: "Unread" },
  { value: "MENTIONS", label: "Mentions" },
] satisfies ReadonlyArray<{ value: NotificationSection; label: string }>;
export const BUILD_INBOX_TRIAGE_TABS = [
  { value: "ALL", label: "Active" },
  { value: "SNOOZED", label: "Later" },
  { value: "ARCHIVED", label: "Done" },
] satisfies ReadonlyArray<{ value: NotificationSection; label: string }>;
export function getBuildInboxTriageSection(section: NotificationSection): "ALL" | "SNOOZED" | "ARCHIVED" {
  return section === "ARCHIVED" || section === "SNOOZED" ? section : "ALL";
}

export const BUILD_INBOX_CATEGORIES = [
  { value: "PROJECTS", label: "Projects & tickets" },
  { value: "WORKFLOW", label: "Approvals" },
] as const satisfies ReadonlyArray<{ value: NotificationCategory; label: string }>;

export function isBuildInboxCategory(value: string): value is NotificationCategory {
  return BUILD_INBOX_CATEGORIES.some((category) => category.value === value);
}
