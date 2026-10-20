import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type {
  Message,
  MessagesPage,
  PinnedMessage,
  SavedMessage,
  SavedMessagesPage,
  ThreadPage,
} from "@/types/chat";

export type ChatCacheRollback = () => void;

export type ChatMessagePatch = Partial<
  Pick<Message, "content" | "isEdited" | "isDeleted" | "reactions" | "updatedAt">
>;

export function runRollbacks(rollbacks: readonly ChatCacheRollback[]): void {
  for (const rollback of [...rollbacks].reverse()) rollback();
}

function mapMessageList<T extends { id: number }>(
  list: T[],
  messageId: number,
  fn: (message: T) => T,
): T[] {
  let changed = false;
  const next = list.map((message) => {
    if (message.id !== messageId) return message;
    const patched = fn(message);
    if (patched !== message) changed = true;
    return patched;
  });
  return changed ? next : list;
}

export function mapPages<TPage>(
  data: InfiniteData<TPage> | undefined,
  fn: (page: TPage) => TPage,
): InfiniteData<TPage> | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const next = fn(page);
    if (next !== page) changed = true;
    return next;
  });
  return changed ? { ...data, pages } : data;
}

function mapTimeline(
  data: InfiniteData<MessagesPage> | undefined,
  messageId: number,
  fn: (message: Message) => Message,
): InfiniteData<MessagesPage> | undefined {
  return mapPages(data, (page) => {
    const messages = mapMessageList(page.messages, messageId, fn);
    return messages === page.messages ? page : { ...page, messages };
  });
}

function mapThread(
  data: InfiniteData<ThreadPage> | undefined,
  messageId: number,
  fn: (message: Message) => Message,
): InfiniteData<ThreadPage> | undefined {
  return mapPages(data, (page) => {
    const replies = mapMessageList(page.replies, messageId, fn);
    const parentMessage =
      page.parentMessage.id === messageId ? fn(page.parentMessage) : page.parentMessage;
    return replies === page.replies && parentMessage === page.parentMessage
      ? page
      : { ...page, replies, parentMessage };
  });
}

export function patchItems<TData, TItem>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  map: (data: TData | undefined, fn: (item: TItem) => TItem) => TData | undefined,
  patchItem: (item: TItem) => TItem,
): ChatCacheRollback | null {
  const originals: TItem[] = [];
  const previous = queryClient.getQueryData<TData>(queryKey);
  const next = map(previous, (item) => {
    originals.push(item);
    return patchItem(item);
  });
  if (originals.length === 0 || next === previous) return null;
  queryClient.setQueryData<TData>(queryKey, next);
  const original = originals[0];
  return () => {
    queryClient.setQueryData<TData>(queryKey, (current) => map(current, () => original));
  };
}

export function findCachedMessage(
  queryClient: QueryClient,
  channelId: number,
  messageId: number,
): Message | undefined {
  const timeline = queryClient
    .getQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(channelId))
    ?.pages.flatMap((page) => page.messages)
    .find((message) => message.id === messageId);
  if (timeline) return timeline;
  for (const [, data] of queryClient.getQueriesData<InfiniteData<ThreadPage>>({
    queryKey: collaborationQueryKeys.chat.threadsInChannel(channelId),
  })) {
    for (const page of data?.pages ?? []) {
      if (page.parentMessage.id === messageId) return page.parentMessage;
      const reply = page.replies.find((message) => message.id === messageId);
      if (reply) return reply;
    }
  }
  return undefined;
}

export function findCachedMessageAnywhere(
  queryClient: QueryClient,
  messageId: number,
): Message | undefined {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<MessagesPage>>({
    queryKey: collaborationQueryKeys.chat.messagesAll(),
  })) {
    const found = data?.pages
      .flatMap((page) => page.messages)
      .find((message) => message.id === messageId);
    if (found) return found;
  }
  return undefined;
}

export async function cancelChatMessageQueries(
  queryClient: QueryClient,
  channelId: number,
): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: collaborationQueryKeys.chat.messages(channelId) }),
    queryClient.cancelQueries({ queryKey: collaborationQueryKeys.chat.threadsInChannel(channelId) }),
    queryClient.cancelQueries({ queryKey: collaborationQueryKeys.chat.pins(channelId), exact: true }),
    queryClient.cancelQueries({ queryKey: collaborationQueryKeys.chat.savedMessages(), exact: true }),
  ]);
}

export function patchChatMessage(
  queryClient: QueryClient,
  channelId: number,
  messageId: number,
  patch: ChatMessagePatch,
): ChatCacheRollback {
  const rollbacks: ChatCacheRollback[] = [];
  const keep = (rollback: ChatCacheRollback | null) => {
    if (rollback) rollbacks.push(rollback);
  };
  keep(
    patchItems<InfiniteData<MessagesPage>, Message>(
      queryClient,
      collaborationQueryKeys.chat.messages(channelId),
      (data, fn) => mapTimeline(data, messageId, fn),
      (message) => ({ ...message, ...patch }),
    ),
  );
  for (const [key] of queryClient.getQueriesData<InfiniteData<ThreadPage>>({
    queryKey: collaborationQueryKeys.chat.threadsInChannel(channelId),
  })) {
    keep(
      patchItems<InfiniteData<ThreadPage>, Message>(
        queryClient,
        key,
        (data, fn) => mapThread(data, messageId, fn),
        (message) => ({ ...message, ...patch }),
      ),
    );
  }
  keep(
    patchItems<PinnedMessage[], PinnedMessage>(
      queryClient,
      collaborationQueryKeys.chat.pins(channelId),
      (data, fn) => data?.map((pin) => (pin.messageId === messageId ? fn(pin) : pin)),
      (pin) => ({ ...pin, message: { ...pin.message, ...patch } }),
    ),
  );
  keep(
    patchItems<InfiniteData<SavedMessagesPage>, SavedMessage>(
      queryClient,
      collaborationQueryKeys.chat.savedMessages(),
      (data, fn) =>
        mapPages(data, (page) =>
          page.items.some((item) => item.messageId === messageId)
            ? {
                ...page,
                items: page.items.map((item) => (item.messageId === messageId ? fn(item) : item)),
              }
            : page,
        ),
      (item) => ({ ...item, message: { ...item.message, ...patch } }),
    ),
  );
  return () => runRollbacks(rollbacks);
}

export function appendTimelineMessage(
  data: InfiniteData<MessagesPage> | undefined,
  message: Message,
): InfiniteData<MessagesPage> | undefined {
  if (!data || data.pages.length === 0) return data;
  return {
    ...data,
    pages: data.pages.map((page, index) =>
      index === 0 ? { ...page, messages: [...page.messages, message] } : page,
    ),
  };
}

export function appendThreadReply(
  data: InfiniteData<ThreadPage> | undefined,
  reply: Message,
): InfiniteData<ThreadPage> | undefined {
  if (!data || data.pages.length === 0) return data;
  const exists = data.pages.some((page) =>
    page.replies.some(
      (message) =>
        message.id === reply.id ||
        (reply.clientKey != null && reply.clientKey !== "" && message.clientKey === reply.clientKey),
    ),
  );
  if (exists)
    return mapPages(data, (page) => ({
      ...page,
      replies: page.replies.map((message) =>
        message.id < 0 && reply.clientKey != null && message.clientKey === reply.clientKey
          ? reply
          : message,
      ),
    }));
  return {
    ...data,
    pages: data.pages.map((page, index) =>
      index === 0 ? { ...page, replies: [...page.replies, reply] } : page,
    ),
  };
}

export function replaceOptimisticMessage(
  data: InfiniteData<MessagesPage> | undefined,
  clientKey: string,
  fn: (optimistic: Message) => Message,
): InfiniteData<MessagesPage> | undefined {
  return mapPages(data, (page) => {
    if (!page.messages.some((m) => m.id < 0 && m.clientKey === clientKey)) return page;
    const reconciled = page.messages.map((m) =>
      m.id < 0 && m.clientKey === clientKey ? fn(m) : m,
    );
    const seen = new Set<number>();
    return {
      ...page,
      messages: reconciled.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }),
    };
  });
}

export function removeOptimisticMessage(
  data: InfiniteData<MessagesPage> | undefined,
  clientKey: string,
): InfiniteData<MessagesPage> | undefined {
  return mapPages(data, (page) => {
    const messages = page.messages.filter((m) => !(m.id < 0 && m.clientKey === clientKey));
    return messages.length === page.messages.length ? page : { ...page, messages };
  });
}
