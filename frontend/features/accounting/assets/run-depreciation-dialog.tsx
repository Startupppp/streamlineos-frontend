"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { runDepreciationSchema, type RunFormValues } from "./depreciation-schema";

interface RunDepreciationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RunFormValues) => void;
  isSubmitting: boolean;
}

export function RunDepreciationDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: RunDepreciationDialogProps) {
  return (
    <EntityFormDialog<RunFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Run Depreciation"
      description="Create depreciation entries for all active assets in the selected period."
      resolver={zodResolver(runDepreciationSchema)}
      defaultValues={{ periodKey: "" }}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Run Depreciation"
      resetOnOpen
    >
      {(form) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="run-period">Period</Label>
            <Input
              id="run-period"
              {...form.register("periodKey")}
              placeholder="2025-01"
              className="font-mono"
            />
            {form.formState.errors.periodKey && (
              <p className="text-xs text-destructive">
                {form.formState.errors.periodKey.message}
              </p>
            )}
          </div>
          <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2.5 text-xs text-foreground">
            This will create depreciation journal entries for all active assets
            in the specified period. Ensure the period has not been run
            previously.
          </div>
        </>
      )}
    </EntityFormDialog>
  );
}
