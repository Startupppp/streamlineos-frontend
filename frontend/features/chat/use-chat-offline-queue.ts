"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from "react";
import { useSession } from "next-auth/react";
import { hashKey, onlineManager, useQueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { useSendMessage } from "@/hooks/api/chat-core-mutations-a";
import type { SendMessageInput } from "@/types/chat";
import { appendOutboxEntry, listOutboxChannels, type OutboxEntry } from "./composer-draft";
import {
  drainChannelOutbox,
  onOutboxDrainRequest,
  reportSendFailure,
  restoreOutboxRows,
  type ChannelOutbox,
  type SendOutcome,
} from "./chat-outbox-delivery";

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

function useSendAuthor(): ChannelOutbox["author"] {
  const { data: session } = useSession();
  return session?.user;
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
  const author = useSendAuthor();
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
    const target: ChannelOutbox = { queryClient, channelId, draftKey, isOnline, author, mutateAsync };
    const enqueue = (entry: OutboxEntry): Promise<SendOutcome> => {
      appendOutboxEntry(draftKey, entry);
      const started = drainChannelOutbox(target);
      for (const [clientKey, outcome] of started) if (clientKey !== entry.clientKey) void reportSendFailure(outcome);
      const own = started.get(entry.clientKey);
      if (!own) return Promise.resolve<SendOutcome>({ status: "queued" });
      void reportSendFailure(own);
      return own;
    };
    const flush = async (): Promise<void> => {
      await Promise.all([...drainChannelOutbox(target).values()].map(reportSendFailure));
    };
    const restore = (): void => restoreOutboxRows(target);
    return { enqueue, flush, restore };
  }, [queryClient, channelId, draftKey, isOnline, author, mutateAsync]);

  const outboxRef = useRef(outbox);
  useEffect(() => {
    outboxRef.current = outbox;
  }, [outbox]);
  useEffect(() => {
    if (historyReady) void outboxRef.current.flush();
  }, [historyReady, isOnline, channelId, draftKey]);
  useEffect(() => onOutboxDrainRequest(() => void outboxRef.current.flush()), []);
  useEffect(() => {
    const messagesHash = hashKey(collaborationQueryKeys.chat.messages(channelId));
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success" && hashKey(event.query.queryKey) === messagesHash)
        outboxRef.current.restore();
    });
  }, [queryClient, channelId]);

  return outbox;
}

export function useChatOutboxDrain(): void {
  const queryClient = useQueryClient();
  const author = useSendAuthor();
  const scope = useOrgStorageScope();
  const { mutateAsync } = useSendMessage();
  const isOnline = useSyncExternalStore(subscribeToConnectivity, readOnline, assumeOnline);
  const drainAll = useCallback(() => {
    for (const { channelId, draftKey } of listOutboxChannels(scope))
      for (const outcome of drainChannelOutbox({ queryClient, channelId, draftKey, isOnline, author, mutateAsync }).values())
        void reportSendFailure(outcome);
  }, [queryClient, scope, isOnline, author, mutateAsync]);
  const drainRef = useRef(drainAll);
  useEffect(() => {
    drainRef.current = drainAll;
  }, [drainAll]);
  useEffect(() => {
    if (isOnline) drainRef.current();
  }, [isOnline, scope]);
  useEffect(() => onOutboxDrainRequest(() => drainRef.current()), []);
}
