"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { CalendarDays } from "lucide-react";

import type { LeaveRequest } from "./leaves-shared";
import { LeaveApprovalsList } from "./leave-approvals-list";
import { WfhApprovalsCard } from "./wfh-approvals-card";

const TAB_TRIGGER_CLASS =
  "rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs duration-200 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";
const COUNT_CLASS =
  "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-micro font-semibold text-muted-foreground";

interface LeaveApprovalsContentProps {
  incomingLeaveRequests: LeaveRequest[];
  allIncomingLeaveRequests: LeaveRequest[];
  currentUserId?: string;
  isLoading?: boolean;
}

export function LeaveApprovalsContent({
  incomingLeaveRequests,
  allIncomingLeaveRequests,
  currentUserId,
  isLoading = false,
}: LeaveApprovalsContentProps) {
  const leaveState = usePageState({
    permission: "hr:leaves:view",
    isLoading,
    isError: false,
    error: null,
  });

  const approvedRequests = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "APPROVED"),
    [allIncomingLeaveRequests],
  );
  const rejectedRequests = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "REJECTED"),
    [allIncomingLeaveRequests],
  );

  const panels: Array<{
    value: string;
    label: string;
    rows: LeaveRequest[];
    emptyTitle: string;
    emptyDescription: string;
  }> = [
    {
      value: "all",
      label: "All",
      rows: allIncomingLeaveRequests,
      emptyTitle: "No leave requests",
      emptyDescription: "There are no leave requests to display.",
    },
    {
      value: "pending",
      label: "Pending",
      rows: incomingLeaveRequests,
      emptyTitle: "No pending leave requests",
      emptyDescription: "All leave requests have been processed.",
    },
    {
      value: "approved",
      label: "Approved",
      rows: approvedRequests,
      emptyTitle: "No approved leave requests",
      emptyDescription: "No leave requests have been approved yet.",
    },
    {
      value: "rejected",
      label: "Rejected",
      rows: rejectedRequests,
      emptyTitle: "No rejected leave requests",
      emptyDescription: "No leave requests have been rejected.",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Leave Requests
            {allIncomingLeaveRequests.length > 0 ? (
              <span className={COUNT_CLASS}>{allIncomingLeaveRequests.length}</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <PageState
            resolution={leaveState}
            compact
            loading={<Skeleton className="h-24 w-full rounded-xl" />}
          >
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="gap-0 rounded-none border-b bg-transparent p-0">
                {panels.map((panel) => (
                  <TabsTrigger
                    key={panel.value}
                    value={panel.value}
                    className={TAB_TRIGGER_CLASS}
                  >
                    {panel.label}
                    {panel.rows.length > 0 ? (
                      <span className={COUNT_CLASS}>{panel.rows.length}</span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>

              {panels.map((panel) => (
                <TabsContent key={panel.value} value={panel.value}>
                  {panel.rows.length === 0 ? (
                    <EmptyState
                      illustration={<EmptyApprovalIllustration />}
                      title={panel.emptyTitle}
                      description={panel.emptyDescription}
                    />
                  ) : (
                    <LeaveApprovalsList
                      requests={panel.rows}
                      currentUserId={currentUserId}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </PageState>
        </CardContent>
      </Card>

      <WfhApprovalsCard />
    </div>
  );
}
