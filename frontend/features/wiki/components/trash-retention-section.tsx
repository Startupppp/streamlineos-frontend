"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useKbSettings, useUpdateKbSettings } from "@/hooks/api/kb/settings";

export function TrashRetentionSection() {
  const { data: settings, isLoading, isError, error, refetch } = useKbSettings();
  const updateSettings = useUpdateKbSettings();
  const [value, setValue] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const currentValue = settings?.trashRetentionDays ?? 30;

  function handleEdit() {
    setValue(String(currentValue));
    setEditing(true);
  }

  function handleRetry() {
    void refetch();
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSave() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 365) {
      toast.error("Retention period must be between 1 and 365 days");
      return;
    }
    updateSettings.mutate(
      { trashRetentionDays: parsed },
      {
        onSuccess: () => {
          toast.success("Trash retention updated");
          setEditing(false);
        },
        onError: () => toast.error("Failed to update settings"),
      },
    );
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }

  if (isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load retention"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <section
      aria-labelledby="trash-retention-heading"
      className="rounded-lg border border-border bg-card px-3 py-2.5"
    >
      {editing ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2
            id="trash-retention-heading"
            className="mr-auto text-sm font-medium text-foreground"
          >
            Auto-purge after
          </h2>
          <Input
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            value={value}
            onChange={handleValueChange}
            onKeyDown={handleKeyDown}
            aria-label="Retention days"
            className="h-8 w-16 text-right tabular-nums"
            autoFocus
          />
          <span className="text-dense text-muted-foreground">days</span>
          <LoadingButton
            type="button"
            size="sm"
            className="h-8"
            onClick={handleSave}
            isPending={updateSettings.isPending}
            loadingText="Saving…"
          >
            Save
          </LoadingButton>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={handleCancel}
            disabled={updateSettings.isPending}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="trash-retention-heading"
              className="text-sm font-medium text-foreground"
            >
              Auto-purge after
            </h2>
            <p className="text-dense text-muted-foreground">
              Older deleted pages are removed daily.
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-5 w-14 shrink-0" />
          ) : (
            <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
              {currentValue} days
            </p>
          )}
          <MobileOnlyLabelTooltip label="Edit">
            <Button
              type="button"
              variant="outline"
              className={cn(RESPONSIVE_ICON_LABEL_TRIGGER_CLASS, "size-8 md:h-8 md:w-auto")}
              onClick={handleEdit}
              disabled={isLoading}
              aria-label="Edit auto-purge retention"
            >
              <Pencil className="size-3.5 shrink-0" aria-hidden="true" />
              <ResponsiveIconLabelText>Edit</ResponsiveIconLabelText>
            </Button>
          </MobileOnlyLabelTooltip>
        </div>
      )}
    </section>
  );
}
