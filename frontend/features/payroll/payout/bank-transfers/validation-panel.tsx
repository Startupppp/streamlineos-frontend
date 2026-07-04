"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePayoutValidation } from "@/hooks/api/payroll/payout-batches";

interface ValidationPanelProps {
  runId: number;
}

export function ValidationPanel({ runId }: ValidationPanelProps) {
  const { data, isLoading } = usePayoutValidation(runId);

  const blockers = data?.filter((item) => item.errors.length > 0) ?? [];
  const warnings = data?.filter((item) => item.warnings.length > 0 && item.errors.length === 0) ?? [];
  const hasBlockers = blockers.length > 0;

  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const isExpanded = openOverride !== null ? openOverride : hasBlockers;

  function handleToggle() {
    setOpenOverride(!isExpanded);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
        Bank Validation
        {hasBlockers && (
          <span className="ml-1 text-xs font-medium text-red-600">({blockers.length} blockers)</span>
        )}
      </button>

      {isExpanded && (
        <div className="border border-border rounded-lg overflow-hidden">
          {!data || (!hasBlockers && warnings.length === 0) ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-700 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All employees ready for payout
            </div>
          ) : (
            <>
              {hasBlockers && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-border">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="text-xs font-semibold text-red-700">
                      {blockers.length} employee(s) with errors
                    </span>
                  </div>
                  {blockers.map((item) => (
                    <div
                      key={item.userId}
                      className="flex items-start gap-3 px-4 py-2.5 border-b border-border last:border-b-0 text-sm"
                    >
                      <span className="font-medium text-foreground min-w-[140px] shrink-0">
                        {item.employeeName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {item.maskedAccount
                          ? `${item.maskedAccount} · ${item.schemeLabel}`
                          : `No account · ${item.schemeLabel}`}
                      </span>
                      <div className="flex flex-wrap gap-1 ml-auto">
                        {item.errors.map((err, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700"
                          >
                            {err}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {warnings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-border">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-semibold text-amber-700">
                      {warnings.length} employee(s) with warnings
                    </span>
                  </div>
                  {warnings.map((item) => (
                    <div
                      key={item.userId}
                      className="flex items-start gap-3 px-4 py-2.5 border-b border-border last:border-b-0 text-sm"
                    >
                      <span className="font-medium text-foreground min-w-[140px] shrink-0">
                        {item.employeeName}
                      </span>
                      <div className="flex flex-wrap gap-1 ml-auto">
                        {item.warnings.map((w, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
