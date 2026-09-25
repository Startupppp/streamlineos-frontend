"use client";

import { AlertTriangle } from "lucide-react";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface ReportingLineChangeWarningProps {
  changesLast24h: number;
  threshold: number;
  /** The viewer holds elevated authority (override / HR or org admin). */
  canOverride: boolean;
}

/**
 * PRD D4: the change past the org's 24-hour threshold is a soft guard, not a
 * lock — it warns, needs a reason, and needs an HR or org admin to save.
 */
export function ReportingLineChangeWarning({ changesLast24h, threshold, canOverride }: ReportingLineChangeWarningProps) {
  const tone = statusToneClasses("warning");
  return (
    <div role="status" className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", tone.surface, tone.ink, tone.rule)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">
          This employee&apos;s primary manager has changed <span className="tabular-nums">{changesLast24h}</span>{" "}
          {changesLast24h === 1 ? "time" : "times"} in the last 24 hours (limit <span className="tabular-nums">{threshold}</span>).
        </p>
        <p>
          {canOverride
            ? "Another change needs a reason of at least 10 characters. It is recorded against your name."
            : "Another change needs a reason and an HR or org admin. Ask one to make this change."}
        </p>
      </div>
    </div>
  );
}
