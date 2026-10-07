"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useCan } from "@/hooks/api/access";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AiActionResultBody, type AiActionResult } from "@/components/ai";
import { useAiPopoverAction } from "@/components/ai/use-ai-popover-action";
import { useProjectAiSummary } from "@/hooks/api/build/ai";
import type { ProjectSummaryResult } from "@/types/projects/ai";

/** Backend NO_DATA short-circuit copy from projects-ai.service. */
const NO_DATA_SUMMARY =
  "This project has no tickets yet. Add tasks to unlock AI features.";

export type ProjectAiRunRef = MutableRefObject<(() => void) | null>;

interface ProjectAiMenuProps {
  projectId: number;
  hideTrigger?: boolean;
  /**
   * Parent-owned ref. Assigned only in useLayoutEffect — never call execute
   * during registration, and never notify the parent via setState.
   */
  runRef?: ProjectAiRunRef;
}

function isEmptySummary(data: ProjectSummaryResult): boolean {
  return (
    data.evidence.totalTasks === 0 ||
    data.summary === NO_DATA_SUMMARY ||
    /no tickets yet/i.test(data.summary)
  );
}

function formatSummary(data: ProjectSummaryResult): AiActionResult {
  if (isEmptySummary(data)) {
    return {
      text: data.summary,
      empty: {
        title: "No issues to summarize",
        description:
          "This project has no tickets yet. Create an issue to generate a health summary.",
      },
    };
  }

  const lines: string[] = [data.summary];
  if (data.highlights.length > 0) {
    lines.push("", "Highlights:");
    for (const h of data.highlights) lines.push(`• ${h}`);
  }
  if (data.atRisk) lines.push("", "⚠ Project is currently at risk.");
  return { text: lines.join("\n") };
}

export function ProjectAiMenu({
  projectId,
  hideTrigger = false,
  runRef,
}: ProjectAiMenuProps) {
  const canUseAI = useCan("build:ai:use");
  const summaryMutation = useProjectAiSummary(projectId);
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const mutateAsync = summaryMutation.mutateAsync;

  const summary = useAiPopoverAction({
    run: useCallback(
      async (signal?: AbortSignal): Promise<AiActionResult> =>
        formatSummary(await mutateAsync({ signal })),
      [mutateAsync],
    ),
  });

  const executeRef = useRef(summary.execute);
  const isPendingRef = useRef(summary.isPending);

  const handleSummarizeClick = useCallback(() => {
    if (isPendingRef.current) return;
    void executeRef.current();
  }, []);

  useLayoutEffect(() => {
    executeRef.current = summary.execute;
    isPendingRef.current = summary.isPending;
    if (!runRef) return;
    runRef.current = handleSummarizeClick;
    return () => {
      runRef.current = null;
    };
  }, [runRef, handleSummarizeClick, summary.execute, summary.isPending]);

  if (!canUseAI) return null;

  return (
    <>
      {!hideTrigger ? (
        <LoadingButton
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSummarizeClick}
          isPending={summary.isPending}
          loadingText="Summarizing…"
          className="w-full gap-1.5 sm:w-auto"
          {...hoverHandlers}
        >
          <SparklesIcon ref={iconRef} className="h-3.5 w-3.5 text-primary" />
          Summarize
        </LoadingButton>
      ) : null}

      <Sheet open={summary.open} onOpenChange={summary.handleOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="text-base font-medium">Health summary</SheetTitle>
            <SheetDescription className="text-label text-muted-foreground">
              AI-generated draft grounded in this record. Review before you use it.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <AiActionResultBody
              state={summary.state}
              onRetry={summary.retry}
              onCancel={summary.cancel}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
