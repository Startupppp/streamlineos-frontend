"use client";

import { AlertTriangle } from "lucide-react";
import { usePolicyConflicts, type PolicyConflict } from "@/hooks/api/hr/policies";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCanState } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface Props {
  policyId: number;
  className?: string;
}

function ConflictList({ conflicts }: { conflicts: PolicyConflict[] }) {
  if (conflicts.length === 0) {
    return (
      <p className="text-xs text-status-success-ink">
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
                : "text-status-warning-ink",
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
  const { data, isLoading, isError, error, refetch } = usePolicyConflicts(policyId);
  const viewAccess = useCanState("hr:policies:view");

  function handleRetry(): void {
    void refetch();
  }

  if (policyId <= 0) return null;

  if (viewAccess === "denied") {
    return <NoPermissionState compact permission="hr:policies:view" className={className} />;
  }

  if (isLoading || viewAccess === "loading") {
    return <Skeleton className={cn("h-16 w-full rounded-lg", className)} />;
  }

  if (isError) {
    return (
      <div className={cn("rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5", className)}>
        <ErrorState
          compact
          className="border-0 bg-transparent shadow-none"
          title="Couldn't check policy conflicts"
          description={getErrorMessage(error)}
          error={error}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2.5", className)}>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-status-warning-ink" />
          <p className="text-xs font-semibold text-foreground">Policy conflicts not checked</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          This draft has not been checked for overlapping active policies, so treat the absence of a
          conflict warning as unknown rather than clear.
        </p>
      </div>
    );
  }

  const hasBlocking = data.conflicts.some((c) => c.severity === "blocking");
  const hasAny = data.conflicts.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        hasBlocking
          ? "border-destructive/40 bg-destructive/5"
          : hasAny
            ? "border-status-warning-rule bg-status-warning-surface"
            : "border-status-success-rule bg-status-success-surface",
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
                ? "text-status-warning-ink"
                : "text-status-success-ink",
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
        <p className="mt-2 text-dense text-muted-foreground">
          Equal-priority overlaps are blocked. Raise priority, narrow scopes, or force-activate only
          if intentional.
        </p>
      )}
    </div>
  );
}
