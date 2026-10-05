"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import {
  useApproveLeaveDedicated,
  useRejectLeaveDedicated,
} from "@/hooks/api/hr";
import { useProcessWfhRequest } from "@/hooks/api/hr/hr-settings";
import {
  useApplyRegularization,
  useRejectRegularization,
} from "@/hooks/api/hr/attendance-regularization-queue";
import { useUpdateExpenseStatus } from "@/hooks/api/hr/expenses";
import {
  useApproveInstance,
  useRejectInstance,
} from "@/hooks/api/hr/hr-workflows";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  ActionCenterItem,
  ActionCenterSource,
} from "@/features/hr/action-center/queue-item";

export type QueueDecision = "approve" | "reject";

export interface BulkOutcome {
  readonly requested: number;
  readonly succeeded: number;
  readonly firstError: string | null;
}

const DECIDE_PERMISSION: Record<ActionCenterSource, string> = {
  leave: "hr:leaves:approve",
  wfh: "hr:attendance:manage",
  attendance: "hr:attendance:manage",
  expense: "hr:expenses:approve",
  workflow: "hr:workflows:approve",
};

export function useActionCenterDecisions() {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<readonly string[]>([]);

  const canDecideLeave = useCan("hr:leaves:approve");
  const canDecideAttendance = useCan("hr:attendance:manage");
  const canDecideWorkflow = useCan("hr:workflows:approve");
  const canDecideExpense = useCan("hr:expenses:approve");

  const approveLeave = useApproveLeaveDedicated();
  const rejectLeave = useRejectLeaveDedicated();
  const processWfh = useProcessWfhRequest();
  const applyRegularization = useApplyRegularization();
  const rejectRegularization = useRejectRegularization();
  const updateExpenseStatus = useUpdateExpenseStatus();
  const approveInstance = useApproveInstance();
  const rejectInstance = useRejectInstance();

  const canDecide = useCallback(
    (source: ActionCenterSource): boolean => {
      if (source === "leave") return canDecideLeave;
      if (source === "workflow") return canDecideWorkflow;
      if (source === "expense") return canDecideExpense;
      return canDecideAttendance;
    },
    [canDecideLeave, canDecideWorkflow, canDecideExpense, canDecideAttendance],
  );

  const run = useCallback(
    async (
      item: ActionCenterItem,
      decision: QueueDecision,
      reason: string,
    ): Promise<void> => {
      if (decision === "reject" && reason.trim().length === 0)
        throw new Error("A rejection reason is required.");

      if (item.source === "leave") {
        if (decision === "approve")
          await approveLeave.mutateAsync({ leaveId: item.sourceId });
        else
          await rejectLeave.mutateAsync({ leaveId: item.sourceId, reason });
        return;
      }
      if (item.source === "wfh") {
        await processWfh.mutateAsync({
          requestId: item.sourceId,
          status: decision === "approve" ? "APPROVED" : "REJECTED",
          ...(decision === "reject" ? { rejectionReason: reason } : {}),
        });
        return;
      }
      if (item.source === "attendance") {
        if (decision === "approve")
          await applyRegularization.mutateAsync(item.sourceId);
        else
          await rejectRegularization.mutateAsync({
            regularizationId: item.sourceId,
            rejectionReason: reason,
          });
        return;
      }
      if (item.source === "expense") {
        await updateExpenseStatus.mutateAsync(
          decision === "approve"
            ? { expenseId: item.sourceId, status: "APPROVED" }
            : { expenseId: item.sourceId, status: "REJECTED", rejectionReason: reason },
        );
        return;
      }
      if (decision === "approve")
        await approveInstance.mutateAsync({ instanceId: item.sourceId });
      else
        await rejectInstance.mutateAsync({
          instanceId: item.sourceId,
          comment: reason,
        });
    },
    [
      approveLeave,
      rejectLeave,
      processWfh,
      applyRegularization,
      rejectRegularization,
      updateExpenseStatus,
      approveInstance,
      rejectInstance,
    ],
  );

  const invalidateBadges = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: collaborationQueryKeys.dashboard.pendingApprovals(),
    });
    void queryClient.invalidateQueries({
      queryKey: platformCoreQueryKeys.inbox.all,
    });
  }, [queryClient]);

  const decide = useCallback(
    async (
      item: ActionCenterItem,
      decision: QueueDecision,
      reason = "",
    ): Promise<boolean> => {
      setPendingIds((current) => [...current, item.id]);
      try {
        await run(item, decision, reason);
        invalidateBadges();
        return true;
      } finally {
        setPendingIds((current) => current.filter((id) => id !== item.id));
      }
    },
    [run, invalidateBadges],
  );

  const decideMany = useCallback(
    async (
      items: readonly ActionCenterItem[],
      decision: QueueDecision,
      reason = "",
    ): Promise<BulkOutcome> => {
      let succeeded = 0;
      let firstError: string | null = null;
      for (const item of items) {
        try {
          await decide(item, decision, reason);
          succeeded += 1;
        } catch (error) {
          if (firstError === null) firstError = getErrorMessage(error);
        }
      }
      return { requested: items.length, succeeded, firstError };
    },
    [decide],
  );

  return {
    decide,
    decideMany,
    canDecide,
    decidePermission: DECIDE_PERMISSION,
    isDeciding: (itemId: string) => pendingIds.includes(itemId),
    isBusy: pendingIds.length > 0,
  };
}
