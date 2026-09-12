import type {
  InboxKind,
  InboxSourceStatus,
  UnifiedInboxResponse,
} from "@/types/inbox";

export type InboxView = "ALL" | "NOTIFICATIONS" | "MAIL" | "APPROVALS";

export const VIEW_KINDS: Record<InboxView, InboxKind[] | undefined> = {
  ALL: undefined,
  NOTIFICATIONS: ["notification", "broadcast"],
  MAIL: ["mail"],
  APPROVALS: ["build_approval"],
};

export const VIEWS: Array<{ key: InboxView; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "NOTIFICATIONS", label: "Notifications" },
  { key: "MAIL", label: "Mail" },
  { key: "APPROVALS", label: "Approvals" },
];

export const INBOX_SOURCE_LABELS: Record<InboxKind, string> = {
  notification: "Notifications",
  broadcast: "Announcements",
  mail: "Mail",
  build_approval: "Approvals",
};

const PERMISSION_REASON_PREFIX = "no permission: ";

export function deniedPermissionFor(
  view: InboxView,
  sources: InboxSourceStatus[],
): string | null {
  const kinds = VIEW_KINDS[view];
  if (!kinds) return null;
  const relevant = sources.filter((source) => kinds.includes(source.kind));
  if (relevant.length === 0) return null;
  const refused = relevant.filter(
    (source) =>
      !source.included && source.reason?.startsWith(PERMISSION_REASON_PREFIX),
  );
  if (refused.length !== relevant.length) return null;
  const first = refused[0];
  return first?.reason?.slice(PERMISSION_REASON_PREFIX.length) ?? null;
}

export function degradedSources(
  pages: UnifiedInboxResponse[],
): InboxSourceStatus[] {
  const byKind = new Map<InboxKind, InboxSourceStatus>();
  for (const page of pages)
    for (const source of page.sources) {
      if (source.available && source.error === null) continue;
      if (byKind.has(source.kind)) continue;
      byKind.set(source.kind, source);
    }
  return Array.from(byKind.values());
}

export function isDegraded(pages: UnifiedInboxResponse[]): boolean {
  return pages.some((page) => page.degraded);
}

export function dedupeInboxItems(
  pages: UnifiedInboxResponse[],
): UnifiedInboxResponse["items"] {
  const seen = new Set<string>();
  const items: UnifiedInboxResponse["items"] = [];
  for (const page of pages)
    for (const item of page.items) {
      if (seen.has(item.dedupKey)) continue;
      seen.add(item.dedupKey);
      items.push(item);
    }
  return items;
}
