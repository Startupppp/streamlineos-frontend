"use client";

import { useMemo, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AllWorkTicket } from "@/types/projects";

type BulkPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface UseAllWorkBulkReturn {
  tableSelection: Set<string | number>;
  setTableSelection: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  selectedTicketIds: number[];
  selectedTickets: AllWorkTicket[];
  isPendingBulk: boolean;
  handleBulkStatus: (value: string) => void;
  handleBulkPriority: (value: string) => void;
  handleBulkAssignee: (value: string) => void;
  handleBulkSprintNoOp: (value: string) => void;
  handleClearSelection: () => void;
}

export function useAllWorkBulk(tickets: AllWorkTicket[]): UseAllWorkBulkReturn {
  const queryClient = useQueryClient();
  const [tableSelection, setTableSelection] = useState<Set<string | number>>(new Set());

  const selectedTicketIds = useMemo(
    () => [...tableSelection].map((id) => Number(id)),
    [tableSelection]
  );

  const selectedTickets = useMemo(
    () => tickets.filter((t) => selectedTicketIds.includes(t.id)),
    [tickets, selectedTicketIds]
  );

  const ticketsByProject = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const t of selectedTickets) {
      const existing = map.get(t.projectId);
      if (existing) {
        existing.push(t.id);
      } else {
        map.set(t.projectId, [t.id]);
      }
    }
    return map;
  }, [selectedTickets]);

  const crossProjectBulkMutation = useMutation({
    mutationKey: ["projects", "all-work", "bulk-update"],
    mutationFn: async (payload: {
      ticketsByProject: Map<number, number[]>;
      status?: string;
      priority?: BulkPriority;
      assigneeId?: string;
    }) => {
      const calls = [...payload.ticketsByProject.entries()].map(([projectId, ticketIds]) =>
        apiClient.post<{ updated: number; ticketIds: number[] }>(
          `/projects/${projectId}/tickets/bulk`,
          { ticketIds, status: payload.status, priority: payload.priority, assigneeId: payload.assigneeId }
        )
      );
      const results = await Promise.all(calls);
      return results.reduce((acc, r) => acc + r.updated, 0);
    },
    onSuccess: (totalUpdated) => {
      toast.success(`${totalUpdated} ticket${totalUpdated === 1 ? "" : "s"} updated`);
      queryClient.invalidateQueries({ queryKey: ["streamlineos", "projects", "all-work"] });
      setTableSelection(new Set());
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleBulkAction = useCallback(
    (payload: { status?: string; priority?: BulkPriority; assigneeId?: string }) => {
      crossProjectBulkMutation.mutate({ ticketsByProject, ...payload });
    },
    [crossProjectBulkMutation, ticketsByProject]
  );

  const handleBulkStatus = useCallback(
    (value: string) => { void handleBulkAction({ status: value }); },
    [handleBulkAction]
  );

  const handleBulkPriority = useCallback(
    (value: string) => { void handleBulkAction({ priority: value as BulkPriority }); },
    [handleBulkAction]
  );

  const handleBulkAssignee = useCallback(
    (value: string) => { void handleBulkAction({ assigneeId: value }); },
    [handleBulkAction]
  );

  const handleBulkSprintNoOp = useCallback((_value: string) => {}, []);

  const handleClearSelection = useCallback(() => {
    setTableSelection(new Set());
  }, []);

  return {
    tableSelection,
    setTableSelection,
    selectedTicketIds,
    selectedTickets,
    isPendingBulk: crossProjectBulkMutation.isPending,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkSprintNoOp,
    handleClearSelection,
  };
}
