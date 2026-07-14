"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Diamond, Pencil, CalendarCheck2 } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import type { ProjectMilestone } from "@/hooks/api/projects";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/features/projects/shared/text-overflow";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "text-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground border-0",
    stripeClassName: "border-l-primary/35",
  },
  ACHIEVED: {
    label: "Achieved",
    color: "text-emerald-600 dark:text-emerald-400",
    badgeClassName:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-0",
    stripeClassName: "border-l-emerald-500",
  },
  MISSED: {
    label: "Missed",
    color: "text-red-600 dark:text-red-400",
    badgeClassName: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 border-0",
    stripeClassName: "border-l-red-500",
  },
} as const;

interface MilestoneCardProps {
  milestone: ProjectMilestone;
  onEdit: (milestone: ProjectMilestone) => void;
  onDelete: (milestone: ProjectMilestone) => void;
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-destructive hover:text-destructive"
      onClick={onClick}
      aria-label={label}
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={12} />
    </Button>
  );
}

export const MilestoneCard = memo(function MilestoneCard({
  milestone,
  onEdit,
  onDelete,
}: MilestoneCardProps) {
  const cfg = STATUS_CONFIG[milestone.status];
  const dateObj = new Date(milestone.targetDate);
  const daysLeft = differenceInDays(dateObj, new Date());
  const overdue = isPast(dateObj) && !isToday(dateObj) && milestone.status === "PENDING";

  const handleEdit = useCallback(() => onEdit(milestone), [onEdit, milestone]);
  const handleDelete = useCallback(() => onDelete(milestone), [onDelete, milestone]);

  const daysLabel =
    milestone.status !== "PENDING"
      ? null
      : overdue
        ? `${Math.abs(daysLeft)}d overdue`
        : daysLeft === 0
          ? "Today"
          : `${daysLeft}d left`;

  return (
    <div
      className={cn(
        PM_PANEL,
        "group relative overflow-hidden border-l-[3px] p-3",
        "transition-[border-color,box-shadow,background-color] duration-200 ease-out motion-reduce:transition-none",
        "hover:border-primary/40 hover:bg-card/60 hover:shadow-md",
        overdue ? "border-l-destructive" : cfg.stripeClassName,
        overdue && "border-destructive/40",
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Diamond
          className={cn("mt-0.5 h-4 w-4 shrink-0", overdue ? "text-destructive" : cfg.color)}
          fill="currentColor"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p
                className={cn(TEXT_ONE_LINE, "text-[13px] font-semibold text-foreground")}
                title={milestone.name}
              >
                {milestone.name}
              </p>
              {milestone.description ? (
                <p
                  className={cn(TEXT_TWO_LINES, "text-[11px] text-muted-foreground")}
                  title={milestone.description}
                >
                  {milestone.description}
                </p>
              ) : null}
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "h-5 shrink-0 rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                cfg.badgeClassName,
              )}
            >
              {cfg.label}
            </Badge>
          </div>

          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="shrink-0 tabular-nums">{format(dateObj, "MMM d, yyyy")}</span>
              {daysLabel ? (
                <span
                  className={cn(
                    "min-w-0 truncate font-medium",
                    overdue ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  · {daysLabel}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleEdit}
                aria-label={`Edit ${milestone.name}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <DeleteButton onClick={handleDelete} label={`Delete ${milestone.name}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
