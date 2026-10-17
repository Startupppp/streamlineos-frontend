"use client";

import React from "react";

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
  // V-044. The mutations and both dialogs now live in `leave-decision-controls`,
  // so /hr/approvals drives exactly the same decision path this list does.
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
