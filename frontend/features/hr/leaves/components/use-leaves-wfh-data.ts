"use client";

import { useCallback, useMemo } from "react";
import {
  useHrPendingWfhRequests,
  useHrLeaveContext,
  useHrLeaveApprovals,
  useHrMyLeaveRequestsInfinite,
  useHrLeavesThisWeek,
} from "@/hooks/api/hr";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { approvedDaysInYear } from "@/features/hr/leaves/leave-date-helpers";
import { buildAvailableHint } from "./leaves-summary-strip";
import type {
  ApprovedLeave,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
} from "./leaves-shared";

export function useLeavesWfhData(selfService: boolean) {
  const hrModuleEnabled = useModuleEnabled("hr");
  const canApproveLeaves = useCan("hr:leaves:approve");
  const canDecideWfh = useCan("hr:attendance:manage");
  const isAdmin = !selfService && hrModuleEnabled && (canApproveLeaves || canDecideWfh);
  const canRequestLeave = useCan("self:leaves");
  const canRequestWfh = useCan("self:attendance");

  const context = useHrLeaveContext();
  const myRequests = useHrMyLeaveRequestsInfinite();
  const approvals = useHrLeaveApprovals({ enabled: isAdmin });
  const { data: thisWeekData } = useHrLeavesThisWeek({ enabled: !selfService });
  const { data: pendingWfhRequests } = useHrPendingWfhRequests({ enabled: isAdmin });

  const balances: LeaveBalance[] = context.data?.balances ?? [];
  const leaveTypes: LeaveType[] = context.data?.types ?? [];
  const joiningDate = context.data?.joiningDate ?? null;

  const myLeaveRequests = useMemo(
    (): LeaveRequest[] => myRequests.data?.pages.flatMap((page) => page.data) ?? [],
    [myRequests.data],
  );
  const allIncomingLeaveRequests = useMemo(
    (): LeaveRequest[] => approvals.data?.pages.flatMap((page) => page.data) ?? [],
    [approvals.data],
  );
  const incomingLeaveRequests = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "PENDING"),
    [allIncomingLeaveRequests],
  );
  const approvedLeavesThisWeek: ApprovedLeave[] = thisWeekData ?? [];

  const noPolicyConfigured =
    context.data?.noPolicyConfigured ?? leaveTypes.length === 0;

  const fetchMoreMyRequests = myRequests.fetchNextPage;
  const onLoadMoreMyRequests = useCallback(() => {
    void fetchMoreMyRequests();
  }, [fetchMoreMyRequests]);

  const refetchContext = context.refetch;
  const refetchMy = myRequests.refetch;
  const onRetryPage = useCallback(() => {
    void refetchContext();
    void refetchMy();
  }, [refetchContext, refetchMy]);

  return {
    isAdmin,
    canRequestLeave,
    canRequestWfh,
    balances,
    leaveTypes,
    joiningDate,
    approvalRoute: context.data?.approvalRoute,
    noPolicyConfigured,
    availableHint: buildAvailableHint(balances, joiningDate, noPolicyConfigured),
    totalAvailable: balances.reduce(
      (sum, b) => Math.round((sum + Number(b.balance ?? 0)) * 10) / 10,
      0,
    ),
    pendingCount: myLeaveRequests.filter((r) => r.status === "PENDING").length,
    approvedDays: approvedDaysInYear(myLeaveRequests),
    myLeaveRequests,
    allIncomingLeaveRequests,
    incomingLeaveRequests,
    approvedLeavesThisWeek,
    totalPendingApprovals:
      incomingLeaveRequests.length + (pendingWfhRequests?.length ?? 0),
    isLoading: context.isLoading || myRequests.isLoading,
    isError: context.isError || myRequests.isError,
    errorValue: context.error ?? myRequests.error,
    onRetryPage,
    approvalsLoading: approvals.isLoading,
    approvalsError: approvals.isError,
    approvalsErrorValue: approvals.error,
    refetchApprovals: approvals.refetch,
    hasMoreMyRequests: myRequests.hasNextPage,
    isLoadingMoreMyRequests: myRequests.isFetchingNextPage,
    onLoadMoreMyRequests,
  };
}
