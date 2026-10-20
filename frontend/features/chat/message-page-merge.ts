import type { InfiniteData } from "@tanstack/react-query";
import { mapPages } from "@/hooks/api/chat-message-cache";
import type { Message, MessagesPage, ThreadPage } from "@/types/chat";

export function flattenMessagePages(
  data: InfiniteData<MessagesPage> | undefined,
): Message[] {
  const all = [...(data?.pages ?? [])]
    .reverse()
    .flatMap((page) => page.messages);
  const seen = new Set<number>();
  return all.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}

export function mergeInboundMessage(
  old: InfiniteData<MessagesPage>,
  incoming: Message,
  clientKey: string | null | undefined,
): InfiniteData<MessagesPage> {
  const existing = old.pages.flatMap((page) => page.messages);
  const known = existing.find((message) => message.id === incoming.id);
  if (known) {
    if (known.attachments.length > 0 || incoming.attachments.length === 0) return old;
    return mapPages(old, (page) =>
      page.messages.includes(known)
        ? {
            ...page,
            messages: page.messages.map((message) =>
              message === known ? { ...message, attachments: incoming.attachments } : message,
            ),
          }
        : page,
    ) ?? old;
  }

  if (existing.some((message) => sameSend(message, clientKey)))
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        messages: page.messages.map((message) =>
          sameSend(message, clientKey) ? incoming : message,
        ),
      })),
    };

  return {
    ...old,
    pages: old.pages.map((page, index) =>
      index === 0
        ? { ...page, messages: [...page.messages, incoming] }
        : page,
    ),
  };
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

function sameSend(message: Message, clientKey: string | null | undefined): boolean {
  return message.id < 0 && clientKey != null && clientKey !== "" && message.clientKey === clientKey;
}

export function appendThreadReply(
  data: InfiniteData<ThreadPage> | undefined,
  reply: Message,
): InfiniteData<ThreadPage> | undefined {
  if (!data || data.pages.length === 0) return data;
  const replies = data.pages.flatMap((page) => page.replies);
  if (replies.some((message) => message.id === reply.id)) return data;
  if (replies.some((message) => sameSend(message, reply.clientKey)))
    return reconcileThreadReply(data, reply.clientKey ?? "", () => reply);
  return {
    ...data,
    pages: data.pages.map((page, index) =>
      index === 0 ? { ...page, replies: [...page.replies, reply] } : page,
    ),
  };
}

export function reconcileThreadReply(
  data: InfiniteData<ThreadPage> | undefined,
  clientKey: string,
  fn: (optimistic: Message) => Message,
): InfiniteData<ThreadPage> | undefined {
  return mapPages(data, (page) => {
    if (!page.replies.some((m) => sameSend(m, clientKey))) return page;
    const reconciled = page.replies.map((m) => (sameSend(m, clientKey) ? fn(m) : m));
    return { ...page, replies: dedupeById(reconciled) };
  });
}

export function removeThreadReply(
  data: InfiniteData<ThreadPage> | undefined,
  replyId: number,
): InfiniteData<ThreadPage> | undefined {
  return mapPages(data, (page) => {
    const replies = page.replies.filter((m) => m.id !== replyId);
    return replies.length === page.replies.length ? page : { ...page, replies };
  });
}

function dedupeById(messages: Message[]): Message[] {
  const seen = new Set<number>();
  return messages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export function replaceOptimisticMessage(
  data: InfiniteData<MessagesPage> | undefined,
  clientKey: string,
  fn: (optimistic: Message) => Message,
): InfiniteData<MessagesPage> | undefined {
  return mapPages(data, (page) => {
    if (!page.messages.some((m) => sameSend(m, clientKey))) return page;
    const reconciled = page.messages.map((m) => (sameSend(m, clientKey) ? fn(m) : m));
    return { ...page, messages: dedupeById(reconciled) };
  });
}

export function removeOptimisticMessage(
  data: InfiniteData<MessagesPage> | undefined,
  clientKey: string,
): InfiniteData<MessagesPage> | undefined {
  return mapPages(data, (page) => {
    const messages = page.messages.filter((m) => !sameSend(m, clientKey));
    return messages.length === page.messages.length ? page : { ...page, messages };
  });
}
