import { isApiError } from "@/lib/api-envelope";
import type { Message } from "@/types/chat";
import type { ChatSendResponse } from "@/hooks/api/chat-schema";

const SEND_RETRY_LIMIT = 3;
const SEND_RETRY_MAX_DELAY_MS = 8_000;

const mintedClientKeys = new WeakMap<object, string>();

export function sendClientKey(variables: { clientKey?: string }): string {
  if (variables.clientKey) return variables.clientKey;
  const existing = mintedClientKeys.get(variables);
  if (existing) return existing;
  const minted =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  mintedClientKeys.set(variables, minted);
  return minted;
}

function isTransientSendError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") return true;
  const status = error.status;
  return status !== undefined && (status >= 500 || status === 429 || status === 408);
}

export const chatSendRetry = {
  retry: (failureCount: number, error: unknown) =>
    failureCount < SEND_RETRY_LIMIT && isTransientSendError(error),
  retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, SEND_RETRY_MAX_DELAY_MS),
};

export function reconcileSentMessage(optimistic: Message, row: ChatSendResponse): Message {
  return {
    ...optimistic,
    id: row.id,
    content: row.content,
    replyToId: row.replyToId,
    isEdited: row.isEdited,
    isDeleted: row.isDeleted,
    messageType: row.messageType,
    metadata: row.metadata ?? optimistic.metadata,
    actionStatus: row.actionStatus,
    clientKey: row.clientKey ?? optimistic.clientKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
