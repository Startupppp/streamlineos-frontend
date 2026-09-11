"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbSettings, useUpdateKbSettings } from "@/hooks/api/kb/settings";
import { KbTrash2Icon } from "@/features/wiki/lib/kb-icons";
import { SectionCard, SectionHeader } from "./knowledge-settings-sections";


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

  return (
    <SectionCard>
      <SectionHeader
        title="Trash retention"
        description="Pages in the Recycle Bin are automatically purged after the configured number of days."
      />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
          <KbTrash2Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Auto-purge after</p>
          <p className="text-xs text-muted-foreground">
            Deleted pages older than this threshold are permanently removed by a daily job.
          </p>
        </div>
        {isLoading ? (
          <div className="w-20 animate-pulse rounded-md bg-muted shrink-0" />
        ) : isError ? (
          <ErrorState
            compact
            className="shrink-0"
            title="Couldn't load retention"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : editing ? (
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              min={1}
              max={365}
              value={value}
              onChange={handleValueChange}
              onKeyDown={handleKeyDown}
              className="w-20 text-sm text-right"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">days</span>
            <Button size="sm" className="text-xs" onClick={handleSave} disabled={updateSettings.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium tabular-nums text-foreground">
              {currentValue} days
            </span>
            <Button size="sm" variant="ghost" className="text-xs" onClick={handleEdit}>
              Edit
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

