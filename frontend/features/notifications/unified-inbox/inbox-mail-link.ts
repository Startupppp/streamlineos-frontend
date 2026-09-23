import type { MailInboxItem } from "@/types/inbox";

export function mailDeepLinkParams(item: MailInboxItem): Record<string, string> {
  if (item.threadId !== null) {
    return { threadId: item.threadId, accountId: String(item.accountId) };
  }
  return { messageId: item.id, accountId: String(item.accountId) };
}
