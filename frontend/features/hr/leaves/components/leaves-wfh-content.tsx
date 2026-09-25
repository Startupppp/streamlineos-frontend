"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useHrPendingWfhRequests,
  useHrLeaveContext,
  useHrLeaveApprovals,
  useHrMyLeaveRequestsInfinite,
  useHrLeavesThisWeek,
} from "@/hooks/api/hr";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCheckIcon, HouseIcon, PlusIcon, DownloadIcon } from "@animateicons/react/lucide";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadBlob } from "@/lib/download-blob";
import { ErrorState } from "@/components/shared";
import {
  buildLeaveExportBlob,
  leaveExportToastMessage,
  leaveExportViewFor,
} from "@/features/hr/leaves/leave-export";
import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import { WfhRequestSheet } from "@/features/hr/leaves/wfh-request-sheet";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";
import { LeavesSummaryStrip, buildAvailableHint } from "./leaves-summary-strip";
import { LeavesThisWeekCard } from "./leaves-this-week-card";
import type {
  LeaveBalance,
  LeaveType,
  LeaveRequest,
  ApprovedLeave,
} from "./leaves-shared";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;

interface LeavesWfhContentProps {
  selfService?: boolean;
}

export function LeavesWfhContent({ selfService = false }: LeavesWfhContentProps) {
  const { data: session } = useSession();
  const hrModuleEnabled = useModuleEnabled("hr");
  const canManageHr = useCan("hr:employees:manage");
  const isAdmin = !selfService && canManageHr && hrModuleEnabled;

  const [activeTab, setActiveTab] = useState("my-leaves");
  const [wfhStatusFilter, setWfhStatusFilter] = useState("ALL");

  const {
    data: contextData,
    isLoading: contextLoading,
    isError: contextError,
    error: contextErrorValue,
    refetch: refetchContext,
  } = useHrLeaveContext();
  const {
    data: myPages,
    isLoading: myLoading,
    isError: myError,
    error: myErrorValue,
    refetch: refetchMy,
    hasNextPage: hasMoreMyRequests,
    isFetchingNextPage: isLoadingMoreMyRequests,
    fetchNextPage: fetchMoreMyRequests,
  } = useHrMyLeaveRequestsInfinite();
  const {
    data: approvalPages,
    isLoading: approvalsLoading,
    isError: approvalsError,
    error: approvalsErrorValue,
    refetch: refetchApprovals,
  } = useHrLeaveApprovals({
    enabled: isAdmin,
  });
  const { data: thisWeekData } = useHrLeavesThisWeek({
    enabled: !selfService,
  });
  const { data: pendingWfhRequests } = useHrPendingWfhRequests({
    enabled: isAdmin,
  });

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
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);
  const handleReviewRequests = useCallback(() => setActiveTab("approvals"), []);

  const balances = (contextData?.balances ?? []) as LeaveBalance[];
  const leaveTypes = (contextData?.types ?? []) as LeaveType[];
  const joiningDate = contextData?.joiningDate ?? null;

  const myLeaveRequests = (myPages?.pages.flatMap((page) => page.data) ??
    []) as LeaveRequest[];
  const allIncomingLeaveRequests = (approvalPages?.pages.flatMap(
    (page) => page.data,
  ) ?? []) as LeaveRequest[];
  const incomingLeaveRequests = allIncomingLeaveRequests.filter(
    (r) => r.status === "PENDING",
  );
  const approvedLeavesThisWeek = (thisWeekData ?? []) as ApprovedLeave[];

  const totalPendingApprovals =
    incomingLeaveRequests.length + (pendingWfhRequests?.length || 0);

  const totalAvailable = balances.reduce(
    (sum, b) => Math.round((sum + Number(b.balance ?? 0)) * 10) / 10,
    0,
  );
  const availableHint = buildAvailableHint(balances, joiningDate);
  const pendingCount = myLeaveRequests.filter(
    (r) => r.status === "PENDING",
  ).length;
  const approvedCount = myLeaveRequests.filter(
    (r) => r.status === "APPROVED",
  ).length;

  // HRMS-E2E-022. The export follows the eye: the view is derived from the
  // active tab, so an admin on Approvals exports the team rows in front of them
  // rather than their own list. Two silences are gone with it — the button that
  // was not rendered on the tab holding the requests, and the refusal to write
  // a workbook for an empty list. An empty result is a result: it gets the
  // header row, which states what the export would have contained.
  const exportView = leaveExportViewFor(
    activeTab,
    myLeaveRequests,
    allIncomingLeaveRequests,
  );
  const canExportLeaves =
    activeTab === "my-leaves" || (isAdmin && activeTab === "approvals");

  async function handleExportExcel() {
    // Every path out of here is a file plus a toast, or a toast. Nothing
    // returns quietly, and nothing is swallowed.
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
  }

  const title = selfService ? "Time Off" : "Leaves & Time Off";
  const subtitle = selfService
    ? "Request leave and work from home."
    : "Manage leave requests, work from home, and approvals.";

  if (contextLoading || myLoading) {
    return (
      <PageWrapper
        title={title}
        subtitle={subtitle}
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <StatCardGridSkeleton cols={3} count={3} />
          <Skeleton className="min-h-0 w-full flex-1 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (contextError || myError) {
    const handleRetry = () => {
      void refetchContext();
      void refetchMy();
    };
    return (
      <PageWrapper
        title={title}
        subtitle={subtitle}
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
      >
        <ErrorState
          description={getErrorMessage(contextErrorValue ?? myErrorValue)}
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <PageWrapper
          title={title}
          subtitle={subtitle}
          noInternalScroll
          contentClassName="flex min-h-0 flex-1 flex-col"
          filtersClassName="flex-col items-stretch gap-3 overflow-visible pb-3 [&>*]:w-full"
          filters={
            <>
              <LeavesSummaryStrip
                totalAvailable={totalAvailable}
                availableHint={availableHint}
                pendingCount={pendingCount}
                approvedCount={approvedCount}
              />

              <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
                <TabsList className="w-full shrink-0 md:w-auto">
                  <TabsTrigger value="my-leaves" className="gap-1.5 truncate">
                    My leaves
                    {myLeaveRequests.length > 0 ? (
                      <span className="tabular-nums text-xs opacity-70">
                        {myLeaveRequests.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="wfh" className="gap-1.5 truncate">
                    Work from home
                  </TabsTrigger>
                  {isAdmin ? (
                    <TabsTrigger value="approvals" className="gap-1.5 truncate">
                      Approvals
                      {totalPendingApprovals > 0 ? (
                        <span className="tabular-nums text-xs opacity-70">
                          {totalPendingApprovals}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  ) : null}
                </TabsList>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {canExportLeaves ? (
                    <AnimatedIconButton
                      icon={DownloadIcon}
                      iconSize={14}
                      iconClassName="mr-1.5"
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      className="h-8 gap-1.5"
                      aria-label={`Export ${exportView.noun}s to Excel`}
                    >
                      Export
                    </AnimatedIconButton>
                  ) : null}
                  {activeTab === "wfh" ? (
                    <Select value={wfhStatusFilter} onValueChange={setWfhStatusFilter}>
                      <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-[130px]`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        <SelectItem value="ALL">All statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              </div>
            </>
          }
          actions={
            <>
              <AnimatedIconButton
                icon={HouseIcon}
                iconSize={14}
                iconClassName="mr-1.5"
                variant="outline"
                size="sm"
                onClick={handleOpenWfhSheet}
                className="h-8 gap-1.5"
              >
                Request WFH
              </AnimatedIconButton>
              <AnimatedIconButton
                icon={PlusIcon}
                iconSize={14}
                iconClassName="mr-1.5"
                variant={isAdmin ? "outline" : "default"}
                size="sm"
                onClick={handleOpenLeaveSheet}
                className="h-8 gap-1.5"
              >
                Request leave
              </AnimatedIconButton>
              {isAdmin ? (
                <AnimatedIconButton
                  icon={CheckCheckIcon}
                  iconSize={14}
                  iconClassName="mr-1.5"
                  size="sm"
                  onClick={handleReviewRequests}
                  className="h-8 gap-1.5"
                >
                  Review requests
                </AnimatedIconButton>
              ) : null}
            </>
          }
        >
          <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden">
            {!selfService && (
              <LeavesThisWeekCard leaves={approvedLeavesThisWeek} />
            )}

            <TabsContent value="my-leaves" className={TAB_PANEL_CLASS}>
              <LeavesTabContent
                balances={balances}
                myLeaveRequests={myLeaveRequests}
                approvedLeavesThisWeek={selfService ? [] : approvedLeavesThisWeek}
                compact={selfService}
                onRequestLeave={handleOpenLeaveSheet}
                hasMore={hasMoreMyRequests}
                isLoadingMore={isLoadingMoreMyRequests}
                onLoadMore={() => void fetchMoreMyRequests()}
              />
            </TabsContent>

            <TabsContent value="wfh" className={TAB_PANEL_CLASS}>
              <WfhTabContent
                compact={selfService}
                statusFilter={wfhStatusFilter}
                onRequestWfh={handleOpenWfhSheet}
              />
            </TabsContent>

            {isAdmin ? (
              <TabsContent value="approvals" className={TAB_PANEL_CLASS}>
                {approvalsError ? (
                  <ErrorState
                    description={getErrorMessage(approvalsErrorValue)}
                    onRetry={refetchApprovals}
                    className="flex-1"
                  />
                ) : (
                  <LeaveApprovalsContent
                    incomingLeaveRequests={incomingLeaveRequests}
                    allIncomingLeaveRequests={allIncomingLeaveRequests}
                    currentUserId={session?.user?.id}
                    isLoading={approvalsLoading}
                  />
                )}
              </TabsContent>
            ) : null}
          </div>
        </PageWrapper>
      </Tabs>

      <LeaveRequestSheet
        open={leaveSheetOpen}
        onOpenChange={setLeaveSheetOpen}
        leaveTypes={leaveTypes}
        approvalRoute={contextData?.approvalRoute}
        joiningDate={joiningDate}
        balances={balances}
      />
      <WfhRequestSheet
        open={wfhSheetOpen}
        onOpenChange={setWfhSheetOpen}
      />
    </div>
  );
}
