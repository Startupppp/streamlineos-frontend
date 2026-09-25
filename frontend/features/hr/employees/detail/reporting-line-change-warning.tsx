"use client";

import { AlertTriangle } from "lucide-react";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { CHANGE_REASON_MIN_CHARS } from "./reporting-line-editor-schema";

interface ReportingLineChangeWarningProps {
  changesLast24h: number;
  threshold: number;
  /** The viewer holds elevated authority (override / HR or org admin). */
  canOverride: boolean;
}

/**
 * PRD D4, as the server reports it: past the org's 24-hour threshold a primary
 * change needs a reason and an HR or org admin. A soft guard — the server
 * decides; this only explains what it will ask for.
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
            ? `Another primary change needs a reason of at least ${CHANGE_REASON_MIN_CHARS} characters. It is recorded against your name.`
            : "Another primary change needs a reason and an HR or org admin. Ask one if the save is refused."}{" "}
          The limit does not apply when only the additional managers change.
        </p>
      </div>
    </div>
  );
}
