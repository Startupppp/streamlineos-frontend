import { isRecord } from "@/lib/is-record";

export function readChatNotification(data: unknown): {
  id: number;
  senderId: unknown;
  senderName: string | null;
  content: string | null;
  createdAt: string;
} | null {
  if (!isRecord(data) || typeof data.id !== "number" || !data.id) return null;
  return {
    id: data.id,
    senderId: data.senderId,
    senderName: typeof data.senderName === "string" ? data.senderName : null,
    content: typeof data.content === "string" ? data.content : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
  };
}

const SEEN_MESSAGE_LIMIT = 500;

export function rememberUnread(counted: Map<number, number>, messageId: number, channelId: number): void {
  counted.set(messageId, channelId);
  if (counted.size > SEEN_MESSAGE_LIMIT) {
    const oldest = counted.keys().next().value;
    if (oldest !== undefined) counted.delete(oldest);
  }
}

export function forgetChannelUnread(counted: Map<number, number>, channelId: number): void {
  for (const [messageId, owner] of counted) if (owner === channelId) counted.delete(messageId);
}

export function rememberMessage(seen: Set<number>, id: number): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > SEEN_MESSAGE_LIMIT) {
    const oldest = seen.values().next().value;
    if (oldest !== undefined) seen.delete(oldest);
  }
  return true;
}

export function viewerIsReading(channelId: number, activeChannelId: number | null): boolean {
  return (
    channelId === activeChannelId &&
    typeof document !== "undefined" &&
    document.visibilityState === "visible"
  );
}
