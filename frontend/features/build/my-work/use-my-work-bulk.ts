"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { isApiError } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { getErrorMessage } from "@/lib/get-error-message";
import { lazyContract } from "@/lib/api-envelope";
import type { AllWorkTicket } from "@/types/projects";
import type { BuildListSortField, BuildListSortDirection } from "@/features/build/shared/use-build-list-url-state";

const bulkUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.bulkUpdateResultContract,
  ),
);

type BulkPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
const BULK_PRIORITIES: readonly BulkPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface BulkPayload {
  ticketsByProject: Map<number, number[]>;
  status?: string;
  priority?: BulkPriority;
  assigneeId?: string;
}

async function fanOutBulk(payload: BulkPayload): Promise<void> {
  const calls = [...payload.ticketsByProject.entries()].map(
    ([projectId, ticketIds]) =>
      apiClient
        .post<{ updated: number; ticketIds: number[] }>(
          `/build/${projectId}/tickets/bulk`,
          {
            ticketIds,
            status: payload.status,
            priority: payload.priority,
            assigneeId: payload.assigneeId,
          },
          undefined,
          bulkUpdateResultLazy,
        )
        .then((r) => ({ updated: r.updated, projectId })),
  );

  const results = await Promise.allSettled(calls);

  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<{ updated: number; projectId: number }> =>
      r.status === "fulfilled",
  );
  const failed = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );

  const totalUpdated = succeeded.reduce((acc, r) => acc + r.value.updated, 0);

  const conflicts = failed.filter(
    (r) => isApiError(r.reason) && r.reason.status === 409,
  );
  const otherFailures = failed.filter(
    (r) => !(isApiError(r.reason) && r.reason.status === 409),
  );

  if (totalUpdated > 0) {
    toast.success(
      `${totalUpdated} ticket${totalUpdated === 1 ? "" : "s"} updated`,
    );
  }
  if (conflicts.length > 0) {
    toast.error(
      `${conflicts.length} project${conflicts.length === 1 ? "" : "s"} had a conflict — retry to apply`,
    );
  }
  if (otherFailures.length > 0) {
    const firstError = otherFailures[0]?.reason;
    toast.error(getErrorMessage(firstError));
  }
}

export interface UseMyWorkBulkReturn {
  tableSelection: Set<string | number>;
  setTableSelection: React.Dispatch<
    React.SetStateAction<Set<string | number>>
  >;
  selectedCount: number;
  isPendingBulk: boolean;
  handleBulkStatus: (value: string) => void;
  handleBulkPriority: (value: string) => void;
  handleBulkAssignee: (value: string) => void;
  handleBulkCycleNoOp: (value: string) => void;
  handleClearSelection: () => void;
}

export function useMyWorkBulk(
  tickets: AllWorkTicket[],
  sortField: BuildListSortField,
  sortDirection: BuildListSortDirection,
): UseMyWorkBulkReturn {
  const queryClient = useQueryClient();
  const [tableSelection, setTableSelection] = useState<Set<string | number>>(
    new Set(),
  );
  const [isPendingBulk, setIsPendingBulk] = useState(false);

  useEffect(() => {
    setTableSelection(new Set());
  }, [sortField, sortDirection]);

  const selectedTicketIds = useMemo(
    () => [...tableSelection].map((id) => Number(id)),
    [tableSelection],
  );

  const selectedTickets = useMemo(
    () => tickets.filter((t) => selectedTicketIds.includes(t.id)),
    [tickets, selectedTicketIds],
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

  const handleBulkAction = useCallback(
    (partial: {
      status?: string;
      priority?: BulkPriority;
      assigneeId?: string;
    }) => {
      if (ticketsByProject.size === 0) return;
      setIsPendingBulk(true);
      fanOutBulk({ ticketsByProject, ...partial })
        .then(() => {
          queryClient.invalidateQueries({
            queryKey: buildWorkQueryKeys.projects.allWorkAll,
          });
          setTableSelection(new Set());
        })
        .finally(() => setIsPendingBulk(false));
    },
    [ticketsByProject, queryClient],
  );

  const handleBulkStatus = useCallback(
    (value: string) => handleBulkAction({ status: value }),
    [handleBulkAction],
  );

  const handleBulkPriority = useCallback(
    (value: string) => {
      const found = BULK_PRIORITIES.find((p) => p === value);
      if (found) handleBulkAction({ priority: found });
    },
    [handleBulkAction],
  );

  const handleBulkAssignee = useCallback(
    (value: string) => handleBulkAction({ assigneeId: value }),
    [handleBulkAction],
  );

  const handleBulkCycleNoOp = useCallback((_: string) => {}, []);

  const handleClearSelection = useCallback(
    () => setTableSelection(new Set()),
    [],
  );

  return {
    tableSelection,
    setTableSelection,
    selectedCount: tableSelection.size,
    isPendingBulk,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycleNoOp,
    handleClearSelection,
  };
}
