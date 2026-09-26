"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { PM_TOOLBAR } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

interface ApprovalBulkActionBarProps {
  selectedCount: number;
  isPending: boolean;
  onCancelSelected: () => void;
  onClear: () => void;
}

export function ApprovalBulkActionBar({
  selectedCount,
  isPending,
  onCancelSelected,
  onClear,
}: ApprovalBulkActionBarProps) {
  const canManage = useCan("build:approvals:manage");
  if (!canManage) return null;
  return (
    <div
      className={cn(
        PM_TOOLBAR,
        "sticky top-0 z-10 mb-2 gap-2 border-b border-border bg-background/95 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-dense font-semibold tabular-nums text-primary">
        {selectedCount} selected
      </span>
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:ml-auto [&>*]:shrink-0">
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={onCancelSelected}
          isPending={isPending}
          loadingText="Cancelling…"
        >
          Cancel selected
        </LoadingButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
