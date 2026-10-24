"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from "react";
import { useSession } from "next-auth/react";
import { hashKey, onlineManager, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { useSendMessage } from "@/hooks/api/chat-message-mutations";
import { useSendThreadReply } from "@/hooks/api/chat-search";
import { optimisticMessage } from "@/hooks/api/chat-send-policy";
import { mapPages } from "@/hooks/api/chat-message-cache";
import type { SendMessageInput, ThreadPage } from "@/types/chat";
import {
  appendOutboxEntry,
  chatThreadDraftKey,
  listOutboxChannels,
  removeOutboxEntry,
  type OutboxEntry,
} from "./composer-draft";
import { appendThreadReply } from "./message-page-merge";
import {
  drainChannelOutbox,
  onOutboxDrainRequest,
  reportSendFailure,
  restoreOutboxRows,
  type ChannelOutbox,
  type OutboxCacheAdapter,
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
  cacheAdapter,
  historyQueryKey,
}: {
  channelId: number;
  draftKey: string;
  isOnline: boolean;
  mutateAsync: (input: SendMessageInput) => Promise<unknown>;
  cacheAdapter?: OutboxCacheAdapter;
  historyQueryKey?: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const author = useSendAuthor();
  const subscribeToCache = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(onChange),
    [queryClient],
  );
  const readHistoryReady = useCallback(
    () =>
      queryClient.getQueryData(
        historyQueryKey ?? collaborationQueryKeys.chat.messages(channelId),
      ) !== undefined,
    [queryClient, channelId, historyQueryKey],
  );
  const historyReady = useSyncExternalStore(subscribeToCache, readHistoryReady, assumeHistoryMissing);

  const outbox = useMemo(() => {
    const target: ChannelOutbox = { queryClient, channelId, draftKey, isOnline, author, mutateAsync, cacheAdapter };
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
  }, [queryClient, channelId, draftKey, isOnline, author, mutateAsync, cacheAdapter]);

  const outboxRef = useRef(outbox);
  useEffect(() => {
    outboxRef.current = outbox;
  }, [outbox]);
  useEffect(() => {
    if (historyReady) void outboxRef.current.flush();
  }, [historyReady, isOnline, channelId, draftKey]);
  useEffect(() => onOutboxDrainRequest(() => void outboxRef.current.flush()), []);
  useEffect(() => {
    const keyToWatch = historyQueryKey ?? collaborationQueryKeys.chat.messages(channelId);
    const historyHash = hashKey(keyToWatch);
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success" && hashKey(event.query.queryKey) === historyHash)
        outboxRef.current.restore();
    });
  }, [queryClient, channelId, historyQueryKey]);

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

export function useThreadOutbox({
  channelId,
  parentMessageId,
}: {
  channelId: number;
  parentMessageId: number;
}) {
  const queryClient = useQueryClient();
  const scope = useOrgStorageScope();
  const author = useSendAuthor();
  const draftKey = useMemo(
    () => chatThreadDraftKey(channelId, parentMessageId, scope),
    [channelId, parentMessageId, scope],
  );
  const threadKey = useMemo(
    () => collaborationQueryKeys.chat.thread(channelId, parentMessageId),
    [channelId, parentMessageId],
  );
  const { mutateAsync: replyMutateAsync, isPending } = useSendThreadReply(channelId, parentMessageId);
  const isOnline = useSyncExternalStore(subscribeToConnectivity, readOnline, assumeOnline);

  const mutateAsync = useCallback(
    (input: SendMessageInput) =>
      replyMutateAsync({
        content: input.content,
        attachments: input.attachments,
        clientKey: input.clientKey,
      }),
    [replyMutateAsync],
  );

  const cacheAdapter = useMemo<OutboxCacheAdapter>(
    () => ({
      isDataLoaded: () => queryClient.getQueryData(threadKey) !== undefined,
      readShownClientKeys: () => {
        const data = queryClient.getQueryData<InfiniteData<ThreadPage>>(threadKey);
        const delivered = new Set<string>();
        const pending = new Set<string>();
        for (const page of data?.pages ?? [])
          for (const reply of page.replies)
            if (reply.clientKey) (reply.id > 0 ? delivered : pending).add(reply.clientKey);
        return { delivered, pending };
      },
      showPending: (entry) => {
        const optimistic = optimisticMessage({
          channelId,
          clientKey: entry.clientKey,
          content: entry.content || undefined,
          replyToId: parentMessageId,
          attachments: entry.attachments,
          metadata: entry.metadata,
          author,
        });
        queryClient.setQueryData<InfiniteData<ThreadPage>>(threadKey, (old) =>
          appendThreadReply(old, optimistic),
        );
      },
      dropOptimistic: (clientKey) => {
        queryClient.setQueryData<InfiniteData<ThreadPage>>(threadKey, (old) =>
          mapPages(old, (page) => {
            const replies = page.replies.filter((r) => !(r.id < 0 && r.clientKey === clientKey));
            return replies.length === page.replies.length ? page : { ...page, replies };
          }),
        );
      },
    }),
    [queryClient, threadKey, channelId, parentMessageId, author],
  );

  const outbox = useChatOutbox({ channelId, draftKey, isOnline, mutateAsync, cacheAdapter, historyQueryKey: threadKey });
  const discardFailed = useCallback(
    (clientKey: string) => {
      removeOutboxEntry(draftKey, clientKey);
      cacheAdapter.dropOptimistic(clientKey);
    },
    [draftKey, cacheAdapter],
  );
  return { ...outbox, draftKey, discardFailed, isOnline, isPending };
}
