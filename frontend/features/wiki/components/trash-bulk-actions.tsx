"use client";

import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KbRotateCcwIcon, KbTrash2Icon } from "@/features/wiki/lib/kb-icons";
import type { BulkPageResult } from "@/hooks/api/kb/pages";

type Selection = Set<string | number>;

export function reportTrashBulkResult(
  result: BulkPageResult,
  action: "restore" | "purge",
  setSelected: Dispatch<SetStateAction<Selection>>,
) {
  const succeeded = result.results.filter((item) => item.result === "succeeded");
  const succeededIds = new Set(succeeded.map((item) => item.pageId));
  const failedCount = result.results.length - succeeded.length;
  if (succeeded.length > 0) {
    const verb = action === "restore" ? "Restored" : "Permanently deleted";
    toast.success(`${verb} ${succeeded.length} page${succeeded.length === 1 ? "" : "s"}`);
  }
  if (failedCount > 0) {
    const verb = action === "restore" ? "restored" : "permanently deleted";
    toast.error(`${failedCount} page${failedCount === 1 ? "" : "s"} could not be ${verb}`);
  }
  setSelected((previous) => new Set([...previous].filter((id) => !succeededIds.has(Number(id)))));
}

interface TrashBulkActionsProps {
  selectedCount: number;
  pageCount: number;
  canPurge: boolean;
  canManageSettings: boolean;
  restoring: boolean;
  purging: boolean;
  emptying: boolean;
  onRestore: () => void;
  onPurge: () => void;
  onEmpty: () => void;
}

export function TrashBulkActions({
  selectedCount,
  pageCount,
  canPurge,
  canManageSettings,
  restoring,
  purging,
  emptying,
  onRestore,
  onPurge,
  onEmpty,
}: TrashBulkActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {selectedCount > 0 && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={onRestore} disabled={restoring}>
            <KbRotateCcwIcon className="mr-1.5 h-3.5 w-3.5" />
            Restore {selectedCount}
          </Button>
          {canPurge && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={purging}
              onClick={onPurge}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <KbTrash2Icon className="mr-1.5 h-3.5 w-3.5" />
              Purge {selectedCount}
            </Button>
          )}
        </>
      )}
      {canPurge && canManageSettings && pageCount > 0 && selectedCount === 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEmpty}
          disabled={emptying}
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          Empty Trash
        </Button>
      )}
    </div>
  );
}
