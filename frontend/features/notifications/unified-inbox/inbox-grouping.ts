import type { UnifiedInboxItem } from "@/types/inbox";

export type InboxGrouping = "none" | "kind" | "module" | "thread" | "date";

export interface InboxGroup {
  key: string;
  label: string;
  items: UnifiedInboxItem[];
}

export const GROUPING_OPTIONS: ReadonlyArray<{
  value: InboxGrouping;
  label: string;
}> = [
  { value: "none", label: "No grouping" },
  { value: "kind", label: "Source type" },
  { value: "module", label: "Module" },
  { value: "thread", label: "Mail thread" },
  { value: "date", label: "Date" },
];

const VALID_GROUPINGS: ReadonlySet<string> = new Set<InboxGrouping>([
  "none",
  "kind",
  "module",
  "thread",
  "date",
]);

export function parseGrouping(raw: string | null): InboxGrouping {
  if (raw !== null && VALID_GROUPINGS.has(raw)) return raw as InboxGrouping;
  return "none";
}

const KIND_LABELS: Record<string, string> = {
  notification: "Notifications",
  broadcast: "Broadcasts",
  mail: "Mail",
  build_approval: "Approvals",
  module_task: "Tasks",
};

function formatModuleLabel(mod: string): string {
  return mod
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const DATE_BUCKET_ORDER: ReadonlyArray<string> = [
  "date:today",
  "date:yesterday",
  "date:this-week",
  "date:earlier",
];

function localMidnight(d: Date, offsetDays = 0): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays);
}

function getDateBucketKey(isoString: string, now: Date): string {
  const item = new Date(isoString);
  const todayStart = localMidnight(now);
  const yesterdayStart = localMidnight(now, -1);
  const weekAgoStart = localMidnight(now, -7);
  if (item >= todayStart) return "date:today";
  if (item >= yesterdayStart) return "date:yesterday";
  if (item >= weekAgoStart) return "date:this-week";
  return "date:earlier";
}

function getRowGroupKey(
  item: UnifiedInboxItem,
  grouping: InboxGrouping,
  now: Date,
): string {
  switch (grouping) {
    case "kind":
      return item.kind;
    case "module":
      return item.sourceModule;
    case "thread":
      if (item.kind === "mail" && item.threadId !== null) {
        return `thread:${item.threadId}`;
      }
      return `kind:${item.kind}`;
    case "date":
      return getDateBucketKey(item.timestamp, now);
    case "none":
      return "";
  }
}

function getGroupLabel(key: string, grouping: InboxGrouping): string {
  switch (grouping) {
    case "kind":
      return KIND_LABELS[key] ?? key;
    case "module":
      return formatModuleLabel(key);
    case "thread":
      if (key.startsWith("thread:")) return "Thread";
      if (key.startsWith("kind:")) return KIND_LABELS[key.slice(5)] ?? key.slice(5);
      return key;
    case "date":
      if (key === "date:today") return "Today";
      if (key === "date:yesterday") return "Yesterday";
      if (key === "date:this-week") return "This week";
      if (key === "date:earlier") return "Earlier";
      return key;
    case "none":
      return "";
  }
}

export function groupInboxItems(
  items: UnifiedInboxItem[],
  grouping: InboxGrouping,
  now: Date = new Date(),
): InboxGroup[] {
  if (grouping === "none") return [];
  const groupMap = new Map<string, UnifiedInboxItem[]>();
  for (const item of items) {
    const key = getRowGroupKey(item, grouping, now);
    const existing = groupMap.get(key);
    if (existing !== undefined) {
      existing.push(item);
    } else {
      groupMap.set(key, [item]);
    }
  }
  const groups = Array.from(groupMap.entries()).map(([key, groupItems]) => ({
    key,
    label: getGroupLabel(key, grouping),
    items: groupItems,
  }));
  if (grouping !== "date") return groups;
  return groups.sort((a, b) => {
    const ai = DATE_BUCKET_ORDER.indexOf(a.key);
    const bi = DATE_BUCKET_ORDER.indexOf(b.key);
    return (ai === -1 ? DATE_BUCKET_ORDER.length : ai) - (bi === -1 ? DATE_BUCKET_ORDER.length : bi);
  });
}
