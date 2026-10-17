"use client";

import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

interface GanttLegendProps {
  hasCriticalPath: boolean;
  hasMilestones: boolean;
}

export function GanttLegend({ hasCriticalPath, hasMilestones }: GanttLegendProps) {
  if (!hasCriticalPath && !hasMilestones) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-0.5">
      {hasCriticalPath ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-status-danger-rule bg-status-danger-surface px-2.5 py-0.5 text-dense text-status-danger-ink-strong">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-status-danger-rule bg-status-danger-fill"
            aria-hidden
          />
          Critical path
        </span>
      ) : null}
      {hasMilestones ? (
        <span className={cn(TEXT_ONE_LINE, "text-dense text-muted-foreground")}>
          Diamonds mark project milestones
        </span>
      ) : null}
    </div>
  );
}
