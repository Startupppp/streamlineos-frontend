import {
  getLeaveContext,
  getApprovers,
  getMyRequests,
  getIncomingRequests,
  getAllIncomingRequests,
  getApprovedLeavesThisWeek,
} from "@/server/actions/leave-actions";
import { LeaveErrorState } from "./leaves-empty-states";
import { LeavesWfhContent } from "./leaves-wfh-content";

export default async function LeavesPage() {
  let context, approvers, myRequests, incomingRequests, allIncomingRequests, approvedThisWeek;
  try {
    [context, approvers, myRequests, incomingRequests, allIncomingRequests, approvedThisWeek] =
      await Promise.all([
        getLeaveContext(),
        getApprovers(),
        getMyRequests(),
        getIncomingRequests(),
        getAllIncomingRequests(),
        getApprovedLeavesThisWeek(),
      ]);
  } catch {
    return (
      <div className="space-y-6">
        <LeaveErrorState />
      </div>
    );
  }

  if (!context.success || !context.balances) {
    return (
      <div className="space-y-6">
        <LeaveErrorState />
      </div>
    );
  }

  return (
    <LeavesWfhContent
      balances={context.balances}
      leaveTypes={context.types || []}
      approvers={approvers}
      myLeaveRequests={myRequests}
      incomingLeaveRequests={incomingRequests}
      allIncomingLeaveRequests={allIncomingRequests}
      approvedLeavesThisWeek={approvedThisWeek}
      joiningDate={context.joiningDate ?? null}
    />
  );
}
