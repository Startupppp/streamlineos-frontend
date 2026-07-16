"use client";

import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
  useHrPendingWfhRequests,
  useHrLeaveContext,
  useHrLeaveApprovals,
  useHrMyLeaveRequests,
  useHrLeavesThisWeek,
} from "@/hooks/api/hr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, Clock3, BadgeCheck } from "lucide-react";
import { HouseIcon, PlusIcon } from "@animateicons/react/lucide";
import { resolveImageUrl } from "@/lib/utils";

import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import { WfhRequestSheet } from "@/features/hr/leaves/wfh-request-sheet";

import type {
  LeaveBalance, LeaveType, Approver, LeaveRequest, ApprovedLeave,
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
      <StatCard label="Available Days" value={totalAvailable} icon={CalendarCheck} color="green" />
      <StatCard label="Pending Requests" value={pendingCount} icon={Clock3} tone="amber" />
      <StatCard label="Approved (YTD)" value={approvedCount} icon={BadgeCheck} color="blue" />
    </StatCardGrid>
  );
});
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";
import { useCan } from "@/hooks/api/access";

export function LeavesWfhContent() {
  const { data: session } = useSession();
  const isAdmin = useCan("hr:employees:manage");

  const { data: contextData, isLoading: contextLoading } = useHrLeaveContext();
  const { data: myData, isLoading: myLoading } = useHrMyLeaveRequests();
  const { data: approvalsData, isLoading: approvalsLoading } = useHrLeaveApprovals();
  const { data: thisWeekData } = useHrLeavesThisWeek();
  const { data: pendingWfhRequests } = useHrPendingWfhRequests();

  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [wfhSheetOpen, setWfhSheetOpen] = useState(false);

  const handleOpenLeaveSheet = useCallback(() => setLeaveSheetOpen(true), []);
  const handleOpenWfhSheet = useCallback(() => setWfhSheetOpen(true), []);

  const balances = (contextData?.balances ?? []) as LeaveBalance[];
  const leaveTypes = (contextData?.types ?? []) as LeaveType[];
  const approvers = (contextData?.approvers ?? []) as Approver[];
  const joiningDate = contextData?.joiningDate ?? null;

  const myLeaveRequests = ((myData?.requests ?? []) as LeaveRequest[]);
  const incomingLeaveRequests = ((approvalsData?.pending ?? []) as LeaveRequest[]);
  const allIncomingLeaveRequests = ((approvalsData?.all ?? []) as LeaveRequest[]);
  const approvedLeavesThisWeek = ((thisWeekData ?? []) as ApprovedLeave[]);

  const totalPendingApprovals =
    incomingLeaveRequests.length + (pendingWfhRequests?.length || 0);

  const totalAvailable = balances.reduce((sum, b) => sum + Number(b.balance ?? 0), 0);
  const pendingCount = myLeaveRequests.filter((r) => r.status ==="PENDING").length;
  const approvedCount = myLeaveRequests.filter((r) => r.status ==="APPROVED").length;

  if (contextLoading || myLoading) {
    return (
      <PageWrapper
        title="Leaves & Time Off"
        subtitle="Manage your leave requests, work from home, and approvals."
        variant="display"
      >
        <div className="space-y-4">
          <StatCardGridSkeleton cols={3} count={3} />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Leaves & Time Off"
        subtitle="Manage your leave requests, work from home, and approvals."
        variant="display"
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
              className="gap-1.5 h-8 shadow-sm"
            >
              Request Leave
            </AnimatedIconButton>
          </>
        }
      >
        <div className="space-y-5">
          <LeavesSummaryStrip
            totalAvailable={totalAvailable}
            pendingCount={pendingCount}
            approvedCount={approvedCount}
          />

          {approvedLeavesThisWeek.length > 0 && (
            <Card className="rounded-2xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Who&apos;s Out This Week
                  <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    {approvedLeavesThisWeek.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {approvedLeavesThisWeek.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-amber-200/50 dark:border-amber-800/20"
                    >
                      <Avatar className="w-7">
                        <AvatarImage src={resolveImageUrl(leave.user?.image)} />
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {leave.user?.firstName?.[0]}
                          {leave.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {leave.user?.firstName} {leave.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(leave.startDate),"MMM dd")} –{" "}
                          {format(new Date(leave.endDate),"MMM dd")}
                          {leave.leaveType && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
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

          <Tabs defaultValue="my-leaves">
            <div className="overflow-x-auto">
            <TabsList className="h-auto bg-transparent border-b border-border rounded-none p-0 gap-0 w-max min-w-full justify-start">
              <TabsTrigger
                value="my-leaves"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-3 pt-2.5 px-4 text-sm font-medium transition-colors duration-200"
              >
                My Leaves
                {myLeaveRequests.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {myLeaveRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="wfh"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-3 pt-2.5 px-4 text-sm font-medium transition-colors duration-200"
              >
                Work From Home
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="approvals"
                  className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-3 pt-2.5 px-4 text-sm font-medium transition-colors duration-200"
                >
                  Approvals
                  {totalPendingApprovals > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white">
                      {totalPendingApprovals}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
            </div>

            <TabsContent value="my-leaves" className="mt-5">
              <LeavesTabContent
                balances={balances}
                myLeaveRequests={myLeaveRequests}
                approvedLeavesThisWeek={approvedLeavesThisWeek}
              />
            </TabsContent>

            <TabsContent value="wfh" className="mt-5">
              <WfhTabContent />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="approvals" className="mt-5">
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
