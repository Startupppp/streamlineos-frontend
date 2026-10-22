"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
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
      <StatCardGridSkeleton cols={3} count={3} />
      <div className={PAGE_BODY_SKELETON_CLASS}>
        <Skeleton className="h-10 w-48 max-w-full rounded-lg" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
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
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        loading={<ManagerHomeSkeleton />}
        onRetry={handleRetry}
        className="flex min-h-0 flex-1 flex-col"
      >
        {data && !data.isManager ? (
          <EmptyState
            title="You are not a reporting manager"
            description="This page shows one manager's own reports. Ask HR if you should have a reporting line under you."
            action={{ label: "Go to Home", href: "/dashboard" }}
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : data && data.reports.length === 0 ? (
          <EmptyState
            title="No direct reports assigned"
            description="Ask HR to set your reporting line."
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : data ? (
          <RichPageContent>
            <StatCardGrid cols={3}>
              <StatCard
                label="On leave today"
                value={data.reports.filter((report) => report.onLeaveToday).length}
              />
              <StatCard
                label="Missing timesheets"
                value={data.missingTimesheets.length}
                tone={data.missingTimesheets.length > 0 ? "red" : "default"}
              />
              <StatCard
                label="Probation ending soon"
                value={data.probationDue.length}
                tone={data.probationDue.length > 0 ? "amber" : "default"}
              />
            </StatCardGrid>

            <PendingDecisionsStrip
              pendingTotal={pendingTotal}
              items={data.approvals.items}
              unsettledTimesheets={unsettledTotal}
            />

            <RichPanel padded={false} className="overflow-hidden">
              <div className="border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
                <RichSectionHeader
                  className="mb-0"
                  title="Direct reports"
                  description="Who is out today, whose timesheets are behind, and whose probation is ending"
                />
              </div>
              <div className="px-4 sm:px-5">
                <TeamRoster reports={data.reports} upcomingLeave={data.upcomingLeave} />
              </div>
            </RichPanel>

            <TeamCoveragePanels
              upcomingLeave={data.upcomingLeave}
              missingTimesheets={data.missingTimesheets}
              probationDue={data.probationDue}
            />
          </RichPageContent>
        ) : (
          <EmptyState
            title="No one reports to you yet"
            description="Your team shows up here once HR sets a reporting line under you."
            className={PAGE_BODY_EMPTY_CLASS}
          />
        )}
      </PageState>
    </PageWrapper>
  );
}
