"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useOrgRisks } from "@/hooks/api/build/governance";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import type { Risk } from "@/types/projects";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_SECTION,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

const IMPACT_TONE: Record<string, string> = {
  high: "text-status-danger-ink-strong",
  medium: "text-status-warning-ink-strong",
  low: "text-status-success-ink-strong",
};

function RiskRow({ risk }: { risk: Risk }) {
  return (
    <Link
      href={`/build/${risk.projectId}/risks`}
      className="flex min-w-0 items-center gap-2 border-b border-border/40 px-3 py-2 last:border-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
    >
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{risk.title}</span>
      <span className={`shrink-0 text-micro font-medium ${IMPACT_TONE[risk.impact] ?? ""}`}>
        {risk.impact}
      </span>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-micro font-normal text-muted-foreground">
        {risk.status}
      </span>
    </Link>
  );
}

export function RisksPanel() {
  const canState = useCanState("build:risks:view");
  const { data, isLoading, isError, error } = useOrgRisks({ status: "open" });

  if (canState === "denied") return null;

  const items = data?.data ?? [];
  const isLoadingState = canState === "loading" || isLoading;

  return (
    <PmSection
      index={5}
      className={COMMAND_CENTER_PANEL_SECTION}
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader title="Open risks" />
        <div className={COMMAND_CENTER_PANEL_BODY_SCROLL}>
          {isLoadingState ? (
            <div className="flex flex-col gap-1 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center p-4">
              <ErrorState
                description={getErrorMessage(error)}
                compact
              />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <EmptyState
                title="No open risks"
                description="All risks are resolved or no risks have been logged"
                compact
              />
            </div>
          ) : (
            <div className="overflow-y-auto">
              {items.slice(0, 8).map((risk) => (
                <RiskRow key={risk.id} risk={risk} />
              ))}
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
