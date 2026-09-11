"use client";

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { MailActionBody, MailListResponse, MailMessageSummary } from "@/types/mail";
import type { UnifiedInboxItem, UnifiedInboxResponse } from "@/types/inbox";

interface MailCacheSnapshot {
  key: readonly unknown[];
  data: unknown;
}

export interface MailActionCacheContext {
  snapshots: MailCacheSnapshot[];
}

/**
 * A mail action reaches two caches: the folder listing and the unified inbox.
 * Both are patched before the request leaves, and both are restored from the
 * same snapshot set when it fails.
 *
 * Every patch matches on `(id, accountId)`, never on `id` alone. A message id is
 * the provider's, not ours — the lists key their rows `accountId-id` for exactly
 * that reason — so archiving in one connected mailbox used to delete a same-id
 * row belonging to another, with no request in flight that could ever put it
 * back. markRead and star already matched on the pair; archive/trash did not.
 *
 * There is deliberately no star branch for the unified inbox: `MailInboxItem`
 * carries no `isStarred`, and inventing one here would patch a field the list
 * neither receives from the server nor renders.
 */
export async function applyMailActionToCaches(
  qc: QueryClient,
  messageId: string,
  body: MailActionBody,
): Promise<MailActionCacheContext> {
  const { action, accountId } = body;
  const messagesPrefix = [...directoryAndOwnershipQueryKeys.mail.all, "messages"] as const;
  const unifiedPrefix = [...platformCoreQueryKeys.inbox.all, "unified"] as const;

  await qc.cancelQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all });
  await qc.cancelQueries({ queryKey: unifiedPrefix });

  const snapshots: MailCacheSnapshot[] = [];

  const cache = qc.getQueriesData<InfiniteData<MailListResponse>>({
    queryKey: messagesPrefix,
  });

  for (const [key, data] of cache) {
    if (!data) continue;
    snapshots.push({ key, data });

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
            messages: page.messages.map((m): MailMessageSummary =>
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
            messages: page.messages.map((m): MailMessageSummary =>
              m.id === messageId && m.accountId === accountId
                ? { ...m, isStarred: nextIsStarred }
                : m,
            ),
          })),
        };
      });
    }
  }

  const unifiedCache = qc.getQueriesData<InfiniteData<UnifiedInboxResponse>>({
    queryKey: unifiedPrefix,
  });

  for (const [key, data] of unifiedCache) {
    if (!data) continue;
    snapshots.push({ key, data });

    if (action === "archive" || action === "trash") {
      qc.setQueryData<InfiniteData<UnifiedInboxResponse>>(key, (old) => {
        if (!old) return old;
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
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item): UnifiedInboxItem =>
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

  return { snapshots };
}

export function restoreMailCaches(qc: QueryClient, context: MailActionCacheContext): void {
  for (const { key, data } of context.snapshots) {
    qc.setQueryData(key, data);
  }
}
