"use client";

import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useHrPendingWfhRequests } from "@/lib/api/hooks/hr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Plus, Users, Home, CalendarCheck, Clock3, BadgeCheck } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";

import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import { WfhRequestSheet } from "@/features/hr/leaves/wfh-request-sheet";

import type {
  LeaveBalance, LeaveType, Approver, LeaveRequest, ApprovedLeave,
} from "./leaves-shared";
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";

interface LeavesWfhContentProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  approvers: Approver[];
  myLeaveRequests: LeaveRequest[];
  incomingLeaveRequests: LeaveRequest[];
  allIncomingLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek: ApprovedLeave[];
  joiningDate: string | null;
}

export function LeavesWfhContent({
  balances,
  leaveTypes,
  approvers,
  myLeaveRequests,
  incomingLeaveRequests,
  allIncomingLeaveRequests,
  approvedLeavesThisWeek,
  joiningDate,
}: LeavesWfhContentProps) {
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "CEO" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "HR";

  const { data: pendingWfhRequests } = useHrPendingWfhRequests();
  const totalPendingApprovals =
    incomingLeaveRequests.length + (pendingWfhRequests?.length || 0);

  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [wfhSheetOpen, setWfhSheetOpen] = useState(false);

  const handleOpenLeaveSheet = useCallback(() => setLeaveSheetOpen(true), []);
  const handleOpenWfhSheet = useCallback(() => setWfhSheetOpen(true), []);

  // Stats
  const totalAvailable = balances.reduce((sum, b) => sum + Number(b.balance ?? 0), 0);
  const pendingCount = myLeaveRequests.filter((r) => r.status === "PENDING").length;
  const approvedCount = myLeaveRequests.filter((r) => r.status === "APPROVED").length;

  return (
    <>
      <PageWrapper
        title="Leaves & Time Off"
        subtitle="Manage your leave requests, work from home, and approvals."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenWfhSheet}
              className="gap-1.5"
            >
              <Home className="h-3.5 w-3.5" />
              Request WFH
            </Button>
            <Button
              size="sm"
              onClick={handleOpenLeaveSheet}
              className="gap-1.5 bg-gold hover:bg-gold/80 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Request Leave
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
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
              color="gold"
            />
            <StatCard
              label="Approved (YTD)"
              value={approvedCount}
              icon={BadgeCheck}
              color="blue"
            />
          </div>

          {/* Who's Out Banner */}
          {approvedLeavesThisWeek.length > 0 && (
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <Users className="h-4 w-4" />
                  Who&apos;s Out This Week
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {approvedLeavesThisWeek.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {approvedLeavesThisWeek.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-card border border-amber-200/50 dark:border-amber-800/20"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={resolveImageUrl(leave.user?.image)} />
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                          {leave.user?.firstName?.[0]}
                          {leave.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {leave.user?.firstName} {leave.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(leave.startDate), "MMM dd")} –{" "}
                          {format(new Date(leave.endDate), "MMM dd")}
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

          {/* Tabs */}
          <Tabs defaultValue="my-leaves">
            <TabsList className="bg-muted/50 border border-border p-1 rounded-lg h-auto gap-1">
              <TabsTrigger
                value="my-leaves"
                className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                My Leaves
              </TabsTrigger>
              <TabsTrigger
                value="wfh"
                className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                Work From Home
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="approvals"
                  className="relative data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
                >
                  Approvals
                  {totalPendingApprovals > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-red-500 text-white text-[10px] font-bold border-0">
                      {totalPendingApprovals}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my-leaves" className="mt-4">
              <LeavesTabContent balances={balances} myLeaveRequests={myLeaveRequests} />
            </TabsContent>

            <TabsContent value="wfh" className="mt-4">
              <WfhTabContent />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="approvals" className="mt-4">
                <LeaveApprovalsContent
                  incomingLeaveRequests={incomingLeaveRequests}
                  allIncomingLeaveRequests={allIncomingLeaveRequests}
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
      />
      <WfhRequestSheet
        open={wfhSheetOpen}
        onOpenChange={setWfhSheetOpen}
        approvers={approvers}
      />
    </>
  );
}
