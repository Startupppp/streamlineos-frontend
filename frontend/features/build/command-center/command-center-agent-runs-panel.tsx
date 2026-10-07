"use client";

import { Bot, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useAgentPulse } from "@/hooks/api/build/agent-pulse";
import { ORGANIZATION_BUILD_SCOPE } from "@/lib/build/build-scope";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_SECTION,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  delivery_risk: "Delivery risk",
  comment_draft: "Draft comment",
  overdue_approval: "Overdue approval",
  blocked_milestone: "Blocked milestone",
  dependency_change: "Dependency change",
};

export function AgentRunsPanel() {
  const canState = useCanState("build:approvals:view");
  const { data: signal, isLoading, isError, error } = useAgentPulse(ORGANIZATION_BUILD_SCOPE);

  if (canState === "denied") return null;

  const isLoadingState = canState === "loading" || isLoading;

  return (
    <PmSection
      index={4}
      className={COMMAND_CENTER_PANEL_SECTION}
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader title="Agent signal" />
        <div className={COMMAND_CENTER_PANEL_BODY_SCROLL}>
          {isLoadingState ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center p-4">
              <ErrorState
                description={getErrorMessage(error)}
                compact
              />
            </div>
          ) : signal === null || signal === undefined ? (
            <div className="flex h-full items-center justify-center p-4">
              <EmptyState
                title="No active signals"
                description="The AI agent has nothing to report right now"
                compact
              />
            </div>
          ) : (
            <div className="p-3">
              <article className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs">
                <div className="flex min-w-0 items-center gap-2.5 border-b border-border/70 bg-muted/40 px-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background shadow-xs">
                    <Bot className="size-4 text-foreground" aria-hidden="true" />
                  </span>
                  <p className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{signal.title}</p>
                </div>
                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {SIGNAL_TYPE_LABELS[signal.type] ?? signal.type}
                    </Badge>
                    {signal.confidence !== null && signal.confidence !== undefined ? (
                      <Badge variant="outline" className="bg-background font-medium tabular-nums text-muted-foreground">
                        {signal.confidence}% confidence
                      </Badge>
                    ) : null}
                  </div>
                  {signal.evidence ? (
                    <div className="space-y-1">
                      <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Why it matters</p>
                      <p className="line-clamp-3 text-xs leading-relaxed text-foreground/80">{signal.evidence}</p>
                    </div>
                  ) : null}
                  {signal.proposedChange ? (
                    <div className="rounded-md border border-status-info-rule bg-status-info-surface p-2.5">
                      <p className="mb-1 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-status-info-ink-strong">
                        <Sparkles className="size-3" aria-hidden="true" />
                        Recommended next step
                      </p>
                      <p className="line-clamp-2 text-xs leading-relaxed text-status-info-ink">{signal.proposedChange}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
