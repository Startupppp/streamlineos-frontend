"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";

export function useCycleBulk(
  bulkUpdate: ReturnType<typeof useBulkUpdateTickets>,
  selectedIds: Set<string | number>,
  setSelectedIds: (ids: Set<string | number>) => void,
) {
  const handleBulkStatus = useCallback(
    (v: string) => {
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), status: v },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds, setSelectedIds],
  );

  const handleBulkPriority = useCallback(
    (v: string) => {
      const priority = toBulkPriority(v);
      if (!priority) return;
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), priority },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds, setSelectedIds],
  );

  const handleBulkAssignee = useCallback(
    (v: string) => {
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), assigneeId: v || undefined },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds, setSelectedIds],
  );

  const handleBulkCycle = useCallback(
    (v: string) => {
      bulkUpdate.mutate(
        {
          ticketIds: [...selectedIds].map(Number),
          cycleId: parseInt(v) || null,
        },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            toast.success("Updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [bulkUpdate, selectedIds, setSelectedIds],
  );

  return { handleBulkStatus, handleBulkPriority, handleBulkAssignee, handleBulkCycle };
}
