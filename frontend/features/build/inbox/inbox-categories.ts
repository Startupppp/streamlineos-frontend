import type { NotificationCategory } from "@/types/notifications";

export const BUILD_INBOX_CATEGORIES = [
  { value: "PROJECTS", label: "Projects & tickets" },
  { value: "WORKFLOW", label: "Approvals" },
] as const satisfies ReadonlyArray<{ value: NotificationCategory; label: string }>;

export function isBuildInboxCategory(value: string): value is NotificationCategory {
  return BUILD_INBOX_CATEGORIES.some((category) => category.value === value);
}
