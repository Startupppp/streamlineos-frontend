"use client";

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  MailActionBody,
  MailListResponse,
  MailMessageDetail,
  MailMessageSummary,
} from "@/types/mail";
import type {
  UnifiedInboxCount,
  UnifiedInboxItem,
  UnifiedInboxResponse,
} from "@/types/inbox";

interface MailCacheSnapshot {
  key: readonly unknown[];
  data: unknown;
}

interface MailActionCacheContext {
  snapshots: MailCacheSnapshot[];
}

export async function applyMailActionToCaches(
  qc: QueryClient,
  messageId: string,
  body: MailActionBody,
): Promise<MailActionCacheContext> {
  const { action, accountId } = body;
  const messagesPrefix = [
    ...directoryAndOwnershipQueryKeys.mail.all,
    "messages",
  ] as const;
  const unifiedPrefix = [
    ...platformCoreQueryKeys.inbox.all,
    "unified",
  ] as const;
  const unifiedCountKey = platformCoreQueryKeys.inbox.unified({ count: true });

  const hasCacheData = (query: { state: { data: unknown } }) =>
    query.state.data !== undefined;
  await qc.cancelQueries({
    queryKey: directoryAndOwnershipQueryKeys.mail.all,
    predicate: hasCacheData,
  });
  await qc.cancelQueries({ queryKey: unifiedPrefix, predicate: hasCacheData });

  const snapshots: MailCacheSnapshot[] = [];
  const capturedKeys = new Set<string>();
  const capture = (key: readonly unknown[], data: unknown): void => {
    const serialized = JSON.stringify(key);
    if (capturedKeys.has(serialized)) return;
    capturedKeys.add(serialized);
    snapshots.push({ key, data });
  };
  let previousIsRead: boolean | undefined;

  const cache = qc.getQueriesData<InfiniteData<MailListResponse>>({
    queryKey: messagesPrefix,
  });

  for (const [key, data] of cache) {
    if (!data) continue;
    capture(key, data);

    const cachedMessage = data.pages
      .flatMap((page) => page.messages)
      .find(
        (message) =>
          message.id === messageId && message.accountId === accountId,
      );
    if (cachedMessage) previousIsRead = cachedMessage.isRead;

    if (action === "archive" || action === "trash") {
      qc.setQueryData<InfiniteData<MailListResponse>>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter(
              (m) => !(m.id === messageId && m.accountId === accountId),
            ),
          })),
        };
      });
    } else if (action === "markRead" || action === "markUnread") {
      const nextIsRead = action === "markRead";
      qc.setQueryData<InfiniteData<MailListResponse>>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map(
              (m): MailMessageSummary =>
                m.id === messageId && m.accountId === accountId
                  ? { ...m, isRead: nextIsRead }
                  : m,
            ),
          })),
        };
      });
    } else if (action === "star" || action === "unstar") {
      const nextIsStarred = action === "star";
      qc.setQueryData<InfiniteData<MailListResponse>>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map(
              (m): MailMessageSummary =>
                m.id === messageId && m.accountId === accountId
                  ? { ...m, isStarred: nextIsStarred }
                  : m,
            ),
          })),
        };
      });
    }
  }

  if (action !== "archive" && action !== "trash") {
    const detailCache = qc.getQueriesData<MailMessageDetail>({
      queryKey: [
        ...directoryAndOwnershipQueryKeys.mail.all,
        "message",
        accountId,
      ],
    });
    for (const [key, data] of detailCache) {
      if (!data || data.id !== messageId) continue;
      capture(key, data);
      qc.setQueryData<MailMessageDetail>(key, (old) =>
        old ? patchMailMessage(old, action) : old,
      );
    }

    const threadCache = qc.getQueriesData<MailMessageDetail[]>({
      queryKey: [
        ...directoryAndOwnershipQueryKeys.mail.all,
        "thread",
        accountId,
      ],
    });
    for (const [key, data] of threadCache) {
      if (!data?.some((message) => message.id === messageId)) continue;
      capture(key, data);
      qc.setQueryData<MailMessageDetail[]>(key, (old) =>
        old?.map((message) =>
          message.id === messageId
            ? patchMailMessage(message, action)
            : message,
        ),
      );
    }
  }

  const unifiedCache = qc.getQueriesData<InfiniteData<UnifiedInboxResponse>>({
    queryKey: unifiedPrefix,
  });

  for (const [key, data] of unifiedCache) {
    if (!data) continue;
    capture(key, data);

    if ("pages" in data) {
      const cachedItem = data.pages
        .flatMap((page) => page.items)
        .find(
          (item) =>
            item.kind === "mail" &&
            item.id === messageId &&
            item.accountId === accountId,
        );
      if (cachedItem) previousIsRead = cachedItem.isRead;
    }

    if (action === "archive" || action === "trash") {
      qc.setQueryData<InfiniteData<UnifiedInboxResponse>>(key, (old) => {
        if (!old || !("pages" in old)) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter(
              (item) =>
                !(
                  item.kind === "mail" &&
                  item.id === messageId &&
                  item.accountId === accountId
                ),
            ),
          })),
        };
      });
    } else if (action === "markRead" || action === "markUnread") {
      const nextIsRead = action === "markRead";
      qc.setQueryData<InfiniteData<UnifiedInboxResponse>>(key, (old) => {
        if (!old || !("pages" in old)) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map(
              (item): UnifiedInboxItem =>
                item.kind === "mail" &&
                item.id === messageId &&
                item.accountId === accountId
                  ? { ...item, isRead: nextIsRead }
                  : item,
            ),
          })),
        };
      });
    }
  }

  const count = qc.getQueryData<UnifiedInboxCount>(unifiedCountKey);
  const unreadDelta = unreadCountDelta(action, previousIsRead);
  if (count && unreadDelta !== 0) {
    capture(unifiedCountKey, count);
    qc.setQueryData<UnifiedInboxCount>(unifiedCountKey, {
      ...count,
      mail: Math.max(0, count.mail + unreadDelta),
      total: Math.max(0, count.total + unreadDelta),
    });
  } else if (
    count &&
    previousIsRead === undefined &&
    action !== "star" &&
    action !== "unstar"
  ) {
    void qc.invalidateQueries({
      queryKey: unifiedCountKey,
      exact: true,
      refetchType: "none",
    });
  }

  return { snapshots };
}

function patchMailMessage<T extends MailMessageSummary>(
  message: T,
  action: MailActionBody["action"],
): T {
  if (action === "markRead") return { ...message, isRead: true };
  if (action === "markUnread") return { ...message, isRead: false };
  if (action === "star") return { ...message, isStarred: true };
  if (action === "unstar") return { ...message, isStarred: false };
  return message;
}

function unreadCountDelta(
  action: MailActionBody["action"],
  previousIsRead: boolean | undefined,
): number {
  if (previousIsRead === undefined) return 0;
  if (action === "markRead" && !previousIsRead) return -1;
  if (action === "markUnread" && previousIsRead) return 1;
  if ((action === "archive" || action === "trash") && !previousIsRead)
    return -1;
  return 0;
}

export function restoreMailCaches(
  qc: QueryClient,
  context: MailActionCacheContext,
): void {
  for (const { key, data } of context.snapshots) {
    qc.setQueryData(key, data);
  }
}

export function invalidateAfterMailSend(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all });
  void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all });
}

const SEEDED_UPDATED_AT = 0;
function mailSummaryToDetail(summary: MailMessageSummary): MailMessageDetail {
  return { ...summary, cc: [], bodyHtml: null, bodyText: null, attachments: [] };
}
export function seedMailDetailFromSummary(qc: QueryClient, summary: MailMessageSummary): void {
  const seeded = mailSummaryToDetail(summary);
  if (summary.threadId) {
    const key = directoryAndOwnershipQueryKeys.mail.thread(summary.accountId, summary.threadId);
    if (qc.getQueryData(key) === undefined)
      qc.setQueryData<MailMessageDetail[]>(key, [seeded], { updatedAt: SEEDED_UPDATED_AT });
    return;
  }
  const key = directoryAndOwnershipQueryKeys.mail.message(summary.accountId, summary.id);
  if (qc.getQueryData(key) === undefined)
    qc.setQueryData<MailMessageDetail>(key, seeded, { updatedAt: SEEDED_UPDATED_AT });
}
