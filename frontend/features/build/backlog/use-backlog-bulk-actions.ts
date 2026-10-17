"use client";

import { useCallback, useState } from "react";
import { useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build/tickets";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface UseBacklogBulkActionsReturn {
  selectedIds: Set<string | number>;
  handleBulkStatus: (v: string) => void;
  handleBulkPriority: (v: string) => void;
  handleBulkAssignee: (v: string) => void;
  handleBulkCycle: (v: string) => void;
  handleBulkParent: (parentTicketId: number | null) => void;
  handleClearSelection: () => void;
  handleSelectionChange: (sel: Set<string | number>) => void;
  isBulkPending: boolean;
}

export function useBacklogBulkActions(
  projectId: number,
): UseBacklogBulkActionsReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const handleBulkUpdate = useCallback(
    (
      update: Partial<
        Pick<
          BulkUpdateTicketsInput,
          | "assigneeId"
          | "status"
          | "cycleId"
          | "priority"
          | "parentTicketId"
        >
      >,
    ) => {
      if (selectedIds.size === 0) {
        toast.error("No tickets selected");
        return;
      }
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), ...update },
        {
          onSuccess: (d) => {
            toast.success(
              `${d.updated} ticket${d.updated !== 1 ? "s" : ""} updated`,
            );
            setSelectedIds(new Set());
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [selectedIds, bulkUpdate],
  );

  const handleBulkStatus = useCallback(
    (v: string) => handleBulkUpdate({ status: v }),
    [handleBulkUpdate],
  );
  const handleBulkPriority = useCallback(
    (v: string) => {
      if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "URGENT") {
        handleBulkUpdate({ priority: v });
      }
    },
    [handleBulkUpdate],
  );
  const handleBulkAssignee = useCallback(
    (v: string) => handleBulkUpdate({ assigneeId: v }),
    [handleBulkUpdate],
  );
  const handleBulkCycle = useCallback(
    (v: string) =>
      handleBulkUpdate({ cycleId: v === "backlog" ? null : Number(v) }),
    [handleBulkUpdate],
  );
  const handleBulkParent = useCallback(
    (parentTicketId: number | null) => handleBulkUpdate({ parentTicketId }),
    [handleBulkUpdate],
  );
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const handleSelectionChange = useCallback(
    (sel: Set<string | number>) => setSelectedIds(sel),
    [],
  );

  return {
    selectedIds,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
    handleBulkParent,
    handleClearSelection,
    handleSelectionChange,
    isBulkPending: bulkUpdate.isPending,
  };
}
