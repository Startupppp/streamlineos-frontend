import type { InfiniteData } from "@tanstack/react-query";
import type { Message, MessagesPage } from "@/types/chat";

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
  if (existing.some((message) => message.id === incoming.id)) return old;

  const isOptimisticCopy = (message: Message): boolean =>
    message.id < 0 &&
    clientKey !== null &&
    clientKey !== undefined &&
    clientKey !== "" &&
    message.clientKey === clientKey;

  if (existing.some(isOptimisticCopy))
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        messages: page.messages.map((message) =>
          isOptimisticCopy(message) ? incoming : message,
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
