import {
  getLeaveContext,
  getApprovers,
  getMyRequests,
  getIncomingRequests,
  getApprovedLeavesThisWeek,
} from "@/server/actions/leave-actions";
import { LeaveErrorState } from "./leaves-empty-states";
import { LeavesWfhContent } from "./leaves-wfh-content";

export default async function LeavesPage() {
  const [context, approvers, myRequests, incomingRequests, approvedThisWeek] =
    await Promise.all([
      getLeaveContext(),
      getApprovers(),
      getMyRequests(),
      getIncomingRequests(),
      getApprovedLeavesThisWeek(),
    ]);

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
      approvedLeavesThisWeek={approvedThisWeek}
    />
  );
}
