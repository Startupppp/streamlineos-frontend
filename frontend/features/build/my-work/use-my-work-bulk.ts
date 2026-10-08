"use client";

import { useMemo, useCallback, useState } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";
import type { BulkPriority } from "@/features/build/shared/bulk-priority";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { isWriteConflict } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { getErrorMessage } from "@/lib/get-error-message";
import { lazyContract } from "@/lib/api-envelope";
import type { AllWorkTicket } from "@/types/projects";
import type {
  BuildListSortField,
  BuildListSortDirection,
} from "@/features/build/shared/use-build-list-url-state";
import {
  patchAllWorkCollections,
  revalidateAllWorkCollections,
  restoreAllWorkCollections,
  type AllWorkSnapshots,
} from "@/hooks/api/build/ticket-cache";

const bulkUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.bulkUpdateResultContract,
  ),
);

interface BulkPayload {
  ticketsByProject: Map<number, AllWorkTicket[]>;
  status?: string;
  priority?: BulkPriority;
  assigneeId?: string;
}

interface BulkProjectResult {
  projectId: number;
  ticketIds: number[];
  versions?: Record<string, number>;
  updatedAt?: string;
}

interface BulkFanOutResult {
  succeeded: BulkProjectResult[];
  failed: { projectId: number; reason: unknown }[];
}

async function fanOutBulk(payload: BulkPayload): Promise<BulkFanOutResult> {
  const entries = [...payload.ticketsByProject.entries()];
  const calls = [...payload.ticketsByProject.entries()].map(
    ([projectId, tickets]) =>
      apiClient
        .post<{
          updated: number;
          ticketIds: number[];
          versions?: Record<string, number>;
          updatedAt?: string;
        }>(
          `/build/${projectId}/tickets/bulk`,
          {
            ticketIds: tickets.map((ticket) => ticket.id),
            status: payload.status,
            priority: payload.priority,
            assigneeId: payload.assigneeId,
            versions: Object.fromEntries(
              tickets.map((ticket) => [ticket.id, ticket.version]),
            ),
          },
          undefined,
          bulkUpdateResultLazy,
        )
        .then((response) => ({ ...response, projectId })),
  );

  const results = await Promise.allSettled(calls);

  const succeeded = results.flatMap((result) =>
    result.status === "fulfilled" && result.value.updated > 0
      ? [
          {
            projectId: result.value.projectId,
            ticketIds: result.value.ticketIds,
            versions: result.value.versions,
            updatedAt: result.value.updatedAt,
          },
        ]
      : [],
  );
  const failed = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ projectId: entries[index][0], reason: result.reason }]
      : [],
  );

  const totalUpdated = succeeded.reduce(
    (acc, result) => acc + result.ticketIds.length,
    0,
  );

  const conflicts = failed.filter((result) => isWriteConflict(result.reason));
  const otherFailures = failed.filter(
    (result) => !isWriteConflict(result.reason),
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

  return { succeeded, failed };
}

export interface UseMyWorkBulkReturn {
  tableSelection: Set<string | number>;
  setTableSelection: React.Dispatch<React.SetStateAction<Set<string | number>>>;
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
  const sortKey = `${sortField}:${sortDirection}`;
  const [tableSelection, setTableSelection] = useSourceOverride<
    string,
    Set<string | number>
  >(sortKey, new Set());
  const [isPendingBulk, setIsPendingBulk] = useState(false);

  const selectedTicketIds = useMemo(
    () => [...tableSelection].map((id) => Number(id)),
    [tableSelection],
  );

  const selectedTickets = useMemo(
    () => tickets.filter((t) => selectedTicketIds.includes(t.id)),
    [tickets, selectedTicketIds],
  );

  const ticketsByProject = useMemo(() => {
    const map = new Map<number, AllWorkTicket[]>();
    for (const t of selectedTickets) {
      if (t.projectId === null) continue;
      const existing = map.get(t.projectId);
      if (existing) existing.push(t);
      else map.set(t.projectId, [t]);
    }
    return map;
  }, [selectedTickets]);

  const handleBulkAction = useCallback(
    async (partial: {
      status?: string;
      priority?: BulkPriority;
      assigneeId?: string;
    }) => {
      if (ticketsByProject.size === 0) return;
      setIsPendingBulk(true);
      await queryClient.cancelQueries({
        queryKey: buildWorkQueryKeys.projects.allWorkAll,
      });
      const snapshots = new Map<number, AllWorkSnapshots>();
      for (const [projectId, projectTickets] of ticketsByProject) {
        const selected = new Set(projectTickets.map((ticket) => ticket.id));
        snapshots.set(
          projectId,
          patchAllWorkCollections(queryClient, projectId, (ticket) =>
            selected.has(ticket.id)
              ? {
                  ...ticket,
                  ...(partial.status !== undefined
                    ? { status: partial.status }
                    : {}),
                  ...(partial.priority !== undefined
                    ? { priority: partial.priority }
                    : {}),
                  ...(partial.assigneeId !== undefined
                    ? { assigneeId: partial.assigneeId, assignee: null }
                    : {}),
                  updatedAt: new Date().toISOString(),
                }
              : ticket,
          ),
        );
      }
      void fanOutBulk({ ticketsByProject, ...partial })
        .then(({ succeeded, failed }) => {
          for (const failure of failed) {
            restoreAllWorkCollections(
              queryClient,
              snapshots.get(failure.projectId) ?? [],
            );
          }
          for (const success of succeeded) {
            const updated = new Set(success.ticketIds);
            patchAllWorkCollections(queryClient, success.projectId, (ticket) =>
              updated.has(ticket.id)
                ? {
                    ...ticket,
                    version:
                      success.versions?.[String(ticket.id)] ?? ticket.version,
                    updatedAt: success.updatedAt ?? ticket.updatedAt,
                  }
                : ticket,
            );
            revalidateAllWorkCollections(
              queryClient,
              snapshots.get(success.projectId) ?? [],
            );
          }
          const failedIds = new Set(
            failed.flatMap((failure) =>
              (ticketsByProject.get(failure.projectId) ?? []).map(
                (ticket) => ticket.id,
              ),
            ),
          );
          setTableSelection(
            new Set([...tableSelection].filter((id) => failedIds.has(Number(id)))),
          );
        })
        .finally(() => setIsPendingBulk(false));
    },
    [ticketsByProject, queryClient, setTableSelection, tableSelection],
  );

  const handleBulkStatus = useCallback(
    (value: string) => handleBulkAction({ status: value }),
    [handleBulkAction],
  );

  const handleBulkPriority = useCallback(
    (value: string) => {
      const found = toBulkPriority(value);
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
    [setTableSelection],
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
