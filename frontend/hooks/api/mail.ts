"use client";

import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const mailAccountListContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailAccountListContract),
);
const mailListResponseContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailListResponseContract),
);
const mailThreadContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailThreadContract),
);
const mailMessageContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailMessageContract),
);
const mailAiThreadSummaryContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailAiThreadSummaryContract),
);
const mailAiDraftContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailAiDraftContract),
);
const mailSendResultContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailSendResultContract),
);
const mailActionSuccessContract = lazyContract(() =>
  import("@/hooks/api/mail-schema").then((m) => m.mailActionSuccessContract),
);
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { useCan } from "@/hooks/api/access";
import type {
  MailAccount,
  MailListResponse,
  MailMessageDetail,
  MailMessagesParams,
  SendMailBody,
  ReplyMailBody,
  MailActionBody,
} from "@/types/mail";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";
import { applyMailActionToCaches, restoreMailCaches } from "@/hooks/api/mail-action-cache";

export function useMailAccounts() {
  const can = useCan("mail:inbox:view");
  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.mail.accounts(),
    queryFn: ({ signal }) => apiClient.get<MailAccount[]>("/mail/accounts", undefined, signal, mailAccountListContract),
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
    queryKey: directoryAndOwnershipQueryKeys.mail.messages(queryParams),
    queryFn: ({ pageParam , signal }) => {
      const searchParams = new URLSearchParams();
      if (params.folder) searchParams.set("folder", params.folder);
      if (params.accountId !== undefined) searchParams.set("accountId", String(params.accountId));
      if (params.q) searchParams.set("q", params.q);
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (pageParam !== undefined) searchParams.set("cursor", String(pageParam));
      return apiClient.get<MailListResponse>(`/mail/messages?${searchParams.toString()}`, undefined, signal, mailListResponseContract);
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
    queryKey: directoryAndOwnershipQueryKeys.mail.thread(accountId ?? 0, threadId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<MailMessageDetail[]>(
        `/mail/threads/${threadId}?accountId=${accountId}`, undefined, signal, mailThreadContract,
      ),
    enabled: can && accountId !== undefined && threadId !== undefined && threadId !== "",
    staleTime: 2 * 60_000,
  });
}

export function useMailMessage(accountId: number | undefined, messageId: string | undefined) {
  const can = useCan("mail:inbox:view");
  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.mail.message(accountId ?? 0, messageId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<MailMessageDetail>(
        `/mail/messages/${messageId}?accountId=${accountId}`, undefined, signal, mailMessageContract,
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
      apiClient.post<{ messageId: string }>("/mail/send", body, operation.configFor(body), mailSendResultContract),
    onSuccess: () => {
      operation.settle();
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all });
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all });
    },
  });
}

export function useReplyMail() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("mail:messages:send", {
    mutationKey: ["mail", "reply"],
    mutationFn: (body: ReplyMailBody) =>
      apiClient.post<{ messageId: string }>("/mail/reply", body, operation.configFor(body), mailSendResultContract),
    onSuccess: () => {
      operation.settle();
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all });
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all });
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
    mutationFn: ({ signal, ...params }: { accountId?: number | "all" } & AiAbortInput) =>
      apiClient.post<MailInboxSummaryResult>("/mail/ai/inbox-summary", params, { signal }),
  });
}

export function useMailThreadSummary() {
  return useAuthorizedMutation("mail:ai:use", {
    mutationKey: ["mail", "ai", "thread-summary"],
    mutationFn: ({ signal, ...params }: { accountId: number; threadId: string } & AiAbortInput) =>
      apiClient.post<MailThreadSummaryResult>("/mail/ai/thread-summary", params, { signal }, mailAiThreadSummaryContract),
  });
}

export function useMailAiDraft() {
  return useAuthorizedMutation("mail:ai:use", {
    mutationKey: ["mail", "ai", "draft"],
    mutationFn: ({
      signal,
      ...params
    }: {
      mode: "compose" | "reply";
      instruction: string;
      accountId?: number;
      threadId?: string;
    } & AiAbortInput) => apiClient.post<MailAiDraftResult>("/mail/ai/draft", params, { signal }, mailAiDraftContract),
  });
}

export function useMailAction() {
  const qc = useQueryClient();
  return useAuthorizedMutation("mail:messages:manage", {
    mutationKey: ["mail", "action"],
    mutationFn: ({ messageId, body }: { messageId: string; body: MailActionBody }) =>
      apiClient.post<{ success: boolean }>(`/mail/messages/${messageId}/actions`, body, undefined, mailActionSuccessContract),
    onMutate: ({ messageId, body }) => applyMailActionToCaches(qc, messageId, body),
    onError: (_, _variables, context) => {
      if (!context) return;
      restoreMailCaches(qc, context);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all });
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all });
    },
  });
}
