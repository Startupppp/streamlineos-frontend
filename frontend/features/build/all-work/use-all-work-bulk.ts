"use client";

import { useMemo, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AllWorkTicket } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";


const bulkUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.bulkUpdateResultContract),
);

type BulkPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const BULK_PRIORITIES: readonly BulkPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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
      if (t.projectId === null) continue;
      const existing = map.get(t.projectId);
      if (existing) {
        existing.push(t.id);
      } else {
        map.set(t.projectId, [t.id]);
      }
    }
    return map;
  }, [selectedTickets]);

  const crossProjectBulkMutation = useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "all-work", "bulk-update"],
    mutationFn: async (payload: {
      ticketsByProject: Map<number, number[]>;
      status?: string;
      priority?: BulkPriority;
      assigneeId?: string;
    }) => {
      const calls = [...payload.ticketsByProject.entries()].map(([projectId, ticketIds]) =>
        apiClient.post<{ updated: number; ticketIds: number[] }>(
          `/build/${projectId}/tickets/bulk`,
          { ticketIds, status: payload.status, priority: payload.priority, assigneeId: payload.assigneeId },
          undefined,
          bulkUpdateResultLazy,
        )
      );
      const results = await Promise.all(calls);
      return results.reduce((acc, r) => acc + r.updated, 0);
    },
    onSuccess: (totalUpdated) => {
      toast.success(`${totalUpdated} ticket${totalUpdated === 1 ? "" : "s"} updated`);
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.allWorkAll });
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
    (value: string) => {
      const found = BULK_PRIORITIES.find((p) => p === value);
      if (found) void handleBulkAction({ priority: found });
    },
    [handleBulkAction]
  );

  const handleBulkAssignee = useCallback(
    (value: string) => { void handleBulkAction({ assigneeId: value }); },
    [handleBulkAction]
  );

  const handleBulkSprintNoOp = useCallback((_: string) => {}, []);

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
