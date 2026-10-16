"use client";

import { useState, useCallback } from "react";
import { AppDialog } from "@/components/shared/app-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  const handleScopeChange = useCallback((value: string) => {
    if (value === "occurrence" || value === "series") setScope(value);
  }, []);

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
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit recurring event"
      description="This is a recurring event. Which occurrences do you want to change?"
      className="sm:max-w-xs"
      footer={
        <>
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
        </>
      }
    >
      <RadioGroup value={scope} onValueChange={handleScopeChange} className="gap-2">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="occurrence" id="series-scope-occurrence" />
          <Label htmlFor="series-scope-occurrence" className="text-xs font-normal">
            This occurrence only
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="series" id="series-scope-series" />
          <Label htmlFor="series-scope-series" className="text-xs font-normal">
            All occurrences
          </Label>
        </div>
      </RadioGroup>
    </AppDialog>
  );
}
