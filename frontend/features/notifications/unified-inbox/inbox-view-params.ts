import { Archive, Bell, CheckCircle, Clock, Inbox, Mail } from "lucide-react";
import type { ViewOption } from "@/components/ui/view-toggle";
import type { InboxKind } from "@/types/inbox";
import { parseGrouping, type InboxGrouping } from "./inbox-grouping";

export type InboxView =
  | "primary"
  | "updates"
  | "notifications"
  | "mail"
  | "approvals"
  | "later"
  | "done";

const ALL_VIEW_VALUES: InboxView[] = [
  "primary",
  "updates",
  "notifications",
  "mail",
  "approvals",
  "later",
  "done",
];

function findView(raw: string): InboxView | undefined {
  return ALL_VIEW_VALUES.find((v) => v === raw);
}

export function parseView(raw: string | null): InboxView {
  if (raw !== null) {
    const match = findView(raw);
    if (match !== undefined) return match;
  }
  return "primary";
}

export const VIEWS: ViewOption<InboxView>[] = [
  { value: "primary", label: "All", icon: Inbox },
  { value: "updates", label: "Updates", icon: Bell },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "mail", label: "Mail", icon: Mail },
  { value: "approvals", label: "Approvals", icon: CheckCircle },
  { value: "later", label: "Later", icon: Clock },
  { value: "done", label: "Done", icon: Archive },
];

export const VIEW_KINDS: Record<InboxView, InboxKind[] | undefined> = {
  primary: undefined,
  updates: ["notification", "broadcast"],
  notifications: ["notification", "broadcast"],
  mail: ["mail"],
  approvals: ["build_approval"],
  later: undefined,
  done: undefined,
};

export const VIEW_TRIAGE: Record<
  InboxView,
  "active" | "later" | "done" | undefined
> = {
  primary: "active",
  updates: "active",
  notifications: undefined,
  mail: undefined,
  approvals: undefined,
  later: "later",
  done: "done",
};

export const VIEW_DEFAULT_UNREAD_ONLY: Record<InboxView, boolean> = {
  primary: false,
  updates: false,
  notifications: false,
  mail: true,
  approvals: false,
  later: false,
  done: false,
};

const VALID_KINDS: ReadonlySet<string> = new Set<InboxKind>([
  "notification",
  "broadcast",
  "mail",
  "build_approval",
]);

export interface InboxFilterState {
  view: InboxView;
  q: string;
  unreadOnly: boolean;
  category: string;
  priority: string;
  kindOverride: InboxKind[];
  group: InboxGrouping;
}

export { type InboxGrouping };

export function parseInboxFilterState(
  params: URLSearchParams,
): InboxFilterState {
  const view = parseView(params.get("view"));
  const q = params.get("q") ?? "";
  const rawUnreadOnly = params.get("unreadOnly");
  const unreadOnly =
    rawUnreadOnly !== null
      ? rawUnreadOnly === "true" || rawUnreadOnly === "1"
      : VIEW_DEFAULT_UNREAD_ONLY[view];
  const category = params.get("category") ?? "";
  const priority = params.get("priority") ?? "";
  const kindsRaw = params.get("kinds");
  const kindOverride: InboxKind[] = kindsRaw
    ? kindsRaw.split(",").filter((k): k is InboxKind => VALID_KINDS.has(k))
    : [];
  const group = parseGrouping(params.get("group"));
  return { view, q, unreadOnly, category, priority, kindOverride, group };
}

export interface InboxQueryParams {
  limit: number;
  kinds?: InboxKind[];
  q?: string;
  unreadOnly?: boolean;
  category?: string;
  priority?: string;
  triage?: "active" | "later" | "done";
}

export function buildQueryParams(state: InboxFilterState): InboxQueryParams {
  const params: InboxQueryParams = { limit: 25 };
  const triage = VIEW_TRIAGE[state.view];
  if (triage) params.triage = triage;
  const baseKinds = VIEW_KINDS[state.view];
  const effectiveKinds =
    state.kindOverride.length > 0
      ? baseKinds
        ? baseKinds.filter((k) => state.kindOverride.includes(k))
        : state.kindOverride
      : baseKinds;
  if (effectiveKinds) params.kinds = effectiveKinds;
  if (state.q) params.q = state.q;
  if (state.unreadOnly) params.unreadOnly = true;
  if (state.category) params.category = state.category;
  if (state.priority) params.priority = state.priority;
  return params;
}

export function filterStateToSearchParams(
  state: InboxFilterState,
): URLSearchParams {
  const p = new URLSearchParams();
  p.set("view", state.view);
  if (state.q) p.set("q", state.q);
  const defaultUnread = VIEW_DEFAULT_UNREAD_ONLY[state.view];
  if (state.unreadOnly !== defaultUnread)
    p.set("unreadOnly", state.unreadOnly ? "true" : "false");
  if (state.category) p.set("category", state.category);
  if (state.priority) p.set("priority", state.priority);
  if (state.kindOverride.length > 0)
    p.set("kinds", state.kindOverride.join(","));
  if (state.group !== "none") p.set("group", state.group);
  return p;
}
