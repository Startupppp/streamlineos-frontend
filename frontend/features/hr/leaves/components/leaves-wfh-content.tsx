"use client";

import { useCallback, useState } from "react";
import type { SelfServiceHubChrome } from "@/lib/self-service-hub-chrome";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useUrlTab } from "@/hooks/api/hr/use-url-tab";
import {
  Tabs,
  TabsContent,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadBlob } from "@/lib/download-blob";
import { ErrorState } from "@/components/shared/error-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  buildLeaveExportBlob,
  leaveExportToastMessage,
  leaveExportViewFor,
} from "@/features/hr/leaves/leave-export";
import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import { WfhRequestSheet } from "@/features/hr/leaves/wfh-request-sheet";
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";
import { LeavesThisWeekCard } from "./leaves-this-week-card";
import { LeavesNoPolicyEmptyState } from "./leaves-no-policy-empty-state";
import { TeamAvailabilityOverlay } from "./team-availability-overlay";
import {
  LeavesWfhActions,
  LeavesWfhTabActions,
  LeavesWfhToolbar,
} from "./leaves-wfh-toolbar";
import { LeavesSummaryStrip } from "./leaves-summary-strip";
import { useLeavesWfhData } from "./use-leaves-wfh-data";
import { useT } from "@/lib/i18n/i18n";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;
const LEAVE_TABS = ["my-leaves", "wfh", "approvals"] as const;

interface LeavesWfhContentProps {
  selfService?: boolean;
  hubChrome?: SelfServiceHubChrome;
}

export function LeavesWfhContent({
  selfService = false,
  hubChrome,
}: LeavesWfhContentProps) {
  const t = useT();
  const { data: session } = useSession();
  const data = useLeavesWfhData(selfService);
  const myLeavesState = usePageState({
    permission: "self:leaves",
    isLoading: data.isLoading,
    isError: data.myRequestsError,
    error: data.myRequestsErrorValue,
  });
  const { activeTab, onTabChange } = useUrlTab(LEAVE_TABS, "my-leaves");
  const [wfhStatusFilter, setWfhStatusFilter] = useState("ALL");

  const {
    open: leaveSheetOpen,
    onOpenChange: setLeaveSheetOpen,
    setOpen: openLeaveSheet,
  } = useQueryParamOpen("create");
  const {
    open: wfhSheetOpen,
    onOpenChange: setWfhSheetOpen,
    setOpen: openWfhSheet,
  } = useQueryParamOpen("wfh");

  const handleOpenLeaveSheet = useCallback(
    () => openLeaveSheet(),
    [openLeaveSheet],
  );
  const handleOpenWfhSheet = useCallback(() => openWfhSheet(), [openWfhSheet]);

  const exportView = leaveExportViewFor(
    activeTab,
    data.myLeaveRequests,
    data.allIncomingLeaveRequests,
  );
  const canExportLeaves =
    activeTab === "my-leaves" || (data.isAdmin && activeTab === "approvals");

  const handleExportExcel = useCallback(async () => {
    try {
      const blob = await buildLeaveExportBlob(exportView);
      downloadBlob(
        blob,
        `${exportView.filePrefix}-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      toast.success(leaveExportToastMessage(exportView));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [exportView]);

  const title = selfService ? t("timeOff.title") : "Leaves & Time Off";
  const subtitle = selfService
    ? t("timeOff.subtitle")
    : "Manage leave requests, work from home, and approvals.";

  const requestSheets = (
    <>
      <LeaveRequestSheet
        open={leaveSheetOpen}
        onOpenChange={setLeaveSheetOpen}
        leaveTypes={data.leaveTypes}
        approvalRoute={data.approvalRoute}
        joiningDate={data.joiningDate}
        balances={data.balances}
        existingRequests={data.myLeaveRequests}
      />
      <WfhRequestSheet open={wfhSheetOpen} onOpenChange={setWfhSheetOpen} />
    </>
  );
  const headerActions = (
    <LeavesWfhActions
      compact={selfService && !hubChrome}
      canRequestLeave={
        data.canRequestLeave && (!hubChrome || activeTab === "my-leaves")
      }
      canRequestWfh={data.canRequestWfh && (!hubChrome || activeTab === "wfh")}
      onRequestLeave={handleOpenLeaveSheet}
      onRequestWfh={handleOpenWfhSheet}
    />
  );

  if (data.isLoading) {
    return (
      <PageWrapper
        title={hubChrome?.title ?? title}
        subtitle={hubChrome?.subtitle ?? subtitle}
        filters={hubChrome?.tabs}
        noInternalScroll
        actionsInline={selfService}
        contentClassName="flex min-h-0 flex-1 flex-col"
        actions={headerActions}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <StatCardGridSkeleton cols={3} count={3} />
          <div className={PAGE_BODY_SKELETON_CLASS}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
        {requestSheets}
      </PageWrapper>
    );
  }

  if (data.isError) {
    return (
      <PageWrapper
        title={hubChrome?.title ?? title}
        subtitle={hubChrome?.subtitle ?? subtitle}
        filters={hubChrome?.tabs}
        noInternalScroll
        actionsInline={selfService}
        contentClassName="flex min-h-0 flex-1 flex-col"
        actions={headerActions}
      >
        <ErrorState
          title={selfService ? t("timeOff.loadError") : undefined}
          description={getErrorMessage(data.errorValue)}
          error={data.errorValue}
          onRetry={data.onRetryPage}
          className="flex-1"
        />
        {requestSheets}
      </PageWrapper>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <PageWrapper
          title={hubChrome?.title ?? title}
          subtitle={hubChrome?.subtitle ?? subtitle}
          noInternalScroll
          actionsInline={selfService}
          contentClassName="flex min-h-0 flex-1 flex-col"
          filtersClassName="flex-col items-stretch gap-3 overflow-visible pb-3"
          filters={
            hubChrome ? (
              <>
                <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
                  <div className="min-w-0">{hubChrome.tabs}</div>
                  <LeavesWfhTabActions
                    activeTab={activeTab}
                    wfhStatusFilter={wfhStatusFilter}
                    onWfhStatusFilterChange={setWfhStatusFilter}
                    canExport={canExportLeaves}
                    exportNoun={exportView.noun}
                    onExport={handleExportExcel}
                  />
                </div>
                {activeTab === "my-leaves" ? (
                  <LeavesSummaryStrip
                    totalAvailable={data.totalAvailable}
                    availableHint={data.availableHint}
                    pendingCount={data.pendingCount}
                    approvedDays={data.approvedDays}
                  />
                ) : null}
              </>
            ) : (
              <LeavesWfhToolbar
                showTabs
                showSummary
                isAdmin={data.isAdmin}
                totalAvailable={data.totalAvailable}
                availableHint={data.availableHint}
                pendingCount={data.pendingCount}
                approvedDays={data.approvedDays}
                myLeaveCount={data.myLeaveRequests.length}
                totalPendingApprovals={data.totalPendingApprovals}
                activeTab={activeTab}
                wfhStatusFilter={wfhStatusFilter}
                onWfhStatusFilterChange={setWfhStatusFilter}
                canExport={canExportLeaves}
                exportNoun={exportView.noun}
                onExport={handleExportExcel}
              />
            )
          }
          actions={headerActions}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden">
            {!selfService ? (
              <LeavesThisWeekCard leaves={data.approvedLeavesThisWeek} />
            ) : null}

            <TabsContent value="my-leaves" className={TAB_PANEL_CLASS}>
              <PageState resolution={myLeavesState} loading={null}>
                {data.noPolicyConfigured ? (
                  <LeavesNoPolicyEmptyState />
                ) : (
                  <LeavesTabContent
                    balances={data.balances}
                    myLeaveRequests={data.myLeaveRequests}
                    approvedLeavesThisWeek={
                      selfService ? [] : data.approvedLeavesThisWeek
                    }
                    compact={selfService}
                    onRequestLeave={
                      data.canRequestLeave ? handleOpenLeaveSheet : undefined
                    }
                    hasMore={data.hasMoreMyRequests}
                    isLoadingMore={data.isLoadingMoreMyRequests}
                    onLoadMore={data.onLoadMoreMyRequests}
                  />
                )}
              </PageState>
            </TabsContent>

            <TabsContent value="wfh" className={TAB_PANEL_CLASS}>
              <WfhTabContent
                compact={selfService}
                statusFilter={wfhStatusFilter}
                onRequestWfh={
                  data.canRequestWfh ? handleOpenWfhSheet : undefined
                }
              />
            </TabsContent>

            {data.isAdmin ? (
              <TabsContent value="approvals" className={TAB_PANEL_CLASS}>
                <div className="space-y-4">
                  <TeamAvailabilityOverlay />
                  <LeaveApprovalsContent
                    incomingLeaveRequests={data.incomingLeaveRequests}
                    allIncomingLeaveRequests={data.allIncomingLeaveRequests}
                    currentUserId={session?.user?.id}
                    isLoading={data.approvalsLoading}
                    isError={data.approvalsError}
                    error={data.approvalsErrorValue}
                    onRetry={data.refetchApprovals}
                  />
                </div>
              </TabsContent>
            ) : null}
          </div>
        </PageWrapper>
      </Tabs>

      {requestSheets}
    </div>
  );
}
