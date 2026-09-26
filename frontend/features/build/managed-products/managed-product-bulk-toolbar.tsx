"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBulkUpdateManagedProducts } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { useState } from "react";

export const MANAGED_PRODUCT_BULK_MAX = 100;

interface ManagedProductBulkToolbarProps {
  selectedIds: number[];
  onClearSelection: () => void;
}

export function ManagedProductBulkToolbar({
  selectedIds,
  onClearSelection,
}: ManagedProductBulkToolbarProps) {
  const [pendingStatus, setPendingStatus] = useState<"active" | "archived" | "">("");
  const bulk = useBulkUpdateManagedProducts();

  const cappedIds = selectedIds.slice(0, MANAGED_PRODUCT_BULK_MAX);

  function handleApply() {
    if (!pendingStatus) return;
    bulk.mutate(
      { ids: cappedIds, action: "update_status", status: pendingStatus },
      {
        onSuccess: (result) => {
          const succeeded = result.succeeded;
          const skipped = result.skipped;
          if (skipped > 0) {
            toast.success(`${succeeded} updated, ${skipped} skipped`);
          } else {
            toast.success(`${succeeded} product${succeeded !== 1 ? "s" : ""} updated`);
          }
          onClearSelection();
          setPendingStatus("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-sm"
      role="toolbar"
      aria-label={`${cappedIds.length} product${cappedIds.length !== 1 ? "s" : ""} selected`}
    >
      <span className="text-sm font-medium text-foreground">
        {cappedIds.length} selected
        {selectedIds.length > MANAGED_PRODUCT_BULK_MAX && (
          <span className="ml-1 text-muted-foreground">(capped at {MANAGED_PRODUCT_BULK_MAX})</span>
        )}
      </span>

      <Select
        value={pendingStatus}
        onValueChange={(v) => setPendingStatus(v as "active" | "archived" | "")}
      >
        <SelectTrigger className="h-8 w-36 text-sm" aria-label="Set status">
          <SelectValue placeholder="Set status…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      <LoadingButton
        size="sm"
        disabled={!pendingStatus}
        isPending={bulk.isPending}
        onClick={handleApply}
        type="button"
      >
        Apply
      </LoadingButton>

      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        type="button"
      >
        Clear
      </Button>
    </div>
  );
}
