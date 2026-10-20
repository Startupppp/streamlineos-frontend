import { isApiError } from "@/lib/api-envelope";
import { nextChatTempId } from "@/hooks/api/chat-message-cache";
import type { AttachmentInput, Message, MessageMetadata } from "@/types/chat";
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
  retryDelay: (attempt: number) => Math.min(1_000 * 2 ** attempt, SEND_RETRY_MAX_DELAY_MS),
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

interface OptimisticMessageInput {
  channelId: number;
  clientKey: string;
  author: { id?: string | null; name?: string | null; image?: string | null } | undefined;
  content?: string;
  replyToId?: number | null;
  metadata?: MessageMetadata | null;
  attachments?: AttachmentInput[];
  replyTo?: Message | undefined;
}

export function optimisticMessage(input: OptimisticMessageInput): Message {
  const now = new Date().toISOString();
  const authorId = input.author?.id ?? null;
  const { replyTo } = input;
  return {
    id: nextChatTempId(),
    channelId: input.channelId,
    senderId: authorId,
    content: input.content ?? null,
    replyToId: input.replyToId ?? null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: input.metadata ?? null,
    actionStatus: null,
    reactions: {},
    clientKey: input.clientKey,
    createdAt: now,
    updatedAt: now,
    sender: { id: authorId, name: input.author?.name ?? null, image: input.author?.image ?? null },
    attachments: (input.attachments ?? []).map((attachment) => ({ ...attachment, id: nextChatTempId() })),
    replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, sender: replyTo.sender } : null,
  };
}

const reactionQueues = new Map<string, Promise<unknown>>();

export function enqueueReaction<T>(key: string, run: () => Promise<T>): Promise<T> {
  const previous = reactionQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(run);
  reactionQueues.set(key, next);
  void next
    .catch(() => undefined)
    .finally(() => {
      if (reactionQueues.get(key) === next) reactionQueues.delete(key);
    });
  return next;
}

const pendingReactions = new Map<string, number>();

export function reactionKey(channelId: number, messageId: number, emoji: string): string {
  return `${channelId}:${messageId}:${emoji}`;
}

export function beginReaction(key: string): void {
  pendingReactions.set(key, (pendingReactions.get(key) ?? 0) + 1);
}

export function settleReaction(key: string): void {
  const remaining = (pendingReactions.get(key) ?? 1) - 1;
  if (remaining > 0) pendingReactions.set(key, remaining);
  else pendingReactions.delete(key);
}

export function isLatestReaction(key: string): boolean {
  return (pendingReactions.get(key) ?? 0) <= 1;
}
