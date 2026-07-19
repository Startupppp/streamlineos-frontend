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

export function useMailAccounts() {
  return useQuery({
    queryKey: queryKeys.mail.accounts(),
    queryFn: () => apiClient.get<MailAccount[]>("/mail/accounts"),
    staleTime: 5 * 60_000,
  });
}

export function useMailMessages(params: MailMessagesParams) {
  const queryParams: Record<string, unknown> = {};
  if (params.folder) queryParams.folder = params.folder;
  if (params.accountId !== undefined) queryParams.accountId = params.accountId;
  if (params.q) queryParams.q = params.q;
  if (params.limit) queryParams.limit = params.limit;

  return useInfiniteQuery({
    queryKey: queryKeys.mail.messages(queryParams),
    queryFn: ({ pageParam }) => {
      const searchParams = new URLSearchParams();
      if (params.folder) searchParams.set("folder", params.folder);
      if (params.accountId !== undefined) searchParams.set("accountId", String(params.accountId));
      if (params.q) searchParams.set("q", params.q);
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (pageParam) searchParams.set("cursor", String(pageParam));
      return apiClient.get<MailListResponse>(`/mail/messages?${searchParams.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useMailThread(accountId: number | undefined, threadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mail.thread(accountId ?? 0, threadId ?? ""),
    queryFn: () =>
      apiClient.get<MailMessageDetail[]>(
        `/mail/threads/${threadId}?accountId=${accountId}`,
      ),
    enabled: accountId !== undefined && threadId !== undefined && threadId !== "",
    staleTime: 2 * 60_000,
  });
}

export function useMailMessage(accountId: number | undefined, messageId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mail.message(accountId ?? 0, messageId ?? ""),
    queryFn: () =>
      apiClient.get<MailMessageDetail>(
        `/mail/messages/${messageId}?accountId=${accountId}`,
      ),
    enabled: accountId !== undefined && messageId !== undefined && messageId !== "",
    staleTime: 2 * 60_000,
  });
}

export function useSendMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["mail", "send"],
    mutationFn: (body: SendMailBody) =>
      apiClient.post<{ messageId: string }>("/mail/send", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.mail.all });
    },
  });
}

export function useReplyMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["mail", "reply"],
    mutationFn: (body: ReplyMailBody) =>
      apiClient.post<{ messageId: string }>("/mail/reply", body),
    onSuccess: () => {
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
  return useMutation({
    mutationKey: ["mail", "ai", "inbox-summary"],
    mutationFn: (params: { accountId?: number | "all" }) =>
      apiClient.post<MailInboxSummaryResult>("/mail/ai/inbox-summary", params),
  });
}

export function useMailThreadSummary() {
  return useMutation({
    mutationKey: ["mail", "ai", "thread-summary"],
    mutationFn: (params: { accountId: number; threadId: string }) =>
      apiClient.post<MailThreadSummaryResult>("/mail/ai/thread-summary", params),
  });
}

export function useMailAiDraft() {
  return useMutation({
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
  return useMutation({
    mutationKey: ["mail", "action"],
    mutationFn: ({ messageId, body }: { messageId: string; body: MailActionBody }) =>
      apiClient.post<{ success: boolean }>(`/mail/messages/${messageId}/actions`, body),
    onMutate: async ({ messageId, body }) => {
      const { action, accountId } = body;

      await qc.cancelQueries({ queryKey: queryKeys.mail.all });

      const snapshots: Array<{ key: readonly unknown[]; data: unknown }> = [];
      const cache = qc.getQueriesData<InfiniteData<MailListResponse>>({
        queryKey: queryKeys.mail.messages(),
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

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      for (const { key, data } of context.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.mail.all });
    },
  });
}
