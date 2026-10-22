export const CHAT_SEARCH_SCOPES = ["messages", "channels", "people"] as const;

export type ChatSearchScope = (typeof CHAT_SEARCH_SCOPES)[number];

const SCOPE_LABELS: Record<ChatSearchScope, string> = {
  messages: "Messages",
  channels: "Channels",
  people: "People",
};

export function chatSearchScopeLabel(scope: ChatSearchScope): string {
  return SCOPE_LABELS[scope];
}

export function readChatSearchScope(value: unknown): ChatSearchScope | null {
  return CHAT_SEARCH_SCOPES.find((scope) => scope === value) ?? null;
}
