import { replaceEqualDeep, type InfiniteData } from "@tanstack/react-query";
import { isRecord } from "@/lib/is-record";
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
    const settled = existing.some((message) => sameSend(message, clientKey))
      ? (removeOptimisticMessage(old, clientKey ?? "") ?? old)
      : old;
    if (!needsServerAttachments(known, incoming)) return settled;
    return mapPages(settled, (page) =>
      page.messages.includes(known)
        ? {
            ...page,
            messages: page.messages.map((message) =>
              message === known ? { ...message, attachments: incoming.attachments } : message,
            ),
          }
        : page,
    ) ?? settled;
  }

  if (existing.some((message) => sameSend(message, clientKey)))
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        messages: page.messages.map((message) =>
          sameSend(message, clientKey) ? { ...incoming, replyTo: incoming.replyTo ?? message.replyTo } : message,
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

function needsServerAttachments(known: Message, incoming: Message): boolean {
  return (
    incoming.attachments.length > 0 &&
    (known.attachments.length === 0 || known.attachments.some((attachment) => attachment.id < 0))
  );
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
  const known = replies.find((message) => message.id === reply.id);
  if (known) {
    if (!needsServerAttachments(known, reply)) return data;
    return mapPages(data, (page) =>
      page.replies.includes(known)
        ? {
            ...page,
            replies: page.replies.map((message) =>
              message === known ? { ...message, attachments: reply.attachments } : message,
            ),
          }
        : page,
    );
  }
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

function isMessagePages(value: unknown): value is InfiniteData<MessagesPage> {
  return (
    isRecord(value) &&
    Array.isArray(value.pages) &&
    value.pages.every((page) => isRecord(page) && Array.isArray(page.messages))
  );
}

export function newestConfirmedMessageId(data: unknown): number {
  if (!isMessagePages(data)) return 0;
  return data.pages.reduce(
    (max, page) => page.messages.reduce((top, message) => Math.max(top, message.id), max),
    0,
  );
}

function withConfirmedRows(
  previous: InfiniteData<MessagesPage>,
  next: InfiniteData<MessagesPage>,
): InfiniteData<MessagesPage> {
  const incoming = next.pages.flatMap((page) => page.messages);
  const known = new Set(incoming.map((message) => message.id));
  const newest = newestConfirmedMessageId(next);
  const carried = previous.pages
    .flatMap((page) => page.messages)
    .filter((message) => message.id > newest && !known.has(message.id))
    .sort((a, b) => a.id - b.id);
  if (carried.length === 0 || next.pages.length === 0) return next;
  return {
    ...next,
    pages: next.pages.map((page, index) =>
      index === 0
        ? {
            ...page,
            messages: [
              ...page.messages.filter((message) => message.id > 0),
              ...carried,
              ...page.messages.filter((message) => message.id < 0),
            ],
          }
        : page,
    ),
  };
}

export function keepConfirmedMessages(previous: unknown, next: unknown): unknown {
  if (!isMessagePages(previous) || !isMessagePages(next)) return replaceEqualDeep(previous, next);
  return replaceEqualDeep(previous, withConfirmedRows(previous, next));
}
