"use client";

import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorReference } from "@/components/shared/error-reference";
import { KbRotateCcwIcon, KbTrash2Icon } from "@/features/wiki/lib/kb-icons";
import type { BulkPageResult } from "@/hooks/api/kb/pages";
import { getErrorMessage } from "@/lib/get-error-message";

type Selection = Set<string | number>;

type FailedResult = Exclude<
  BulkPageResult["results"][number]["result"],
  "succeeded"
>;

const FAILURE_REASONS: Record<
  "restore" | "purge",
  Record<FailedResult, string>
> = {
  restore: {
    conflict: "changed since you selected it",
    notFound: "no longer in Trash",
    denied: "you do not have permission",
  },
  purge: {
    conflict:
      "is on legal hold, has a child file outside Trash, or changed since you selected it",
    notFound: "no longer in Trash",
    denied: "you do not have permission",
  },
};

function describeFailures(
  failed: BulkPageResult["results"],
  action: "restore" | "purge",
): string {
  const counts = new Map<FailedResult, number>();
  for (const item of failed) {
    if (item.result !== "succeeded")
      counts.set(item.result, (counts.get(item.result) ?? 0) + 1);
  }
  const reasons = [...counts].map(
    ([result, count]) => `${count}: ${FAILURE_REASONS[action][result]}`,
  );
  return `${reasons.join("; ")}. They are still selected so you can try again.`;
}

export function reportTrashBulkResult(
  result: BulkPageResult,
  action: "restore" | "purge",
  setSelected: Dispatch<SetStateAction<Selection>>,
) {
  const succeeded = result.results.filter(
    (item) => item.result === "succeeded",
  );
  const succeededIds = new Set(succeeded.map((item) => item.pageId));
  const failed = result.results.filter((item) => item.result !== "succeeded");
  const failedCount = failed.length;
  if (succeeded.length > 0) {
    const verb = action === "restore" ? "Restored" : "Permanently deleted";
    toast.success(
      `${verb} ${succeeded.length} page${succeeded.length === 1 ? "" : "s"}`,
    );
  }
  if (failedCount > 0) {
    const verb = action === "restore" ? "restored" : "permanently deleted";
    toast.error(
      `${failedCount} page${failedCount === 1 ? "" : "s"} could not be ${verb}`,
      {
        description: describeFailures(failed, action),
      },
    );
  }
  setSelected(
    (previous) =>
      new Set([...previous].filter((id) => !succeededIds.has(Number(id)))),
  );
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRestore}
            disabled={restoring}
          >
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
      {canPurge &&
        canManageSettings &&
        pageCount > 0 &&
        selectedCount === 0 && (
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

interface TrashEmptyConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageCount: number;
  hasMore: boolean;
  isPending: boolean;
  error: unknown;
  onConfirm: () => void;
}

export function TrashEmptyConfirmation({
  open,
  onOpenChange,
  pageCount,
  hasMore,
  isPending,
  error,
  onConfirm,
}: TrashEmptyConfirmationProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Empty the trash?"
      description={
        hasMore
          ? "This permanently deletes every file currently in the trash, not just the ones shown on this page. This cannot be undone."
          : `All ${pageCount} page${pageCount === 1 ? "" : "s"} in the trash will be permanently deleted. This cannot be undone.`
      }
      content={
        error ? (
          <div role="alert" className="text-sm text-destructive">
            {getErrorMessage(error)}
            <ErrorReference error={error} />
          </div>
        ) : undefined
      }
      confirmLabel="Empty Trash"
      destructive
      keepOpenOnConfirm
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}

interface TrashBulkPurgeConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  description: string;
  canPurge: boolean;
  impactLoading: boolean;
  impactError: boolean;
  impactAvailable: boolean;
  impactReadError: unknown;
  writeError: unknown;
  canConfirm: boolean;
  isPending: boolean;
  onRetryImpact: () => void;
  onConfirm: () => void;
}

export function TrashBulkPurgeConfirmation({
  open,
  onOpenChange,
  selectedCount,
  description,
  canPurge,
  impactLoading,
  impactError,
  impactAvailable,
  impactReadError,
  writeError,
  canConfirm,
  isPending,
  onRetryImpact,
  onConfirm,
}: TrashBulkPurgeConfirmationProps) {
  const impactFailure =
    canPurge && !impactLoading && (impactError || !impactAvailable);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Permanently delete ${selectedCount} page${selectedCount === 1 ? "" : "s"}?`}
      description={description}
      content={
        writeError || impactFailure ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            {writeError ? (
              <>
                {getErrorMessage(writeError)}
                <ErrorReference error={writeError} />
              </>
            ) : null}
            {impactError && <ErrorReference error={impactReadError} />}
            {impactFailure && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetryImpact}
              >
                Retry impact check
              </Button>
            )}
          </div>
        ) : undefined
      }
      confirmLabel="Delete Forever"
      destructive
      keepOpenOnConfirm
      hideConfirm={!canConfirm}
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
