"use client";

import { useCallback } from "react";
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

interface ProjectAiMenuProps {
  projectId: number;
}

function formatSummary(data: ProjectSummaryResult): AiActionResult {
  const lines: string[] = [data.summary];
  if (data.highlights.length > 0) {
    lines.push("", "Highlights:");
    for (const h of data.highlights) lines.push(`• ${h}`);
  }
  if (data.atRisk) lines.push("", "⚠ Project is currently at risk.");
  return { text: lines.join("\n") };
}

export function ProjectAiMenu({ projectId }: ProjectAiMenuProps) {
  const canUseAI = useCan("build:ai:use");
  const summaryMutation = useProjectAiSummary(projectId);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const summary = useAiPopoverAction({
    run: useCallback(
      async (signal?: AbortSignal): Promise<AiActionResult> =>
        formatSummary(await summaryMutation.mutateAsync({ signal })),
      [summaryMutation],
    ),
  });

  const handleSummarizeClick = useCallback(() => {
    if (summary.isPending) return;
    void summary.execute();
  }, [summary]);

  if (!canUseAI) return null;

  return (
    <>
      <LoadingButton
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSummarizeClick}
        isPending={summary.isPending}
        loadingText="Summarizing…"
        className="h-8 gap-1.5 text-xs"
        {...hoverHandlers}
      >
        <SparklesIcon ref={iconRef} className="h-3.5 w-3.5 text-primary" />
        Summarize
      </LoadingButton>

      <Sheet open={summary.open} onOpenChange={summary.handleOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="text-base font-semibold">Health summary</SheetTitle>
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
