"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Skeleton } from "@/components/ui/skeleton";

export type MailThreadBriefState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: string; actionItems: string[] };

interface MailThreadBriefSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: MailThreadBriefState;
}

const BRIEF_DESCRIPTION = "Key points and next steps from this thread.";

function BriefBody({ state }: { state: MailThreadBriefState }) {
  return (
    <div className="min-w-0">
      {state.status === "loading" ? (
        <div className="space-y-2" aria-label="Loading thread brief">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="mt-4 h-3.5 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div
          role="alert"
          className="flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <div className="space-y-4" data-testid="mail-thread-brief">
          <section aria-labelledby="thread-brief-summary">
            <h3
              id="thread-brief-summary"
              className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Summary
            </h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">
              {state.summary}
            </p>
          </section>

          {state.actionItems.length > 0 ? (
            <section
              aria-labelledby="thread-brief-actions"
              className="border-t border-border pt-3"
            >
              <h3
                id="thread-brief-actions"
                className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Next actions
              </h3>
              <ul className="divide-y divide-border/60">
                {state.actionItems.map((item, index) => (
                  <li
                    key={`${index}-${item}`}
                    className="flex items-start gap-2 py-2 text-sm leading-5 first:pt-1.5 last:pb-0"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MailThreadBriefSheet({
  open,
  onOpenChange,
  state,
}: MailThreadBriefSheetProps) {
  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Thread brief"
      description={BRIEF_DESCRIPTION}
      className="sm:max-w-md"
    >
      <BriefBody state={state} />
    </AppSheet>
  );
}
