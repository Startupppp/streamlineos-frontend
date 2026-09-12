"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

export type SeriesScope = "occurrence" | "series";

interface EventSeriesScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: SeriesScope) => void;
  isPending: boolean;
}

export function EventSeriesScopeDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: EventSeriesScopeDialogProps) {
  const [scope, setScope] = useState<SeriesScope>("series");

  const handleOccurrenceChange = useCallback(() => setScope("occurrence"), []);
  const handleSeriesChange = useCallback(() => setScope("series"), []);

  const handleConfirm = useCallback(() => {
    onConfirm(scope);
  }, [onConfirm, scope]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isPending) onOpenChange(open);
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit recurring event</DialogTitle>
          <DialogDescription className="text-xs">
            This is a recurring event. Which occurrences do you want to change?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="radio"
              name="series-scope"
              value="occurrence"
              checked={scope === "occurrence"}
              onChange={handleOccurrenceChange}
              className="accent-primary"
            />
            This occurrence only
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="radio"
              name="series-scope"
              value="series"
              checked={scope === "series"}
              onChange={handleSeriesChange}
              className="accent-primary"
            />
            All occurrences
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            isPending={isPending}
            loadingText="Saving…"
            onClick={handleConfirm}
            className="text-xs"
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
