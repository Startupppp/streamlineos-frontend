export const CHAT_SEARCH_SCOPES = ["messages", "people", "channels"] as const;

export type ChatSearchScope = (typeof CHAT_SEARCH_SCOPES)[number];

const SCOPE_LABELS: Record<ChatSearchScope, string> = {
  messages: "Messages",
  people: "People",
  channels: "Channels",
};

export function chatSearchScopeLabel(scope: ChatSearchScope): string {
  return SCOPE_LABELS[scope];
}
