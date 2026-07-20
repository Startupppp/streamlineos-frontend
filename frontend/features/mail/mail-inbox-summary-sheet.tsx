"use client";

import { useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiQuotaEmptyState } from "@/components/ai/ai-quota-empty-state";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailInboxSummary } from "@/hooks/api/mail";
import { AlertCircle } from "lucide-react";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

type SummaryState =
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

interface MailInboxSummarySheetProps {
  open: boolean;
  onClose: () => void;
  summaryState: SummaryState;
}

export function MailInboxSummarySheet({
  open,
  onClose,
  summaryState,
}: MailInboxSummarySheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-lg overflow-hidden">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle className="text-base font-semibold">Inbox summary</SheetTitle>
          <SheetDescription className="text-[13px] text-muted-foreground">
            AI-generated overview of your inbox. Review before acting.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {summaryState.status === "loading" && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full mt-4" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          )}

          {summaryState.status === "quota" && <AiQuotaEmptyState variant="fill" />}

          {summaryState.status === "denied" && (
            <AiPermissionDenied reason={summaryState.reason} />
          )}

          {summaryState.status === "error" && (
            <div className="flex flex-col items-start gap-3 py-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <p className="text-sm">{summaryState.message}</p>
              </div>
            </div>
          )}

          {summaryState.status === "ready" && (
            <AiDraftCard usage={summaryState.aiUsage}>
              <div className="flex flex-col gap-4">
                <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
                  {summaryState.summary}
                </p>

                {summaryState.highlights.length > 0 && (
                  <div>
                    <p className="text-[12px] font-semibold text-foreground mb-2">
                      Highlights
                    </p>
                    <ul className="flex flex-col gap-2">
                      {summaryState.highlights.map((h, i) => (
                        <li
                          key={i}
                          className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-muted/40 border border-border/40"
                        >
                          <span className="text-[12px] font-medium text-foreground line-clamp-1">
                            {h.subject}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {h.fromEmail}
                          </span>
                          <span className="text-[11px] text-foreground/80">{h.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summaryState.actionItems.length > 0 && (
                  <div>
                    <p className="text-[12px] font-semibold text-foreground mb-2">Action items</p>
                    <ul className="flex flex-col gap-1.5">
                      {summaryState.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AiDraftCard>
          )}

          {summaryState.status === "idle" && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading summary...</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface UseMailInboxSummarySheetReturn {
  summaryState: SummaryState;
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

  const summaryState: SummaryState = (() => {
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
