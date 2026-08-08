"use client";

import { AlertTriangle, Archive } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

const DEPENDENCY_ERROR_CODE = "ORG_UNIT_HAS_DEPENDENCIES";

type Dependency = {
  key: string;
  label: string;
  count: number;
};

function parseDependencies(error: unknown): Dependency[] {
  if (!isApiError(error) || error.code !== DEPENDENCY_ERROR_CODE) return [];
  if (!error.details || typeof error.details !== "object") return [];
  const dependencies = (error.details as { dependencies?: unknown }).dependencies;
  if (!Array.isArray(dependencies)) return [];

  return dependencies.filter((item): item is Dependency => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<Dependency>;
    return (
      typeof candidate.key === "string" &&
      typeof candidate.label === "string" &&
      typeof candidate.count === "number" &&
      candidate.count > 0
    );
  });
}

interface HierarchyArchiveDialogProps {
  open: boolean;
  unitName: string;
  unitLabel: string;
  isPending: boolean;
  error: unknown;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function HierarchyArchiveDialog({
  open,
  unitName,
  unitLabel,
  isPending,
  error,
  onConfirm,
  onOpenChange,
}: HierarchyArchiveDialogProps) {
  const dependencies = parseDependencies(error);
  const isDependencyBlocked = dependencies.length > 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isDependencyBlocked
          ? `Cannot archive ${unitLabel}`
          : `Archive ${unitLabel}?`
      }
      description={
        isDependencyBlocked
          ? getErrorMessage(error)
          : `“${unitName}” will no longer be available for new assignments. Its history is preserved and you can restore it later.`
      }
      icon={
        <span
          className={
            isDependencyBlocked
              ? "flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
              : "flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          }
        >
          {isDependencyBlocked ? (
            <AlertTriangle className="size-4" aria-hidden="true" />
          ) : (
            <Archive className="size-4" aria-hidden="true" />
          )}
        </span>
      }
      content={
        isDependencyBlocked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Update these dependencies first
            </p>
            <ul className="mt-2 space-y-1.5">
              {dependencies.map((dependency) => (
                <li
                  key={dependency.key}
                  className="flex items-center justify-between gap-3 text-sm text-amber-950 dark:text-amber-100"
                >
                  <span>{dependency.label}</span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-black/20">
                    {dependency.count}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-amber-800 dark:text-amber-200/80">
              Move, close, or reassign these records and then try again. Nothing
              has been changed.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {getErrorMessage(error)}
          </div>
        ) : null
      }
      confirmLabel={error ? "Try again" : "Archive"}
      cancelLabel={isDependencyBlocked ? "Close" : "Cancel"}
      confirmIcon={<Archive className="size-4" aria-hidden="true" />}
      hideConfirm={isDependencyBlocked}
      keepOpenOnConfirm
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
