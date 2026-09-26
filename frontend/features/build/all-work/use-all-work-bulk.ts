"use client";

import { useMemo, useCallback, useState } from "react";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";
import type { BulkPriority } from "@/features/build/shared/bulk-priority";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import type { AllWorkTicket } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const bulkUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.bulkUpdateResultContract,
  ),
);

const MAX_BULK_CHUNK = 100;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface BulkPayload {
  ticketsByProject: Map<number, number[]>;
  status?: string;
  priority?: BulkPriority;
  assigneeId?: string;
}

interface ProjectOutcome {
  projectId: number;
  updated: number;
  failures: unknown[];
}

interface UseAllWorkBulkReturn {
  tableSelection: Set<string | number>;
  setTableSelection: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  selectedTicketIds: number[];
  selectedTickets: AllWorkTicket[];
  isPendingBulk: boolean;
  handleBulkStatus: (value: string) => void;
  handleBulkPriority: (value: string) => void;
  handleBulkAssignee: (value: string) => void;
  handleBulkCycleNoOp: (value: string) => void;
  handleClearSelection: () => void;
}

export function useAllWorkBulk(tickets: AllWorkTicket[]): UseAllWorkBulkReturn {
  const queryClient = useQueryClient();
  const [tableSelection, setTableSelection] = useState<Set<string | number>>(new Set());

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
      if (existing) existing.push(t.id);
      else map.set(t.projectId, [t.id]);
    }
    return map;
  }, [selectedTickets]);

  const crossProjectBulkMutation = useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "all-work", "bulk-update"],
    mutationFn: async (payload: BulkPayload) => {
      const projectCalls = [...payload.ticketsByProject.entries()].map(
        async ([projectId, ids]): Promise<ProjectOutcome> => {
          const chunks = chunkArray(ids, MAX_BULK_CHUNK);
          const chunkResults = await Promise.allSettled(
            chunks.map((chunk) =>
              apiClient.post<{ updated: number; ticketIds: number[] }>(
                `/build/${projectId}/tickets/bulk`,
                {
                  ticketIds: chunk,
                  status: payload.status,
                  priority: payload.priority,
                  assigneeId: payload.assigneeId,
                },
                undefined,
                bulkUpdateResultLazy,
              ),
            ),
          );
          return {
            projectId,
            updated: chunkResults.reduce(
              (acc, r) => (r.status === "fulfilled" ? acc + r.value.updated : acc),
              0,
            ),
            failures: chunkResults
              .filter((r) => r.status === "rejected")
              .map((r) => r.reason),
          };
        },
      );

      return Promise.allSettled(projectCalls);
    },
    onSuccess: (settled) => {
      const succeeded: ProjectOutcome[] = [];
      const conflictIds: number[] = [];
      const errorMessages: string[] = [];

      for (const result of settled) {
        if (result.status === "fulfilled") {
          const outcome = result.value;
          if (outcome.updated > 0) {
            succeeded.push(outcome);
            queryClient.invalidateQueries({
              queryKey: buildWorkQueryKeys.projects.tickets({ projectId: outcome.projectId }),
            });
          }
          for (const reason of outcome.failures) {
            if (isApiError(reason) && reason.status === 409) {
              conflictIds.push(outcome.projectId);
            } else {
              errorMessages.push(getErrorMessage(reason));
            }
          }
        } else {
          const reason: unknown = result.reason;
          if (isApiError(reason) && reason.status === 409) {
            conflictIds.push(0);
          } else {
            errorMessages.push(getErrorMessage(reason));
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.allWorkAll });

      const totalUpdated = succeeded.reduce((acc, o) => acc + o.updated, 0);

      if (totalUpdated > 0) {
        toast.success(`${totalUpdated} ticket${totalUpdated === 1 ? "" : "s"} updated`);
      }
      if (conflictIds.length > 0) {
        toast.warning(
          `${conflictIds.length} project${conflictIds.length === 1 ? "" : "s"} had a concurrent conflict — retry to apply the remaining changes`,
        );
      }
      if (errorMessages.length > 0) {
        toast.error(`Failed on ${errorMessages.length} project${errorMessages.length === 1 ? "" : "s"}: ${errorMessages.join("; ")}`);
      }

      if (totalUpdated > 0) setTableSelection(new Set());
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleBulkAction = useCallback(
    (payload: { status?: string; priority?: BulkPriority; assigneeId?: string }) => {
      crossProjectBulkMutation.mutate({ ticketsByProject, ...payload });
    },
    [crossProjectBulkMutation, ticketsByProject],
  );

  const handleBulkStatus = useCallback(
    (value: string) => {
      void handleBulkAction({ status: value });
    },
    [handleBulkAction],
  );

  const handleBulkPriority = useCallback(
    (value: string) => {
      const found = toBulkPriority(value);
      if (found) void handleBulkAction({ priority: found });
    },
    [handleBulkAction],
  );

  const handleBulkAssignee = useCallback(
    (value: string) => {
      void handleBulkAction({ assigneeId: value });
    },
    [handleBulkAction],
  );

  const handleBulkCycleNoOp = useCallback((_: string) => {}, []);

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
    handleBulkCycleNoOp,
    handleClearSelection,
  };
}
