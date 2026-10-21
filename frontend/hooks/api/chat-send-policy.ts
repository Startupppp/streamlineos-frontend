import { getRetryAfterSeconds, isApiError } from "@/lib/api-envelope";
import { queryRetryDelay } from "@/lib/query-error-policy";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { findCachedMessage, nextChatTempId } from "@/hooks/api/chat-message-cache";
import { appendTimelineMessage } from "@/features/chat/message-page-merge";
import type {
  AttachmentInput,
  Message,
  MessageMetadata,
  MessagesPage,
  SendMessageInput,
} from "@/types/chat";
import type { ChatSendResponse } from "@/hooks/api/chat-schema";

export const CHAT_SEND_MUTATION_KEY = ["chat", "messages", "send"];

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

export function isTransientSendError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") return true;
  const status = error.status;
  return (
    status !== undefined && (status >= 500 || status === 429 || status === 408)
  );
}

const MAX_TRANSIENT_SEND_ATTEMPTS = 8;

function isRateLimited(error: unknown): boolean {
  return isApiError(error) && error.status === 429;
}

const transientFailures = new Map<string, number>();
const transientAttemptByError = new WeakMap<object, number>();

export function countTransientSendFailure(clientKey: string, error: unknown): void {
  if (!isTransientSendError(error) || isRateLimited(error)) return;
  const count = (transientFailures.get(clientKey) ?? 0) + 1;
  transientFailures.set(clientKey, count);
  if (typeof error === "object" && error !== null) transientAttemptByError.set(error, count);
}

export function clearTransientSendFailures(clientKey: string): void {
  transientFailures.delete(clientKey);
}

function transientAttempts(failureCount: number, error: unknown): number {
  const counted = typeof error === "object" && error !== null ? transientAttemptByError.get(error) : undefined;
  return counted ?? failureCount + 1;
}

export const chatSendRetry = {
  retry: (failureCount: number, error: unknown) =>
    isRateLimited(error) ||
    (isTransientSendError(error) && transientAttempts(failureCount, error) < MAX_TRANSIENT_SEND_ATTEMPTS),
  retryDelay: (failureCount: number, error: unknown) => {
    const retryAfter = getRetryAfterSeconds(error);
    return retryAfter === undefined
      ? queryRetryDelay(failureCount, error)
      : Math.max(1_000, retryAfter * 1_000);
  },
};

const outboxSends = new Set<string>();

export function holdFailedSendRow(clientKey: string): () => void {
  outboxSends.add(clientKey);
  return () => {
    outboxSends.delete(clientKey);
  };
}

export function keepsFailedSendRow(clientKey: string): boolean {
  return outboxSends.has(clientKey);
}

const channelSendTails = new WeakMap<object, Map<number, Promise<void>>>();
const sendTurns = new Map<
  string,
  { ready: Promise<void>; release: () => void }
>();

export function claimSendTurn(
  owner: object,
  channelId: number,
  clientKey: string,
): void {
  const tails = channelSendTails.get(owner) ?? new Map<number, Promise<void>>();
  channelSendTails.set(owner, tails);
  const ready = tails.get(channelId) ?? Promise.resolve();
  let finish: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const tail = ready.then(() => done);
  tails.set(channelId, tail);
  sendTurns.set(clientKey, {
    ready,
    release: () => {
      finish();
      sendTurns.delete(clientKey);
      if (tails.get(channelId) === tail) tails.delete(channelId);
    },
  });
}

export function awaitSendTurn(clientKey: string): Promise<void> {
  return sendTurns.get(clientKey)?.ready ?? Promise.resolve();
}

export function releaseSendTurn(clientKey: string): void {
  sendTurns.get(clientKey)?.release();
}

export function pendingSendMessage(
  queryClient: QueryClient,
  author: OptimisticMessageInput["author"],
  variables: SendMessageInput,
  clientKey: string,
): Message {
  return optimisticMessage({
    ...variables,
    clientKey,
    author,
    replyTo:
      variables.replyToId !== undefined
        ? findCachedMessage(queryClient, variables.channelId, variables.replyToId)
        : undefined,
  });
}

export function appendPendingSend(
  data: InfiniteData<MessagesPage> | undefined,
  message: Message,
): InfiniteData<MessagesPage> | undefined {
  const held = data?.pages.some((page) =>
    page.messages.some((existing) => existing.id < 0 && existing.clientKey === message.clientKey),
  );
  return held ? data : appendTimelineMessage(data, message);
}

export function reconcileSentMessage(
  optimistic: Message,
  row: ChatSendResponse,
): Message {
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
  author:
    | { id?: string | null; name?: string | null; image?: string | null }
    | undefined;
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
    sender: {
      id: authorId,
      name: input.author?.name ?? null,
      image: input.author?.image ?? null,
    },
    attachments: (input.attachments ?? []).map((attachment) => ({
      ...attachment,
      id: nextChatTempId(),
    })),
    replyTo: replyTo
      ? { id: replyTo.id, content: replyTo.content, sender: replyTo.sender }
      : null,
  };
}

const reactionQueues = new Map<string, Promise<unknown>>();

export function enqueueReaction<T>(
  key: string,
  run: () => Promise<T>,
): Promise<T> {
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

export function reactionKey(
  channelId: number,
  messageId: number,
  emoji: string,
): string {
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
