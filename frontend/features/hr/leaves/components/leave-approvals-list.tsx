"use client";


import type { LeaveRequest } from "./leaves-shared";
import { LeaveApprovalItem } from "./leave-approval-item";
import { useLeaveDecisions } from "./leave-decision-controls";

interface LeaveApprovalsListProps {
  requests: LeaveRequest[];
  currentUserId: string | undefined;
}

export function LeaveApprovalsList({
  requests,
  currentUserId,
}: LeaveApprovalsListProps) {
  const { onProcess, processingId, decisionDialogs } = useLeaveDecisions();

  return (
    <>
      <ul className="space-y-3" aria-label="Leave approvals">
        {requests.map((req) => (
          <li key={req.id}>
            <LeaveApprovalItem
              req={req}
              processingId={processingId}
              currentUserId={currentUserId}
              onProcess={onProcess}
            />
          </li>
        ))}
      </ul>
      {decisionDialogs}
    </>
  );
}
