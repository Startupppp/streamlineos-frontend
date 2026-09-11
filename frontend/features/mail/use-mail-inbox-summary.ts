"use client";

import { useCallback } from "react";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailInboxSummary } from "@/hooks/api/mail";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

export type MailInboxSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "quota" }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      summary: string;
      highlights: { subject: string; fromEmail: string; reason: string }[];
      actionItems: string[];
      aiUsage?: AiUsageMeta | null;
    };

interface UseMailInboxSummarySheetReturn {
  summaryState: MailInboxSummaryState;
  triggerSummary: (accountId: number | "all") => void;
}

export function useMailInboxSummarySheet(): UseMailInboxSummarySheetReturn {
  const inboxSummaryMutation = useMailInboxSummary();

  const triggerSummary = useCallback(
    async (accountId: number | "all") => {
      inboxSummaryMutation.reset();
      try {
        await inboxSummaryMutation.mutateAsync(
          accountId === "all" ? {} : { accountId },
        );
      } catch {
      }
    },
    [inboxSummaryMutation],
  );

  const handleTrigger = useCallback(
    (accountId: number | "all") => {
      void triggerSummary(accountId);
    },
    [triggerSummary],
  );

  const summaryState: MailInboxSummaryState = (() => {
    if (inboxSummaryMutation.isPending) return { status: "loading" };
    if (inboxSummaryMutation.isError) {
      const err = inboxSummaryMutation.error;
      if (isApiError(err) && err.status === 402) return { status: "quota" };
      if (isApiError(err) && err.status === 403)
        return { status: "denied", reason: getErrorMessage(err) };
      return { status: "error", message: getErrorMessage(err) };
    }
    if (inboxSummaryMutation.isSuccess && inboxSummaryMutation.data) {
      const d = inboxSummaryMutation.data;
      return {
        status: "ready",
        summary: d.summary,
        highlights: d.highlights,
        actionItems: d.actionItems,
        aiUsage: d.aiUsage,
      };
    }
    return { status: "idle" };
  })();

  return { summaryState, triggerSummary: handleTrigger };
}
