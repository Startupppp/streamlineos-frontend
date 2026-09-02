import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MailMessageDetail, MailMessageSummary } from "@/types/mail";

const SEEDED_UPDATED_AT = 0;

export function mailSummaryToDetail(
  summary: MailMessageSummary,
): MailMessageDetail {
  return {
    ...summary,
    cc: [],
    bodyHtml: null,
    bodyText: null,
    attachments: [],
  };
}

export function seedMailDetailFromSummary(
  queryClient: QueryClient,
  summary: MailMessageSummary,
): void {
  const seeded = mailSummaryToDetail(summary);

  if (summary.threadId) {
    const threadKey = queryKeys.mail.thread(summary.accountId, summary.threadId);
    if (queryClient.getQueryData(threadKey) !== undefined) return;
    queryClient.setQueryData<MailMessageDetail[]>(threadKey, [seeded], {
      updatedAt: SEEDED_UPDATED_AT,
    });
    return;
  }

  const messageKey = queryKeys.mail.message(summary.accountId, summary.id);
  if (queryClient.getQueryData(messageKey) !== undefined) return;
  queryClient.setQueryData<MailMessageDetail>(messageKey, seeded, {
    updatedAt: SEEDED_UPDATED_AT,
  });
}
