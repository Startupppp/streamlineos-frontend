"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadTextFile } from "@/features/build/import-export/download-text-file";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build/ticket-create-rank-mutations";
import type { useBulkUpdateTickets } from "@/hooks/api/build/ticket-create-rank-mutations";
import type { useExportTickets } from "@/hooks/api/build/ticket-import-export";

type BulkUpdateMutation = ReturnType<typeof useBulkUpdateTickets>;
type ExportMutation = ReturnType<typeof useExportTickets>;

type BulkUpdateFields = Partial<
  Pick<
    BulkUpdateTicketsInput,
    | "status"
    | "priority"
    | "assigneeId"
    | "cycleId"
    | "parentTicketId"
    | "labelIds"
    | "archive"
  >
>;

interface UseEpicBulkActionsOptions {
  bulkUpdate: BulkUpdateMutation;
  exportEpics: ExportMutation;
}

export function useEpicBulkActions({
  bulkUpdate,
  exportEpics,
}: UseEpicBulkActionsOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const handleEpicSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkUpdate = useCallback(
    (update: BulkUpdateFields) => {
      if (selectedIds.size === 0) {
        toast.error("No epics selected");
        return;
      }
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), ...update },
        {
          onSuccess: (d) => {
            const blockedCount = d.blocked?.length ?? 0;
            if (blockedCount > 0 && d.updated === 0) {
              toast.error(
                `${blockedCount} epic${blockedCount !== 1 ? "s" : ""} could not be changed — ${blockedCount !== 1 ? "they have" : "it has"} active sub-tasks not in the selection. Nothing was changed.`,
              );
              return;
            }
            if (blockedCount > 0) {
              toast.warning(
                `${d.updated} updated, ${blockedCount} could not be changed — ${blockedCount !== 1 ? "they have" : "it has"} active sub-tasks not in the selection.`,
              );
              handleClearSelection();
              return;
            }
            toast.success(
              `${d.updated} epic${d.updated !== 1 ? "s" : ""} updated`,
            );
            handleClearSelection();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [selectedIds, bulkUpdate, handleClearSelection],
  );

  const handleBulkStatus = useCallback(
    (v: string) => handleBulkUpdate({ status: v }),
    [handleBulkUpdate],
  );
  const handleBulkPriority = useCallback(
    (v: string) => {
      const priority = toBulkPriority(v);
      if (priority) handleBulkUpdate({ priority });
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
  const handleBulkParent = useCallback(
    (parentTicketId: number | null) => handleBulkUpdate({ parentTicketId }),
    [handleBulkUpdate],
  );
  const handleBulkLabel = useCallback(
    (labelId: string) => handleBulkUpdate({ labelIds: [Number(labelId)] }),
    [handleBulkUpdate],
  );
  const handleBulkArchiveRequest = useCallback(
    () => setArchiveConfirmOpen(true),
    [],
  );
  const handleArchiveDialogChange = useCallback(
    (open: boolean) => setArchiveConfirmOpen(open),
    [],
  );
  const handleBulkArchiveConfirm = useCallback(() => {
    handleBulkUpdate({ archive: true });
    setArchiveConfirmOpen(false);
  }, [handleBulkUpdate]);

  const handleBulkExport = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error("No epics selected");
      return;
    }
    exportEpics.mutate(
      { format: "csv", ticketIds: [...selectedIds].map(Number) },
      {
        onSuccess: (result) => {
          downloadTextFile(result.filename, result.contentType, result.content);
          toast.success(
            `Exported ${result.rowCount} epic${result.rowCount !== 1 ? "s" : ""}`,
          );
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [exportEpics, selectedIds]);

  return {
    selectedIds,
    archiveConfirmOpen,
    handleEpicSelection,
    handleClearSelection,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
    handleBulkParent,
    handleBulkLabel,
    handleBulkArchiveRequest,
    handleArchiveDialogChange,
    handleBulkArchiveConfirm,
    handleBulkExport,
  };
}
