"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from "react";
import { useSession } from "next-auth/react";
import { onlineManager, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isRecord } from "@/lib/is-record";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  appendPendingSend,
  CHAT_SEND_MUTATION_KEY,
  isTransientSendError,
  pendingSendMessage,
} from "@/hooks/api/chat-send-policy";
import type { MessagesPage, SendMessageInput } from "@/types/chat";
import { appendOutboxEntry, readOutbox, removeOutboxEntry, type OutboxEntry } from "./composer-draft";

function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function readOnline(): boolean {
  return navigator.onLine;
}

function assumeOnline(): boolean {
  return true;
}

function assumeHistoryMissing(): boolean {
  return false;
}

export function useChatOfflineQueue(
  flushRef: RefObject<() => Promise<void>>,
): { isOnline: boolean } {
  const isOnline = useSyncExternalStore(subscribeToConnectivity, readOnline, assumeOnline);

  useEffect(() => {
    onlineManager.setOnline(isOnline);
    if (isOnline) void flushRef.current();
  }, [isOnline, flushRef]);

  return { isOnline };
}

type SendOutcome = { status: "delivered" | "queued" } | { status: "failed" | "retrying"; error: unknown };

const RETRY_LATER_NOTICE = "A message you wrote offline could not be sent yet. It stays queued and will be retried when you reconnect.";

interface StartedSend {
  entry: OutboxEntry;
  outcome: Promise<SendOutcome>;
}

function deliveredClientKeys(data: InfiniteData<MessagesPage> | undefined): Set<string> {
  const keys = new Set<string>();
  for (const page of data?.pages ?? [])
    for (const message of page.messages) if (message.id > 0 && message.clientKey) keys.add(message.clientKey);
  return keys;
}

function inFlightClientKeys(queryClient: QueryClient): Set<string> {
  const keys = new Set<string>();
  for (const mutation of queryClient.getMutationCache().findAll({ mutationKey: CHAT_SEND_MUTATION_KEY, status: "pending" })) {
    const variables = mutation.state.variables;
    if (isRecord(variables) && typeof variables.clientKey === "string") keys.add(variables.clientKey);
  }
  return keys;
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

export function useChatOutbox({
  channelId,
  draftKey,
  isOnline,
  mutateAsync,
}: {
  channelId: number;
  draftKey: string;
  isOnline: boolean;
  mutateAsync: (input: SendMessageInput) => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const author = session?.user;
  const subscribeToCache = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(onChange),
    [queryClient],
  );
  const readHistoryReady = useCallback(
    () => queryClient.getQueryData(collaborationQueryKeys.chat.messages(channelId)) !== undefined,
    [queryClient, channelId],
  );
  const historyReady = useSyncExternalStore(subscribeToCache, readHistoryReady, assumeHistoryMissing);

  const outbox = useMemo(() => {
    const dispatching = new Set<string>();
    const deliver = async (entry: OutboxEntry): Promise<SendOutcome> => {
      dispatching.add(entry.clientKey);
      try {
        await mutateAsync(toSendInput(channelId, entry));
        removeOutboxEntry(draftKey, entry.clientKey);
        return { status: "delivered" };
      } catch (error) {
        if (isTransientSendError(error)) return { status: "retrying", error };
        removeOutboxEntry(draftKey, entry.clientKey);
        return { status: "failed", error };
      } finally {
        dispatching.delete(entry.clientKey);
      }
    };
    const showPending = (entry: OutboxEntry): void => {
      const pending = pendingSendMessage(queryClient, author, toSendInput(channelId, entry), entry.clientKey);
      queryClient.setQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(channelId), (old) =>
        appendPendingSend(old, pending),
      );
    };
    const drain = (): Map<string, StartedSend> => {
      const delivered = deliveredClientKeys(
        queryClient.getQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(channelId)),
      );
      const inFlight = inFlightClientKeys(queryClient);
      const started = new Map<string, StartedSend>();
      for (const entry of readOutbox(draftKey)) {
        if (dispatching.has(entry.clientKey) || inFlight.has(entry.clientKey)) continue;
        if (delivered.has(entry.clientKey)) removeOutboxEntry(draftKey, entry.clientKey);
        else if (!isOnline) showPending(entry);
        else started.set(entry.clientKey, { entry, outcome: deliver(entry) });
      }
      return started;
    };
    const watch = async ({ entry, outcome }: StartedSend): Promise<void> => {
      const result = await outcome;
      if (result.status === "retrying") toast.error(RETRY_LATER_NOTICE);
      if (result.status !== "failed") return;
      toast.error(getErrorMessage(result.error), {
        duration: Infinity,
        action: { label: "Retry", onClick: () => resend(entry) },
      });
    };
    const resend = (entry: OutboxEntry): void => {
      appendOutboxEntry(draftKey, entry);
      const started = drain();
      for (const send of started.values()) void watch(send);
    };
    const enqueue = (entry: OutboxEntry): Promise<SendOutcome> => {
      appendOutboxEntry(draftKey, entry);
      const started = drain();
      for (const send of started.values()) if (send.entry.clientKey !== entry.clientKey) void watch(send);
      const own = started.get(entry.clientKey)?.outcome ?? Promise.resolve<SendOutcome>({ status: isOnline ? "delivered" : "queued" });
      return own.then((result) => {
        if (result.status === "retrying") toast.error(RETRY_LATER_NOTICE);
        return result;
      });
    };
    const flush = async (): Promise<void> => {
      await Promise.all([...drain().values()].map(watch));
    };
    return { enqueue, resend, flush };
  }, [queryClient, channelId, draftKey, isOnline, author, mutateAsync]);

  const outboxRef = useRef(outbox);
  useEffect(() => {
    outboxRef.current = outbox;
  }, [outbox]);
  useEffect(() => {
    if (historyReady) void outboxRef.current.flush();
  }, [historyReady, isOnline, channelId, draftKey]);

  return outbox;
}
