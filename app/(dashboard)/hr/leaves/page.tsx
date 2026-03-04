import {
  getLeaveContext,
  getApprovers,
  getMyRequests,
  getIncomingRequests,
  getApprovedLeavesThisWeek,
} from "@/server/actions/leave-actions";
import { PageHeader } from "@/components/ui/page-header";
import { RequestLeaveDialog } from "./request-leave-dialog";
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
    <div className="space-y-6">
      <PageHeader
        title="Leaves & Work From Home"
        description="Request time off, manage WFH schedule, and track your balances."
        actions={
          <RequestLeaveDialog
            leaveTypes={context.types || []}
            approvers={approvers}
          />
        }
      />

      <LeavesWfhContent
        balances={context.balances}
        leaveTypes={context.types || []}
        approvers={approvers}
        myLeaveRequests={myRequests}
        incomingLeaveRequests={incomingRequests}
        approvedLeavesThisWeek={approvedThisWeek}
      />
    </div>
  );
}
