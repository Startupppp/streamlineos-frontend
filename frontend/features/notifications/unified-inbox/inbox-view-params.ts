import { Archive, Bell, CheckCircle, Clock, Inbox, Mail, AtSign, Eye } from "lucide-react";
import type { ViewOption } from "@/components/ui/view-toggle";
import type { InboxKind } from "@/types/inbox";
import { parseGrouping, type InboxGrouping } from "./inbox-grouping";

export type InboxView =
  | "primary"
  | "notifications"
  | "mentions"
  | "unread"
  | "mail"
  | "approvals"
  | "later"
  | "done";

const ALL_VIEW_VALUES: InboxView[] = [
  "primary",
  "notifications",
  "mentions",
  "unread",
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
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "mentions", label: "Mentions", icon: AtSign },
  { value: "unread", label: "Unread", icon: Eye },
  { value: "mail", label: "Mail", icon: Mail },
  { value: "approvals", label: "Approvals", icon: CheckCircle },
  { value: "later", label: "Later", icon: Clock },
  { value: "done", label: "Done", icon: Archive },
];

export const VIEW_KINDS: Record<InboxView, InboxKind[] | undefined> = {
  primary: undefined,
  notifications: ["notification", "broadcast"],
  mentions: ["notification"],
  unread: undefined,
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
  notifications: undefined,
  mentions: undefined,
  unread: undefined,
  mail: undefined,
  approvals: undefined,
  later: "later",
  done: "done",
};

export const VIEW_DEFAULT_UNREAD_ONLY: Record<InboxView, boolean> = {
  primary: false,
  notifications: false,
  mentions: false,
  unread: true,
  mail: true,
  approvals: false,
  later: false,
  done: false,
};

export const MENTION_EVENT_KEYS: ReadonlySet<string> = new Set([
  "build.comment.mention",
  "chat.message.mention",
  "knowledge.article.mentioned",
  "support.ticket.mention",
]);

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
  from: string;
  to: string;
  module: string;
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
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const module = params.get("module") ?? "";
  return { view, q, unreadOnly, category, priority, kindOverride, group, from, to, module };
}

export interface InboxQueryParams {
  limit: number;
  kinds?: InboxKind[];
  q?: string;
  unreadOnly?: boolean;
  category?: string;
  priority?: string;
  eventKeys?: string[];
  module?: string;
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
  if (state.view === "mentions") params.eventKeys = [...MENTION_EVENT_KEYS];
  if (state.module) params.module = state.module;
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
  if (state.from) p.set("from", state.from);
  if (state.to) p.set("to", state.to);
  if (state.module) p.set("module", state.module);
  return p;
}
