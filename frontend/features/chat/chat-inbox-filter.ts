export const CHAT_INBOX_FILTERS = ["all", "unread", "direct", "channels"] as const;

export type ChatInboxFilter = (typeof CHAT_INBOX_FILTERS)[number];

const FILTER_LABELS: Record<ChatInboxFilter, string> = {
  all: "All",
  unread: "Unread",
  direct: "Direct",
  channels: "Channels",
};

export function chatInboxFilterLabel(filter: ChatInboxFilter): string {
  return FILTER_LABELS[filter];
}

export function readChatInboxFilter(value: string | null): ChatInboxFilter {
  if (value === "unread" || value === "direct" || value === "channels") return value;
  return "all";
}

export function withChatInboxFilter(
  params: URLSearchParams,
  filter: ChatInboxFilter,
): string {
  const next = new URLSearchParams(params.toString());
  if (filter === "all") next.delete("inbox");
  else next.set("inbox", filter);
  return next.toString();
}

export function channelMatchesInboxFilter(
  channel: { type: string; unreadCount: number },
  filter: ChatInboxFilter,
): boolean {
  if (filter === "unread") return channel.unreadCount > 0;
  if (filter === "direct") return channel.type === "DIRECT";
  if (filter === "channels") return channel.type !== "DIRECT";
  return true;
}

export function formatInboxSummary(unread: number, online: number): string {
  const onlineLabel = online === 1 ? "1 person online" : `${online} online`;
  if (unread <= 0) return onlineLabel;
  const unreadLabel = unread === 1 ? "1 unread" : `${unread} unread`;
  return `${unreadLabel} · ${onlineLabel}`;
}

export function inboxStatusLabel(
  filter: ChatInboxFilter,
  count: number,
  hasSearch: boolean,
): string {
  if (count === 0) return inboxEmptyTitle(filter, hasSearch);
  if (hasSearch) {
    return count === 1 ? "1 conversation matches your search" : `${count} conversations match your search`;
  }
  if (filter === "unread") {
    return count === 1 ? "1 unread conversation" : `${count} unread conversations`;
  }
  if (filter === "direct") {
    return count === 1 ? "1 direct message" : `${count} direct messages`;
  }
  if (filter === "channels") {
    return count === 1 ? "1 channel" : `${count} channels`;
  }
  return count === 1 ? "1 conversation" : `${count} conversations`;
}

export interface ChatInboxFilterCounts {
  all: number;
  unread: number;
  direct: number;
  channels: number;
}

/** Unread totals for Direct and Channels. All is the loaded conversation count. */
export function countChatInboxFilters(
  channels: readonly { type: string; unreadCount: number }[],
): ChatInboxFilterCounts {
  let unread = 0;
  let direct = 0;
  let channelsUnread = 0;
  for (const channel of channels) {
    if (channel.unreadCount <= 0) continue;
    unread += 1;
    if (channel.type === "DIRECT") direct += 1;
    else channelsUnread += 1;
  }
  return {
    all: channels.length,
    unread,
    direct,
    channels: channelsUnread,
  };
}

export function inboxEmptyTitle(filter: ChatInboxFilter, hasSearch: boolean): string {
  if (hasSearch) return "No conversations match your search.";
  if (filter === "unread") return "No unread conversations.";
  if (filter === "direct") return "No direct messages.";
  if (filter === "channels") return "No channels yet.";
  return "No conversations yet";
}
