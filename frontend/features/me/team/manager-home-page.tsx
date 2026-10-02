"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { RichPageContent, RichPanel, RichSectionHeader } from "@/components/shared/rich-surface";
import { usePageState } from "@/hooks/api/use-page-state";
import { useManagerHome } from "@/hooks/api/hr/manager-home";
import { PendingDecisionsStrip } from "./pending-decisions-strip";
import { TeamCoveragePanels } from "./team-coverage-panels";
import { TeamRoster } from "./team-roster";

function ManagerHomeSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <StatCardGridSkeleton cols={3} count={3} />
    </div>
  );
}

export function ManagerHomePage() {
  const { data, isLoading, isError, error, refetch } = useManagerHome();
  const pageState = usePageState({ isLoading, isError, error });
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pendingTotal = data
    ? data.approvals.leave + data.approvals.wfh + data.approvals.timesheets + data.approvals.workflows
    : 0;
  const unsettledTotal = data ? data.reports.reduce((sum, report) => sum + report.unsettledTimesheets, 0) : 0;
  const hasRoster = !!data && data.isManager && data.reports.length > 0;

  return (
    <PageWrapper
      variant="display"
      title="My team"
      subtitle={
        hasRoster && data
          ? `${data.reports.length} direct ${data.reports.length === 1 ? "report" : "reports"}`
          : undefined
      }
    >
      <PageState resolution={pageState} loading={<ManagerHomeSkeleton />} onRetry={handleRetry} className="flex-1">
        {data && !data.isManager ? (
          <EmptyState
            title="You are not a reporting manager"
            description="This page shows one manager's own reports. Ask HR if you should have a reporting line under you."
            action={{ label: "Back to my day", href: "/me" }}
          />
        ) : data && data.reports.length === 0 ? (
          <EmptyState
            title="No direct reports assigned"
            description="Ask HR to set your reporting line."
          />
        ) : data ? (
          <RichPageContent>
            <PendingDecisionsStrip
              pendingTotal={pendingTotal}
              items={data.approvals.items}
              unsettledTimesheets={unsettledTotal}
            />

            <RichPanel>
              <RichSectionHeader
                title="Direct reports"
                description="Who is out today, whose timesheets are behind, and whose probation is ending"
              />
              <TeamRoster reports={data.reports} upcomingLeave={data.upcomingLeave} />
            </RichPanel>

            <StatCardGrid cols={3}>
              <StatCard label="On leave today" value={data.reports.filter((report) => report.onLeaveToday).length} />
              <StatCard
                label="Missing timesheets"
                value={data.missingTimesheets.length}
                tone={data.missingTimesheets.length > 0 ? "red" : "default"}
                href="/timesheets/overdue"
              />
              <StatCard
                label="Probation ending soon"
                value={data.probationDue.length}
                tone={data.probationDue.length > 0 ? "amber" : "default"}
                href="/hr/onboarding/probation"
              />
            </StatCardGrid>

            <TeamCoveragePanels
              upcomingLeave={data.upcomingLeave}
              missingTimesheets={data.missingTimesheets}
              probationDue={data.probationDue}
            />
          </RichPageContent>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
