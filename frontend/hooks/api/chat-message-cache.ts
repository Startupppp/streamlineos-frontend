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

let lastTempId = 0;

export function nextChatTempId(): number {
  lastTempId -= 1;
  return lastTempId;
}

type ChatMessagePatch = Partial<
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

type MessageListPage = Pick<MessagesPage, "messages">;

function mapTimeline<TPage extends MessageListPage>(
  data: InfiniteData<TPage> | undefined,
  messageId: number,
  fn: (message: Message) => Message,
): InfiniteData<TPage> | undefined {
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
  for (const [, data] of queryClient.getQueriesData<InfiniteData<MessageListPage>>({
    queryKey: collaborationQueryKeys.chat.messageContextsInChannel(channelId),
  })) {
    const found = data?.pages
      .flatMap((page) => page.messages)
      .find((message) => message.id === messageId);
    if (found) return found;
  }
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
  for (const queryKey of [
    collaborationQueryKeys.chat.messagesAll(),
    collaborationQueryKeys.chat.messageContextsAll(),
  ]) {
    for (const [, data] of queryClient.getQueriesData<InfiniteData<MessageListPage>>({ queryKey })) {
      const found = data?.pages
        .flatMap((page) => page.messages)
        .find((message) => message.id === messageId);
      if (found) return found;
    }
  }
  return undefined;
}

export function contextWindowsHolding(
  queryClient: QueryClient,
  channelId: number,
  messageId: number,
): QueryKey[] {
  return queryClient
    .getQueriesData<InfiniteData<MessageListPage>>({
      queryKey: collaborationQueryKeys.chat.messageContextsInChannel(channelId),
    })
    .filter(([, data]) =>
      data?.pages.some((page) => page.messages.some((message) => message.id === messageId)),
    )
    .map(([key]) => key);
}

export async function cancelLoadedQueries(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
): Promise<void> {
  const loaded = queryKeys.flatMap((queryKey) =>
    queryClient
      .getQueriesData({ queryKey })
      .filter(([, data]) => data !== undefined)
      .map(([key]) => key),
  );
  await Promise.all(
    loaded.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })),
  );
}

export async function cancelChatMessageQueries(
  queryClient: QueryClient,
  channelId: number,
): Promise<void> {
  await cancelLoadedQueries(queryClient, [
    collaborationQueryKeys.chat.messages(channelId),
    collaborationQueryKeys.chat.messageContextsInChannel(channelId),
    collaborationQueryKeys.chat.threadsInChannel(channelId),
    collaborationQueryKeys.chat.pins(channelId),
    collaborationQueryKeys.chat.savedMessages(),
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
  for (const [key] of queryClient.getQueriesData<InfiniteData<MessageListPage>>({
    queryKey: collaborationQueryKeys.chat.messageContextsInChannel(channelId),
  })) {
    keep(
      patchItems<InfiniteData<MessageListPage>, Message>(
        queryClient,
        key,
        (data, fn) => mapTimeline(data, messageId, fn),
        (message) => ({ ...message, ...patch }),
      ),
    );
  }
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
