"use client";

import React, { useCallback } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
  useHrPendingWfhRequests,
  useHrLeaveContext,
  useHrLeaveApprovals,
  useHrMyLeaveRequests,
  useHrLeavesThisWeek,
} from "@/hooks/api/hr";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, Clock3, BadgeCheck } from "lucide-react";
import { HouseIcon, PlusIcon } from "@animateicons/react/lucide";
import { resolveImageUrl, cn } from "@/lib/utils";

import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import { WfhRequestSheet } from "@/features/hr/leaves/wfh-request-sheet";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";

import type {
  LeaveBalance,
  LeaveType,
  Approver,
  LeaveRequest,
  ApprovedLeave,
} from "./leaves-shared";

const LeavesSummaryStrip = React.memo(function LeavesSummaryStrip({
  totalAvailable,
  pendingCount,
  approvedCount,
}: {
  totalAvailable: number;
  pendingCount: number;
  approvedCount: number;
}) {
  return (
    <StatCardGrid cols={3}>
      <StatCard
        label="Available Days"
        value={totalAvailable}
        icon={CalendarCheck}
        color="green"
      />
      <StatCard
        label="Pending Requests"
        value={pendingCount}
        icon={Clock3}
        tone="amber"
      />
      <StatCard
        label="Approved (YTD)"
        value={approvedCount}
        icon={BadgeCheck}
        color="blue"
      />
    </StatCardGrid>
  );
});

import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { TruncatedText } from "@/components/ui/truncated-text";

const TAB_TRIGGER_CLASS =
  "relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground pb-2.5 pt-1.5 px-3 text-sm";

interface LeavesWfhContentProps {
  selfService?: boolean;
}

export function LeavesWfhContent({ selfService = false }: LeavesWfhContentProps) {
  const { data: session } = useSession();
  const hrModuleEnabled = useModuleEnabled("hr");
  const canManageHr = useCan("hr:employees:manage");
  const isAdmin = !selfService && canManageHr && hrModuleEnabled;

  const { data: contextData, isLoading: contextLoading } = useHrLeaveContext();
  const { data: myData, isLoading: myLoading } = useHrMyLeaveRequests();
  const { data: approvalsData, isLoading: approvalsLoading } =
    useHrLeaveApprovals({
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

  const balances = (contextData?.balances ?? []) as LeaveBalance[];
  const leaveTypes = (contextData?.types ?? []) as LeaveType[];
  const approvers = (contextData?.approvers ?? []) as Approver[];
  const joiningDate = contextData?.joiningDate ?? null;

  const myLeaveRequests = (myData?.requests ?? []) as LeaveRequest[];
  const incomingLeaveRequests = (approvalsData?.pending ??
    []) as LeaveRequest[];
  const allIncomingLeaveRequests = (approvalsData?.all ?? []) as LeaveRequest[];
  const approvedLeavesThisWeek = (thisWeekData ?? []) as ApprovedLeave[];

  const totalPendingApprovals =
    incomingLeaveRequests.length + (pendingWfhRequests?.length || 0);

  const totalAvailable = balances.reduce(
    (sum, b) => sum + Number(b.balance ?? 0),
    0,
  );
  const pendingCount = myLeaveRequests.filter(
    (r) => r.status === "PENDING",
  ).length;
  const approvedCount = myLeaveRequests.filter(
    (r) => r.status === "APPROVED",
  ).length;

  const title = selfService ? "Time Off" : "Leaves & Time Off";
  const subtitle = selfService
    ? "Request leave and work from home."
    : "Manage leave requests, work from home, and approvals.";

  if (contextLoading || myLoading) {
    return (
      <PageWrapper title={title} subtitle={subtitle} noInternalScroll={selfService}>
        <div className="space-y-3">
          <StatCardGridSkeleton cols={3} count={3} />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title={title}
        subtitle={subtitle}
        noInternalScroll={selfService}
        actions={
          <>
            <AnimatedIconButton
              icon={HouseIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              variant="outline"
              size="sm"
              onClick={handleOpenWfhSheet}
              className="gap-1.5 h-8"
            >
              Request WFH
            </AnimatedIconButton>
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              size="sm"
              onClick={handleOpenLeaveSheet}
              className="gap-1.5 h-8"
            >
              Request Leave
            </AnimatedIconButton>
          </>
        }
      >
        <div className={cn(selfService ? CONTENT_FILL_PANEL : undefined, selfService ? "min-h-0 gap-3" : "space-y-4")}>
          <LeavesSummaryStrip
            totalAvailable={totalAvailable}
            pendingCount={pendingCount}
            approvedCount={approvedCount}
          />

          {!selfService && approvedLeavesThisWeek.length > 0 && (
            <Card className="rounded-xl border border-amber-200/50 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                  </div>
                  Who&apos;s Out This Week
                  <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    {approvedLeavesThisWeek.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {approvedLeavesThisWeek.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-amber-200/50 dark:border-amber-500/30/20"
                    >
                      <Avatar className="w-7">
                        <AvatarImage src={resolveImageUrl(leave.user?.image)} />
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {leave.user?.firstName?.[0]}
                          {leave.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <TruncatedText
                          text={`${leave.user?.firstName ?? ""} ${leave.user?.lastName ?? ""}`.trim()}
                          className="text-xs font-medium text-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(leave.startDate), "MMM dd")} –{" "}
                          {format(new Date(leave.endDate), "MMM dd")}
                          {leave.leaveType && (
                            <span className="ml-1 text-amber-600 dark:text-amber-300">
                              · {leave.leaveType.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="my-leaves" className="flex min-h-0 flex-1 flex-col gap-3">
            <TabsList className="bg-transparent border-b rounded-none p-0 gap-0 h-auto w-full justify-start shrink-0">
              <TabsTrigger value="my-leaves" className={TAB_TRIGGER_CLASS}>
                My Leaves
                {myLeaveRequests.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {myLeaveRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="wfh" className={TAB_TRIGGER_CLASS}>
                Work From Home
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="approvals" className={TAB_TRIGGER_CLASS}>
                  Approvals
                  {totalPendingApprovals > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white">
                      {totalPendingApprovals}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my-leaves" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
              <LeavesTabContent
                balances={balances}
                myLeaveRequests={myLeaveRequests}
                approvedLeavesThisWeek={selfService ? [] : approvedLeavesThisWeek}
                compact={selfService}
              />
            </TabsContent>

            <TabsContent value="wfh" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
              <WfhTabContent compact={selfService} />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="approvals" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                <LeaveApprovalsContent
                  incomingLeaveRequests={incomingLeaveRequests}
                  allIncomingLeaveRequests={allIncomingLeaveRequests}
                  currentUserId={session?.user?.id}
                  isLoading={approvalsLoading}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PageWrapper>

      <LeaveRequestSheet
        open={leaveSheetOpen}
        onOpenChange={setLeaveSheetOpen}
        leaveTypes={leaveTypes}
        approvers={approvers}
        joiningDate={joiningDate}
        balances={balances}
      />
      <WfhRequestSheet
        open={wfhSheetOpen}
        onOpenChange={setWfhSheetOpen}
        approvers={approvers}
      />
    </>
  );
}
