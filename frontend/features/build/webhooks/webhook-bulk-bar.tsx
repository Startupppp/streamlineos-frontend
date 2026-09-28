"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { XIcon } from "@animateicons/react/lucide";
import { PM_TOOLBAR } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

interface WebhookBulkBarProps {
  selectedCount: number;
  canEnable: boolean;
  canDisable: boolean;
  isPending: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function WebhookBulkBar({
  selectedCount,
  canEnable,
  canDisable,
  isPending,
  onEnable,
  onDisable,
  onDelete,
  onClear,
}: WebhookBulkBarProps) {
  return (
    <div
      role="region"
      aria-label="Webhook bulk actions"
      className={cn(
        PM_TOOLBAR,
        "mb-2 gap-2 border-b border-border bg-background/95 py-1.5",
      )}
    >
      <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-dense font-semibold tabular-nums text-primary">
        {selectedCount} selected
      </span>
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide sm:ml-auto [&>*]:shrink-0">
        <Button
          variant="outline"
          size="sm"
          disabled={!canEnable || isPending}
          onClick={onEnable}
        >
          Enable
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canDisable || isPending}
          onClick={onDisable}
        >
          Disable
        </Button>
        <ConfirmDialog
          title={`Delete ${selectedCount} webhook${selectedCount === 1 ? "" : "s"}?`}
          description="Deliveries will stop immediately. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={onDelete}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          className="px-0"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <XIcon size={14} />
        </Button>
      </div>
    </div>
  );
}
