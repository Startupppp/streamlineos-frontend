"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { AiUsageChip } from "@/components/ai/ai-usage-chip";
import { AiQuotaEmptyState } from "@/components/ai/ai-quota-empty-state";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import type { MailInboxSummaryState } from "./use-mail-inbox-summary";

interface MailInboxSummarySheetProps {
  open: boolean;
  onClose: () => void;
  summaryState: MailInboxSummaryState;
}

export function MailInboxSummarySheet({
  open,
  onClose,
  summaryState,
}: MailInboxSummarySheetProps) {
  const visibleSender = (value: string) =>
    /^\[REDACTED(?:_EMAIL)?\]$/i.test(value.trim()) ? null : value;
  const isMobile = useIsMobile();
  const panel = (
    <>
        <div className="shrink-0 border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">What needs me</h2>
          <p className="text-label text-muted-foreground">
            AI triage of your inbox — highlights and action items. Review before acting; never auto-sends.
          </p>
        </div>

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
            <div className="flex flex-col gap-5" data-testid="mail-inbox-brief">
              <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground"><Sparkles className="size-4 text-primary" aria-hidden="true" />Inbox overview</span>
                  {summaryState.aiUsage ? <AiUsageChip usage={summaryState.aiUsage} /> : null}
                </div>
                <p className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                  {summaryState.summary}
                </p>
              </section>

                {summaryState.highlights.length > 0 && (
                  <section aria-labelledby="brief-highlights">
                    <p id="brief-highlights" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Highlights
                    </p>
                    <ul className="flex flex-col gap-2">
                      {summaryState.highlights.map((h, i) => (
                        <li
                          key={i}
                          className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm"
                        >
                          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-foreground">{i + 1}</span>
                          <span className="min-w-0 space-y-1">
                            <span className="block text-sm font-medium leading-5 text-foreground">{h.subject}</span>
                            {visibleSender(h.fromEmail) ? <span className="block truncate text-xs text-muted-foreground">{visibleSender(h.fromEmail)}</span> : null}
                            <span className="block text-xs leading-5 text-foreground/75">{h.reason}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {summaryState.actionItems.length > 0 && (
                  <section aria-labelledby="brief-actions" className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p id="brief-actions" className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next actions</p>
                    <ul className="flex flex-col gap-3">
                      {summaryState.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm leading-5 text-foreground">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
            </div>
          )}

          {summaryState.status === "idle" && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading summary...</p>
            </div>
          )}
        </div>
    </>
  );
  if (isMobile) return (
    <Drawer open={open} onOpenChange={(value) => { if (!value) onClose(); }} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[92dvh] gap-0 overflow-hidden p-0">
        <DrawerHeader className="sr-only"><DrawerTitle>What needs me</DrawerTitle><DrawerDescription>AI triage of your inbox</DrawerDescription></DrawerHeader>
        {panel}
      </DrawerContent>
    </Drawer>
  );
  return <Sheet open={open} onOpenChange={(value) => { if (!value) onClose(); }}><SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"><SheetHeader className="sr-only"><SheetTitle>What needs me</SheetTitle><SheetDescription>AI triage of your inbox</SheetDescription></SheetHeader>{panel}</SheetContent></Sheet>;
}
