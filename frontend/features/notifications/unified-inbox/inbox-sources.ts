import type { InboxKind, InboxSourceStatus, UnifiedInboxResponse } from "@/types/inbox";
import { VIEW_KINDS, type InboxView } from "./inbox-view-params";

export const INBOX_SOURCE_LABELS: Record<InboxKind, string> = {
  notification: "Notifications",
  broadcast: "Announcements",
  mail: "Mail",
  build_approval: "Approvals",
};

export const APPROVAL_KIND_LABELS: Record<string, string> = {
  build: "Build",
  leave: "Leave",
  wfh: "Work from home",
  workflow: "HR workflow",
  timesheet: "Timesheet",
};

export function approvalKindLabel(kind: string): string {
  return APPROVAL_KIND_LABELS[kind] ?? kind;
}

const PERMISSION_REASON_PREFIX = "no permission: ";
const UNSUPPORTED_REASON_PREFIX = "unsupported: ";

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

export interface UnsupportedSource {
  source: InboxSourceStatus;
  why: string;
}

export function unsupportedSourcesFor(
  sources: InboxSourceStatus[],
): UnsupportedSource[] {
  return sources
    .filter(
      (s) => !s.included && s.reason?.startsWith(UNSUPPORTED_REASON_PREFIX),
    )
    .map((s) => ({
      source: s,
      why: s.reason!.slice(UNSUPPORTED_REASON_PREFIX.length),
    }));
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
