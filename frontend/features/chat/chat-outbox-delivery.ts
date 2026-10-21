import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isRecord } from "@/lib/is-record";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  appendPendingSend,
  CHAT_SEND_MUTATION_KEY,
  holdFailedSendRow,
  pendingSendMessage,
} from "@/hooks/api/chat-send-policy";
import type { MessagesPage, SendMessageInput } from "@/types/chat";
import { removeOptimisticMessage } from "./message-page-merge";
import {
  markOutboxEntryFailed,
  readOutbox,
  removeOutboxEntry,
  requeueOutboxEntry,
  type OutboxEntry,
} from "./composer-draft";

export type SendOutcome = { status: "delivered" | "queued" } | { status: "failed"; error: unknown };

export interface ChannelOutbox {
  queryClient: QueryClient;
  channelId: number;
  draftKey: string;
  isOnline: boolean;
  author: Parameters<typeof pendingSendMessage>[1];
  mutateAsync: (input: SendMessageInput) => Promise<unknown>;
}

const dispatching = new Set<string>();
const deliveredListeners = new Set<(draftKey: string, entry: OutboxEntry) => void>();
const drainListeners = new Set<() => void>();

export function onOutboxDelivered(listener: (draftKey: string, entry: OutboxEntry) => void): () => void {
  deliveredListeners.add(listener);
  return () => {
    deliveredListeners.delete(listener);
  };
}

export function onOutboxDrainRequest(listener: () => void): () => void {
  drainListeners.add(listener);
  return () => {
    drainListeners.delete(listener);
  };
}

export function retryFailedSend(draftKey: string, clientKey: string): void {
  requeueOutboxEntry(draftKey, clientKey);
  for (const listener of drainListeners) listener();
}

export function discardFailedSend(queryClient: QueryClient, channelId: number, draftKey: string, clientKey: string): void {
  removeOutboxEntry(draftKey, clientKey);
  queryClient.setQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(channelId), (old) =>
    removeOptimisticMessage(old, clientKey),
  );
}

function toSendInput(channelId: number, entry: OutboxEntry): SendMessageInput {
  return {
    channelId,
    clientKey: entry.clientKey,
    content: entry.content || undefined,
    replyToId: entry.replyToId,
    attachments: entry.attachments,
    metadata: entry.metadata ?? undefined,
    mentionedUserIds: entry.mentionedUserIds,
  };
}

function readTimeline(target: ChannelOutbox): InfiniteData<MessagesPage> | undefined {
  return target.queryClient.getQueryData<InfiniteData<MessagesPage>>(
    collaborationQueryKeys.chat.messages(target.channelId),
  );
}

function shownClientKeys(data: InfiniteData<MessagesPage> | undefined): { delivered: Set<string>; pending: Set<string> } {
  const delivered = new Set<string>();
  const pending = new Set<string>();
  for (const page of data?.pages ?? [])
    for (const message of page.messages)
      if (message.clientKey) (message.id > 0 ? delivered : pending).add(message.clientKey);
  return { delivered, pending };
}

function inFlightClientKeys(queryClient: QueryClient): Set<string> {
  const keys = new Set<string>();
  for (const mutation of queryClient.getMutationCache().findAll({ mutationKey: CHAT_SEND_MUTATION_KEY, status: "pending" })) {
    const variables = mutation.state.variables;
    if (isRecord(variables) && typeof variables.clientKey === "string") keys.add(variables.clientKey);
  }
  return keys;
}

function showPending(target: ChannelOutbox, entry: OutboxEntry): void {
  const pending = pendingSendMessage(target.queryClient, target.author, toSendInput(target.channelId, entry), entry.clientKey);
  target.queryClient.setQueryData<InfiniteData<MessagesPage>>(
    collaborationQueryKeys.chat.messages(target.channelId),
    (old) => appendPendingSend(old, pending),
  );
}

async function deliver(target: ChannelOutbox, entry: OutboxEntry): Promise<SendOutcome> {
  dispatching.add(entry.clientKey);
  const release = holdFailedSendRow(entry.clientKey);
  try {
    await target.mutateAsync(toSendInput(target.channelId, entry));
    removeOutboxEntry(target.draftKey, entry.clientKey);
    for (const listener of deliveredListeners) listener(target.draftKey, entry);
    return { status: "delivered" };
  } catch (error) {
    markOutboxEntryFailed(target.draftKey, entry.clientKey);
    showPending(target, entry);
    return { status: "failed", error };
  } finally {
    release();
    dispatching.delete(entry.clientKey);
  }
}

export function drainChannelOutbox(target: ChannelOutbox): Map<string, Promise<SendOutcome>> {
  const { delivered } = shownClientKeys(readTimeline(target));
  const inFlight = inFlightClientKeys(target.queryClient);
  const started = new Map<string, Promise<SendOutcome>>();
  for (const entry of readOutbox(target.draftKey)) {
    if (dispatching.has(entry.clientKey) || inFlight.has(entry.clientKey)) continue;
    if (delivered.has(entry.clientKey)) removeOutboxEntry(target.draftKey, entry.clientKey);
    else if (entry.failed || !target.isOnline) showPending(target, entry);
    else started.set(entry.clientKey, deliver(target, entry));
  }
  return started;
}

export function restoreOutboxRows(target: ChannelOutbox): void {
  const queued = readOutbox(target.draftKey);
  if (!queued.length) return;
  const data = readTimeline(target);
  if (!data) return;
  const { delivered, pending } = shownClientKeys(data);
  for (const entry of queued)
    if (!delivered.has(entry.clientKey) && !pending.has(entry.clientKey)) showPending(target, entry);
}

export async function reportSendFailure(outcome: Promise<SendOutcome>): Promise<void> {
  const result = await outcome;
  if (result.status === "failed") toast.error(getErrorMessage(result.error));
}
