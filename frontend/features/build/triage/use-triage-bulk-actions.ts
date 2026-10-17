"use client";

import { useCallback, useState } from "react";
import { useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build/tickets";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";

interface UseTriageBulkActionsProps {
  projectId: number;
}

export function useTriageBulkActions({ projectId }: UseTriageBulkActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkUpdate = useCallback(
    (
      update: Partial<
        Pick<BulkUpdateTicketsInput, "status" | "priority" | "assigneeId" | "cycleId">
      >,
    ) =>
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds], ...update },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
    [bulkUpdate, selectedIds],
  );

  const handleBulkStatus = useCallback(
    (v: string) => handleBulkUpdate({ status: v }),
    [handleBulkUpdate],
  );

  const handleBulkPriority = useCallback(
    (v: string) => {
      const p = toBulkPriority(v);
      if (p) handleBulkUpdate({ priority: p });
    },
    [handleBulkUpdate],
  );

  const handleBulkAssignee = useCallback(
    (v: string) => handleBulkUpdate({ assigneeId: v || undefined }),
    [handleBulkUpdate],
  );

  const handleBulkCycle = useCallback(
    (v: string) => handleBulkUpdate({ cycleId: parseInt(v) || null }),
    [handleBulkUpdate],
  );

  return {
    selectedIds,
    handleToggleSelect,
    handleClearSelection,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
  };
}
