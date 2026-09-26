"use client";

import { Skeleton } from "@/components/ui/skeleton";
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
      className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-3"
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
            <div className="flex flex-col gap-2 p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-foreground">{signal.title}</p>
                {signal.confidence !== null && signal.confidence !== undefined && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                    {signal.confidence}% confidence
                  </span>
                )}
              </div>
              <span className="w-fit rounded bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                {SIGNAL_TYPE_LABELS[signal.type] ?? signal.type}
              </span>
              {signal.evidence && (
                <p className="text-xs text-muted-foreground line-clamp-3">{signal.evidence}</p>
              )}
              {signal.proposedChange && (
                <p className="text-xs text-foreground/80 line-clamp-2">{signal.proposedChange}</p>
              )}
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
