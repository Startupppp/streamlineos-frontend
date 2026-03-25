"use client";

import React from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Users } from "lucide-react";

import { resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

import type {
  LeaveBalance,
  LeaveType,
  Approver,
  LeaveRequest,
  ApprovedLeave,
} from "./leaves-shared";
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";

/* ─── Props ─── */

interface LeavesWfhContentProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  approvers: Approver[];
  myLeaveRequests: LeaveRequest[];
  incomingLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek: ApprovedLeave[];
}

/* ─── Main Orchestrator ─── */

export function LeavesWfhContent({
  balances,
  leaveTypes,
  approvers,
  myLeaveRequests,
  incomingLeaveRequests,
  approvedLeavesThisWeek,
}: LeavesWfhContentProps) {
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "CEO" || session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  const { data: pendingWfhRequests } =
    api.hr.getPendingWfhRequests.useQuery();

  const totalPendingApprovals =
    incomingLeaveRequests.length + (pendingWfhRequests?.length || 0);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* ─── Page Header ─── */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Leaves</h1>
      </motion.div>

      {/* ─── Who's Out Banner ─── */}
      {approvedLeavesThisWeek.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-border bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Users className="h-4 w-4" aria-hidden="true" />
                Who&apos;s Out This Week
                <Badge variant="secondary" className="ml-1 text-xs">
                  {approvedLeavesThisWeek.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-3" role="list" aria-label="Team members on leave this week">
                {approvedLeavesThisWeek.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-card border border-amber-200/50 dark:border-amber-800/20"
                    role="listitem"
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
        </motion.div>
      )}

      {/* ─── Tabs ─── */}
      <motion.div variants={fadeUp}>
        <Tabs defaultValue="my-leaves" className="space-y-4">
          <TabsList>
            <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
            <TabsTrigger value="wfh">Work From Home</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="approvals" className="relative">
                Approvals
                {totalPendingApprovals > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
                    aria-label={`${totalPendingApprovals} pending approvals`}
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ─── My Leaves Tab ─── */}
          <TabsContent value="my-leaves" className="space-y-4">
            <LeavesTabContent
              balances={balances}
              leaveTypes={leaveTypes}
              approvers={approvers}
              myLeaveRequests={myLeaveRequests}
            />
          </TabsContent>

          {/* ─── WFH Tab ─── */}
          <TabsContent value="wfh" className="space-y-4">
            <WfhTabContent approvers={approvers} />
          </TabsContent>

          {/* ─── Approvals Tab ─── */}
          {isAdmin && (
            <TabsContent value="approvals">
              <LeaveApprovalsContent
                incomingLeaveRequests={incomingLeaveRequests}
              />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
