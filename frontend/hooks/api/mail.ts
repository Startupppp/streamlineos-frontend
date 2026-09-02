"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useCan } from "@/hooks/api/access";
import type {
  MailAccount,
  MailListResponse,
  MailMessageDetail,
  MailMessageSummary,
  MailMessagesParams,
  SendMailBody,
  ReplyMailBody,
  MailActionBody,
} from "@/types/mail";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";
import type { UnifiedInboxItem, UnifiedInboxResponse } from "@/types/inbox";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useMailAccounts() {
  const can = useCan("mail:inbox:view");
  return useQuery({
    queryKey: queryKeys.mail.accounts(),
    queryFn: ({ signal }) => apiClient.get<MailAccount[]>("/mail/accounts", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: can,
  });
}

export function useMailMessages(params: MailMessagesParams) {
  const can = useCan("mail:inbox:view");
  const queryParams: Record<string, unknown> = {};
  if (params.folder) queryParams.folder = params.folder;
  if (params.accountId !== undefined) queryParams.accountId = params.accountId;
  if (params.q) queryParams.q = params.q;
  if (params.limit) queryParams.limit = params.limit;

  return useInfiniteQuery({
    queryKey: queryKeys.mail.messages(queryParams),
    queryFn: ({ pageParam , signal }) => {
      const searchParams = new URLSearchParams();
      if (params.folder) searchParams.set("folder", params.folder);
      if (params.accountId !== undefined) searchParams.set("accountId", String(params.accountId));
      if (params.q) searchParams.set("q", params.q);
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (pageParam) searchParams.set("cursor", String(pageParam));
      return apiClient.get<MailListResponse>(`/mail/messages?${searchParams.toString()}`, undefined, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: can,
  });
}

export function useMailThread(accountId: number | undefined, threadId: string | undefined) {
  const can = useCan("mail:inbox:view");
  return useQuery({
    queryKey: queryKeys.mail.thread(accountId ?? 0, threadId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<MailMessageDetail[]>(
        `/mail/threads/${threadId}?accountId=${accountId}`, undefined, signal,
      ),
    enabled: can && accountId !== undefined && threadId !== undefined && threadId !== "",
    staleTime: 2 * 60_000,
  });
}

export function useMailMessage(accountId: number | undefined, messageId: string | undefined) {
  const can = useCan("mail:inbox:view");
  return useQuery({
    queryKey: queryKeys.mail.message(accountId ?? 0, messageId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<MailMessageDetail>(
        `/mail/messages/${messageId}?accountId=${accountId}`, undefined, signal,
      ),
    enabled: can && accountId !== undefined && messageId !== undefined && messageId !== "",
    staleTime: 2 * 60_000,
  });
}

/** The idempotency key belongs to the send, not the HTTP call — see `useIdempotentOperation`. */
export function useSendMail() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("mail:messages:send", {
    mutationKey: ["mail", "send"],
    mutationFn: (body: SendMailBody) =>
      apiClient.post<{ messageId: string }>("/mail/send", body, operation.configFor(body)),
    onSuccess: () => {
      operation.settle();
      void qc.invalidateQueries({ queryKey: queryKeys.mail.all });
    },
  });
}

export function useReplyMail() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("mail:messages:send", {
    mutationKey: ["mail", "reply"],
    mutationFn: (body: ReplyMailBody) =>
      apiClient.post<{ messageId: string }>("/mail/reply", body, operation.configFor(body)),
    onSuccess: () => {
      operation.settle();
      void qc.invalidateQueries({ queryKey: queryKeys.mail.all });
    },
  });
}

interface MailInboxSummaryHighlight {
  subject: string;
  fromEmail: string;
  reason: string;
}

interface MailInboxSummaryResult {
  summary: string;
  highlights: MailInboxSummaryHighlight[];
  actionItems: string[];
  aiUsage?: AiUsageMeta | null;
}

interface MailThreadSummaryResult {
  summary: string;
  actionItems: string[];
  suggestedReply: string;
}

interface MailAiDraftResult {
  subject: string;
  bodyHtml: string;
}

export function useMailInboxSummary() {
  return useAuthorizedMutation("mail:ai:use", {
    mutationKey: ["mail", "ai", "inbox-summary"],
    mutationFn: (params: { accountId?: number | "all" }) =>
      apiClient.post<MailInboxSummaryResult>("/mail/ai/inbox-summary", params),
  });
}

export function useMailThreadSummary() {
  return useAuthorizedMutation("mail:ai:use", {
    mutationKey: ["mail", "ai", "thread-summary"],
    mutationFn: (params: { accountId: number; threadId: string }) =>
      apiClient.post<MailThreadSummaryResult>("/mail/ai/thread-summary", params),
  });
}

export function useMailAiDraft() {
  return useAuthorizedMutation("mail:ai:use", {
    mutationKey: ["mail", "ai", "draft"],
    mutationFn: (params: {
      mode: "compose" | "reply";
      instruction: string;
      accountId?: number;
      threadId?: string;
    }) => apiClient.post<MailAiDraftResult>("/mail/ai/draft", params),
  });
}

export function useMailAction() {
  const qc = useQueryClient();
  return useAuthorizedMutation("mail:messages:manage", {
    mutationKey: ["mail", "action"],
    mutationFn: ({ messageId, body }: { messageId: string; body: MailActionBody }) =>
      apiClient.post<{ success: boolean }>(`/mail/messages/${messageId}/actions`, body),
    onMutate: async ({ messageId, body }) => {
      const { action, accountId } = body;
      const messagesPrefix = [...queryKeys.mail.all, "messages"] as const;
      const unifiedPrefix = [...queryKeys.inbox.all, "unified"] as const;

      await qc.cancelQueries({ queryKey: queryKeys.mail.all });
      await qc.cancelQueries({ queryKey: unifiedPrefix });

      const snapshots: Array<{ key: readonly unknown[]; data: unknown }> = [];

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
                messages: page.messages.filter((m) => m.id !== messageId),
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
                  (item) => !(item.kind === "mail" && item.id === messageId),
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
                  item.kind === "mail" && item.id === messageId
                    ? { ...item, isRead: nextIsRead }
                    : item,
                ),
              })),
            };
          });
        }
      }

      return { snapshots };
    },
    onError: (_, _variables, context) => {
      if (!context) return;
      for (const { key, data } of context.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.mail.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inbox.all });
    },
  });
}
