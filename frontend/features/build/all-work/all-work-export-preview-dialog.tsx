"use client";

import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useExportTicketsPreview } from "@/hooks/api/build/ticket-import-export";
import { EXPORT_SELECTION_LIMIT, type AllWorkExportGroup } from "./use-all-work-export";

interface AllWorkExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: readonly AllWorkExportGroup[];
  isExporting: boolean;
  onConfirm: () => void;
}

export function AllWorkExportPreviewDialog({
  open,
  onOpenChange,
  groups,
  isExporting,
  onConfirm,
}: AllWorkExportPreviewDialogProps) {
  const { data: preview, isLoading } = useExportTicketsPreview(open ? (groups[0]?.projectId ?? 0) : 0);
  const total = groups.reduce((sum, g) => sum + g.ticketIds.length, 0);
  const oversized = groups.filter((g) => g.ticketIds.length > EXPORT_SELECTION_LIMIT);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export selected tickets</DialogTitle>
          <DialogDescription>
            One CSV file is downloaded per project. Only tickets you can see are included.
          </DialogDescription>
        </DialogHeader>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">None of the selected tickets can be exported.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <ul className="space-y-1">
              {groups.map((g) => (
                <li key={g.projectId} className="flex justify-between gap-2">
                  <span className="truncate">{g.label}</span>
                  <span className="font-mono tabular-nums">{g.ticketIds.length}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span>Total</span>
              <span className="font-mono tabular-nums">{total}</span>
            </div>
            {oversized.length > 0 ? (
              <p role="alert" className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Export is limited to {EXPORT_SELECTION_LIMIT} selected tickets per project. Narrow the selection for{" "}
                {oversized.map((g) => g.label).join(", ")}.
              </p>
            ) : null}
            {preview ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{groups.length > 1 ? `Columns included (${groups[0]?.label ?? "first project"}):` : "Columns included:"}</p>
                <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {preview.columns.map((col) => (
                    <li key={col} className="truncate font-mono text-xs">{col}</li>
                  ))}
                </ul>
              </div>
            ) : isLoading ? (
              <p className="text-xs text-muted-foreground">Loading columns…</p>
            ) : null}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            isPending={isExporting}
            loadingText="Exporting…"
            onClick={onConfirm}
            disabled={groups.length === 0 || oversized.length > 0}
          >
            Export
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
