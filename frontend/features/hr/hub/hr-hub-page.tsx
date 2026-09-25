"use client";

import { useMemo } from "react";
import { AlertCircle, Banknote, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HrHero,
  HrPageContent,
  HrQuickAction,
} from "@/features/hr/shared/hr-ui";
import { cn } from "@/lib/utils";
import { useHrHubSnapshot } from "@/hooks/api/hr/hub";
import { EMPTY_HR_HUB_ACCESS } from "@/hooks/api/hr/hub-types";
import {
  HrStartHereChecklist,
  useHrSetupSignals,
} from "@/features/hr/setup";
import { HrHubQueues } from "./hr-hub-queues";
import { HrHubMetrics } from "./hr-hub-metrics";
import { HrHubRecruitment } from "./hr-hub-recruitment";
import { HrHubToday } from "./hr-hub-today";
import { HrHubActivity } from "./hr-hub-activity";

const ALL_QUICK_ACTIONS = [
  {
    actionKey: "run-payroll" as const,
    href: "/payroll/runs",
    icon: Banknote,
    label: "Run payroll",
    description: "Execute payroll cycle",
    tone: "emerald" as const,
    permKey: "canPayrollRunsCreate" as const,
  },
] as const;

export function HrHubPage() {
  const hub = useHrHubSnapshot();
  const setupSignals = useHrSetupSignals();
  const access = hub.data?.capabilities ?? EMPTY_HR_HUB_ACCESS;
  const handleRetry = () => {
    void hub.refetch();
  };

  const visibleActions = useMemo(
    () => ALL_QUICK_ACTIONS.filter((a) => access[a.permKey]),
    [access],
  );

  const hasAnyPanel = Object.values(access).some(Boolean);

  return (
    <PageWrapper
      title="HR overview"
      subtitle="People operations hub — manage your team, track time, and run the full employee lifecycle"
      variant="display"
      actions={
        access.canOnboarding || access.canWorkflowsApprove || access.canAnnouncements ? (
          <div className="flex flex-wrap items-center gap-2">
            {access.canAnnouncements ? (
              <Button size="sm" variant="outline" asChild>
                <Link href="/hr/announcements">Create announcement</Link>
              </Button>
            ) : null}
            {access.canWorkflowsApprove ? (
              <Button size="sm" variant="outline" asChild>
                <Link href="/hr/approvals">Review approvals</Link>
              </Button>
            ) : null}
            {access.canOnboarding ? (
              <Button size="sm" asChild>
                <Link href="/hr/onboarding">Onboard employee</Link>
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <HrPageContent>
          {visibleActions.length > 0 ? (
            <HrHero>
              <div
                className={cn(
                  "flex min-h-0 w-full gap-2.5 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-hide",
                  "[&>*]:min-w-[min(100%,15.5rem)] [&>*]:shrink-0",
                  "min-[420px]:grid min-[420px]:grid-cols-2 min-[420px]:overflow-visible min-[420px]:pb-0",
                  "min-[420px]:[&>*]:min-w-0 min-[420px]:[&>*]:shrink",
                  "xl:grid-cols-4",
                )}
              >
                {visibleActions.map((action) => (
                  <HrQuickAction
                    key={action.actionKey}
                    href={action.href}
                    icon={action.icon}
                    label={action.label}
                    description={action.description}
                    tone={action.tone}
                  />
                ))}
              </div>
            </HrHero>
          ) : null}

          <HrStartHereChecklist signals={setupSignals} />

          {hub.isError ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">The HR hub is temporarily unavailable.</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleRetry}
                className="h-auto shrink-0 gap-1 p-0 text-sm text-status-info-ink"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : null}

          {!hub.isLoading && !hub.isError && !hasAnyPanel ? (
            <EmptyState
              className="flex-1"
              illustrationPreset="team"
              title="No HR panels available to you"
              description="Your access doesn't include any of this hub's sections yet. Ask an administrator to grant the HR permissions you need."
            />
          ) : null}

          <HrHubQueues
            access={access}
            snapshot={hub.data}
            isLoading={hub.isLoading}
            onRetry={handleRetry}
          />
          <HrHubRecruitment
            access={access}
            snapshot={hub.data}
            isLoading={hub.isLoading}
            onRetry={handleRetry}
          />
          <HrHubToday
            access={access}
            snapshot={hub.data}
            isLoading={hub.isLoading}
            onRetry={handleRetry}
          />
          <HrHubActivity
            access={access}
            snapshot={hub.data}
            isLoading={hub.isLoading}
            onRetry={handleRetry}
          />
          <HrHubMetrics
            access={access}
            snapshot={hub.data}
            isLoading={hub.isLoading}
            onRetry={handleRetry}
          />
        </HrPageContent>
      </div>
    </PageWrapper>
  );
}
