"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiUsageChip } from "@/components/ai/ai-usage-chip";
import type { MailInboxSummaryState } from "./use-mail-inbox-summary";

interface MailDailyBriefProps {
  state: MailInboxSummaryState;
  canAi: boolean;
  onGenerate: () => void;
  onDetails: () => void;
}

/** Compact brief control designed to live inside the page header action row. */
export function MailDailyBrief({
  state,
  canAi,
  onGenerate,
  onDetails,
}: MailDailyBriefProps) {
  const isReady = state.status === "ready";

  if (!canAi) return null;

  return (
    <div aria-label="Daily mail brief" className="flex min-w-0 items-center gap-2">
      {isReady ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 min-w-0 gap-2 px-2.5"
          onClick={onDetails}
          aria-label="View daily mail brief"
        >
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="hidden max-w-56 truncate text-left text-sm font-medium xl:block">
            {state.summary}
          </span>
          <span className="hidden text-sm font-medium md:inline xl:hidden">Daily brief</span>
          {state.actionItems.length > 0 ? (
            <span className="hidden rounded-md bg-primary/10 px-1.5 py-0.5 text-micro font-semibold tabular-nums text-primary sm:inline-flex">
              {state.actionItems.length}
              <span className="sr-only"> action items</span>
            </span>
          ) : null}
          {state.aiUsage ? <span className="hidden xl:inline-flex"><AiUsageChip usage={state.aiUsage} /></span> : null}
        </Button>
      ) : (
        <LoadingButton
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-2 px-2.5"
          isPending={state.status === "loading"}
          onClick={onGenerate}
          loadingText="Reading inbox…"
        >
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <span className="hidden lg:inline">Daily brief</span>
        </LoadingButton>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {state.status === "loading" ? "Generating daily mail brief" : null}
        {state.status === "error" ? state.message : null}
        {state.status === "quota" ? "AI credits are unavailable" : null}
        {state.status === "denied" ? state.reason : null}
      </span>
    </div>
  );
}
