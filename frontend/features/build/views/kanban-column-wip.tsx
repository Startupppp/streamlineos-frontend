"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { resolveWipState, type WipState } from "./kanban-board-utils";

type LimitedWipState = Exclude<WipState, "none">;

const WIP_TONE: Record<LimitedWipState, StatusTone> = {
  under: "neutral",
  at: "warning",
  over: "danger",
};

const WIP_STATE_SUFFIX: Record<LimitedWipState, string> = {
  under: "within the work-in-progress limit",
  at: "at the work-in-progress limit",
  over: "over the work-in-progress limit",
};

interface KanbanColumnWipProps {
  count: number;
  wipLimit?: number | null;
  className?: string;
}

export const KanbanColumnWip = memo(function KanbanColumnWip({
  count,
  wipLimit,
  className,
}: KanbanColumnWipProps) {
  const state = resolveWipState(count, wipLimit);

  if (state === "none") {
    return (
      <span
        role="img"
        data-wip-state="none"
        aria-label={`${count} tickets`}
        className={cn(
          "shrink-0 text-xs tabular-nums text-muted-foreground",
          className,
        )}
      >
        {count}
      </span>
    );
  }

  const tone = statusToneClasses(WIP_TONE[state]);
  const description = `${count} of ${wipLimit} tickets, ${WIP_STATE_SUFFIX[state]}`;

  return (
    <Badge
      variant="outline"
      role="img"
      data-wip-state={state}
      aria-label={description}
      title={description}
      className={cn(
        "h-5 shrink-0 gap-0 px-1.5 py-0 text-[10px] font-semibold tabular-nums",
        tone.surface,
        tone.ink,
        tone.rule,
        className,
      )}
    >
      {count}/{wipLimit}
    </Badge>
  );
});
