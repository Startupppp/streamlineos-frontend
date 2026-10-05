"use client";

import { useCallback, useState } from "react";
import { useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import { useExportTickets } from "@/hooks/api/build/ticket-import-export";
import { downloadTextFile } from "@/features/build/import-export/download-text-file";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build/tickets";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface UseProjectBoardBulkActionsProps {
  projectId: number;
  selectedIds: Set<string | number>;
  onClearSelection: () => void;
}

interface UseProjectBoardBulkActionsReturn {
  handleBulkStatus: (v: string) => void;
  handleBulkPriority: (v: string) => void;
  handleBulkAssignee: (v: string) => void;
  handleBulkCycle: (v: string) => void;
  handleBulkParent: (parentTicketId: number | null) => void;
  handleBulkLabel: (labelId: string) => void;
  handleBulkArchiveRequest: () => void;
  handleBulkArchiveConfirm: () => void;
  handleBulkExport: () => void;
  archiveConfirmOpen: boolean;
  handleArchiveDialogChange: (open: boolean) => void;
  isBulkPending: boolean;
}

export function useProjectBoardBulkActions({
  projectId,
  selectedIds,
  onClearSelection,
}: UseProjectBoardBulkActionsProps): UseProjectBoardBulkActionsReturn {
  const bulkUpdate = useBulkUpdateTickets(projectId);
  const exportMutation = useExportTickets(projectId);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

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
          | "labelIds"
          | "archive"
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
            const blockedCount = d.blocked?.length ?? 0;
            if (blockedCount > 0 && d.updated === 0) {
              toast.error(
                `${blockedCount} ticket${blockedCount !== 1 ? "s" : ""} could not be archived — ${blockedCount !== 1 ? "they have" : "it has"} active sub-tasks not in the selection. Nothing was changed.`,
              );
              return;
            }
            if (blockedCount > 0) {
              toast.warning(
                `${d.updated} archived, ${blockedCount} could not be archived — ${blockedCount !== 1 ? "they have" : "it has"} active sub-tasks not in the selection.`,
              );
              onClearSelection();
              return;
            }
            toast.success(
              `${d.updated} ticket${d.updated !== 1 ? "s" : ""} updated`,
            );
            onClearSelection();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [selectedIds, bulkUpdate, onClearSelection],
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
  const handleBulkLabel = useCallback(
    (labelId: string) => handleBulkUpdate({ labelIds: [Number(labelId)] }),
    [handleBulkUpdate],
  );
  const handleBulkArchiveRequest = useCallback(
    () => setArchiveConfirmOpen(true),
    [],
  );
  const handleBulkArchiveConfirm = useCallback(() => {
    handleBulkUpdate({ archive: true });
    setArchiveConfirmOpen(false);
  }, [handleBulkUpdate]);
  const handleArchiveDialogChange = useCallback(
    (open: boolean) => setArchiveConfirmOpen(open),
    [],
  );

  const handleBulkExport = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error("No tickets selected");
      return;
    }
    exportMutation.mutate(
      { format: "csv", ticketIds: [...selectedIds].map(Number) },
      {
        onSuccess: (result) => {
          downloadTextFile(result.filename, result.contentType, result.content);
          toast.success(
            `Exported ${result.rowCount} ticket${result.rowCount !== 1 ? "s" : ""}`,
          );
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [selectedIds, exportMutation]);

  return {
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
    handleBulkParent,
    handleBulkLabel,
    handleBulkArchiveRequest,
    handleBulkArchiveConfirm,
    handleBulkExport,
    archiveConfirmOpen,
    handleArchiveDialogChange,
    isBulkPending: bulkUpdate.isPending,
  };
}
