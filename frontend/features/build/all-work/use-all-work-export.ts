"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useExportTicketSelection } from "@/hooks/api/build/ticket-import-export";
import type { AllWorkIdsSnapshot } from "./use-all-work-bulk";
import type { AllWorkTicket } from "@/types/projects";
import { downloadTextFile } from "../import-export/download-text-file";

export const EXPORT_SELECTION_LIMIT = 500;

export interface AllWorkExportGroup {
  projectId: number;
  label: string;
  ticketIds: number[];
}

export function groupSelectionByProject(
  selection: ReadonlySet<number | string>,
  tickets: readonly AllWorkTicket[],
  snapshotEntries: AllWorkIdsSnapshot["entries"] | undefined,
): AllWorkExportGroup[] {
  const labels = new Map<number, string>();
  const projectOf = new Map<number, number>();
  for (const ticket of tickets) {
    if (ticket.projectId === null) continue;
    projectOf.set(ticket.id, ticket.projectId);
    if (!labels.has(ticket.projectId)) {
      labels.set(ticket.projectId, ticket.projectName ?? ticket.projectKey ?? "Untitled project");
    }
  }
  for (const entry of snapshotEntries ?? []) {
    for (const id of entry.ids) projectOf.set(id, entry.projectId);
  }
  const grouped = new Map<number, number[]>();
  for (const raw of selection) {
    const id = Number(raw);
    const projectId = projectOf.get(id);
    if (projectId === undefined) continue;
    const ids = grouped.get(projectId);
    if (ids) ids.push(id);
    else grouped.set(projectId, [id]);
  }
  return [...grouped.entries()].map(([projectId, ticketIds]) => ({
    projectId,
    label: labels.get(projectId) ?? "Untitled project",
    ticketIds,
  }));
}

export function useAllWorkExport(
  selection: ReadonlySet<number | string>,
  tickets: readonly AllWorkTicket[],
  snapshotEntries: AllWorkIdsSnapshot["entries"] | undefined,
) {
  const [open, setOpen] = useState(false);
  const exportSelection = useExportTicketSelection();
  const groups = useMemo(
    () => (open ? groupSelectionByProject(selection, tickets, snapshotEntries) : []),
    [open, selection, tickets, snapshotEntries],
  );

  const handleOpen = useCallback(() => setOpen(true), []);

  const handleConfirm = useCallback(() => {
    exportSelection.mutate(
      groups.map((g) => ({ projectId: g.projectId, ticketIds: g.ticketIds })),
      {
        onSuccess: (results) => {
          for (const result of results) downloadTextFile(result.filename, result.contentType, result.content);
          const rows = results.reduce((sum, r) => sum + r.rowCount, 0);
          toast.success(`Exported ${rows} tickets`);
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [exportSelection, groups]);

  return { open, setOpen, groups, handleOpen, handleConfirm, isExporting: exportSelection.isPending };
}
