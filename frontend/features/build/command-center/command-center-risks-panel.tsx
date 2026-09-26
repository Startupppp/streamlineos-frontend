"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useOrgRisks } from "@/hooks/api/build/governance";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

const IMPACT_TONE: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-green-600 dark:text-green-400",
};

function RiskRow({ title, impact, status }: { title: string; impact: string; status: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border/40 px-3 py-2 last:border-0">
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{title}</span>
      <span className={`shrink-0 text-micro font-medium ${IMPACT_TONE[impact] ?? ""}`}>
        {impact}
      </span>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
        {status}
      </span>
    </div>
  );
}

export function RisksPanel() {
  const canState = useCanState("build:risks:view");
  const { data, isLoading, isError, error } = useOrgRisks({ status: "open" });

  if (canState === "denied") return null;

  const items = data?.data ?? [];
  const hasMore = data?.hasMore ?? false;
  const isLoadingState = canState === "loading" || isLoading;

  return (
    <PmSection
      index={5}
      className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-3"
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader
          title="Open risks"
          actions={
            (items.length > 0 || hasMore) ? (
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-micro" asChild>
                <Link href="/build/risks">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            ) : undefined
          }
        />
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
                <RiskRow key={risk.id} title={risk.title} impact={risk.impact} status={risk.status} />
              ))}
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
