"use client";

import { cn } from "@/lib/utils";
import { Users, Scale, Sparkles } from "lucide-react";
import type { ToggleImpactResult } from "@/types/payroll/setup";

interface PolicyImpactPreviewProps {
  impact?: ToggleImpactResult | null;
  loading?: boolean;
  toggleLabel?: string;
  className?: string;
}

/**
 * Live policy impact strip — “who and what this toggle affects”
 * before the owner commits a change.
 */
export function PolicyImpactPreview({
  impact,
  loading,
  toggleLabel,
  className,
}: PolicyImpactPreviewProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-muted/30 px-3 py-2.5 animate-pulse",
          className,
        )}
      >
        <div className="h-3 w-40 bg-muted rounded" />
        <div className="h-3 w-56 bg-muted rounded mt-2" />
      </div>
    );
  }

  if (!impact) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--payroll-ledger)]/25 bg-[color-mix(in_srgb,var(--payroll-ledger)_6%,transparent)] px-3 py-2.5 space-y-2",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold payroll-ledger-text">
        <Sparkles className="h-3.5 w-3.5" />
        Impact preview{toggleLabel ? ` · ${toggleLabel}` : ""}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="payroll-money font-semibold">{impact.affectedEmployeeCount}</span>
          <span className="text-muted-foreground">employees affected</span>
        </span>
        {impact.affectedStatutoryCodes.length > 0 ? (
          <span className="inline-flex items-start gap-1.5 min-w-0">
            <Scale className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="text-muted-foreground">Statutory: </span>
              <span className="font-medium">
                {impact.affectedStatutoryCodes.slice(0, 6).join(", ")}
                {impact.affectedStatutoryCodes.length > 6
                  ? ` +${impact.affectedStatutoryCodes.length - 6}`
                  : ""}
              </span>
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">No statutory codes impacted</span>
        )}
      </div>
    </div>
  );
}
