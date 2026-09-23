import type { UnifiedInboxItem } from "@/types/inbox";

export type InboxGrouping = "none" | "kind" | "module" | "thread";

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
];

const VALID_GROUPINGS: ReadonlySet<string> = new Set<InboxGrouping>([
  "none",
  "kind",
  "module",
  "thread",
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
};

function formatModuleLabel(mod: string): string {
  return mod
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function getRowGroupKey(
  item: UnifiedInboxItem,
  grouping: InboxGrouping,
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
    case "none":
      return "";
  }
}

export function groupInboxItems(
  items: UnifiedInboxItem[],
  grouping: InboxGrouping,
): InboxGroup[] {
  if (grouping === "none") return [];
  const groupMap = new Map<string, UnifiedInboxItem[]>();
  for (const item of items) {
    const key = getRowGroupKey(item, grouping);
    const existing = groupMap.get(key);
    if (existing !== undefined) {
      existing.push(item);
    } else {
      groupMap.set(key, [item]);
    }
  }
  return Array.from(groupMap.entries()).map(([key, groupItems]) => ({
    key,
    label: getGroupLabel(key, grouping),
    items: groupItems,
  }));
}
