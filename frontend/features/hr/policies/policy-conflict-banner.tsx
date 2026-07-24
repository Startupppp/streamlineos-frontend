"use client";

import { AlertTriangle } from "lucide-react";
import { usePolicyConflicts, type PolicyConflict } from "@/hooks/api/hr/policies";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  policyId: number;
  className?: string;
}

function ConflictList({ conflicts }: { conflicts: PolicyConflict[] }) {
  if (conflicts.length === 0) {
    return (
      <p className="text-xs text-emerald-700 dark:text-emerald-300">
        No overlapping active policies detected for this draft.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {conflicts.map((c) => (
        <li
          key={`${c.policyId}-${c.otherPolicyId}-${c.severity}`}
          className="text-xs leading-relaxed"
        >
          <span
            className={cn(
              "font-medium",
              c.severity === "blocking"
                ? "text-destructive"
                : "text-amber-700 dark:text-amber-300",
            )}
          >
            {c.severity === "blocking" ? "Blocking" : "Warning"}:
          </span>{" "}
          <span className="text-muted-foreground">
            overlaps with &ldquo;{c.otherPolicyName}&rdquo; — {c.reason}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PolicyConflictBanner({ policyId, className }: Props) {
  const { data, isLoading, isError } = usePolicyConflicts(policyId);

  if (policyId <= 0) return null;

  if (isLoading) {
    return <Skeleton className={cn("h-16 w-full rounded-lg", className)} />;
  }

  if (isError || !data) return null;

  const hasBlocking = data.conflicts.some((c) => c.severity === "blocking");
  const hasAny = data.conflicts.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        hasBlocking
          ? "border-destructive/40 bg-destructive/5"
          : hasAny
            ? "border-amber-300/60 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/5"
            : "border-emerald-300/50 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/5",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <AlertTriangle
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            hasBlocking
              ? "text-destructive"
              : hasAny
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400",
          )}
        />
        <p className="text-xs font-semibold text-foreground">
          {hasBlocking
            ? "Cannot activate — resolve policy conflicts"
            : hasAny
              ? "Overlapping policies (higher priority wins)"
              : "Ready to activate"}
        </p>
      </div>
      <ConflictList conflicts={data.conflicts} />
      {!data.canActivate && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Equal-priority overlaps are blocked. Raise priority, narrow scopes, or force-activate only
          if intentional.
        </p>
      )}
    </div>
  );
}
