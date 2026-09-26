"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Diamond, CalendarCheck2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ProjectMilestone } from "@/hooks/api/build";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "text-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground border-0",
    stripeClassName: "border-l-primary/35",
  },
  ACHIEVED: {
    label: "Achieved",
    color: "text-status-success-ink-strong",
    badgeClassName:
      "bg-status-success-surface text-status-success-ink-strong border-0",
    stripeClassName: "border-l-emerald-500",
  },
  MISSED: {
    label: "Missed",
    color: "text-status-danger-ink-strong",
    badgeClassName: "bg-status-danger-surface text-status-danger-ink-strong border-0",
    stripeClassName: "border-l-red-500",
  },
} as const;

interface MilestoneCardProps {
  milestone: ProjectMilestone;
  onEdit: (milestone: ProjectMilestone) => void;
  onDelete?: (milestone: ProjectMilestone) => void;
  selected?: boolean;
  onSelect?: (milestone: ProjectMilestone, checked: boolean) => void;
}

export const MilestoneCard = memo(function MilestoneCard({
  milestone,
  onEdit,
  onDelete,
  selected,
  onSelect,
}: MilestoneCardProps) {
  const cfg = STATUS_CONFIG[milestone.status];
  const dateObj = new Date(milestone.targetDate);
  const daysLeft = differenceInDays(dateObj, new Date());
  const overdue = isPast(dateObj) && !isToday(dateObj) && milestone.status === "PENDING";
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleEdit = useCallback(() => onEdit(milestone), [onEdit, milestone]);
  const handleDelete = useCallback(() => onDelete?.(milestone), [onDelete, milestone]);

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
        {onSelect ? (
          <Checkbox
            checked={selected ?? false}
            onCheckedChange={(checked) => onSelect(milestone, checked === true)}
            aria-label={`Select ${milestone.name}`}
            className="mt-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
        <Diamond
          className={cn("mt-0.5 h-4 w-4 shrink-0", overdue ? "text-destructive" : cfg.color)}
          fill="currentColor"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <TruncatedText text={milestone.name} className="text-label font-semibold text-foreground" />
              {milestone.description ? (
                <p
                  className={cn(TEXT_TWO_LINES, "text-dense text-muted-foreground")}
                  title={milestone.description}
                >
                  {milestone.description}
                </p>
              ) : null}
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "h-5 shrink-0 rounded-full px-1.5 text-micro font-semibold uppercase tracking-wide",
                cfg.badgeClassName,
              )}
            >
              {cfg.label}
            </Badge>
          </div>

          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-dense text-muted-foreground">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-7" aria-label={`Actions for ${milestone.name}`} {...hoverHandlers}>
                    <EllipsisIcon ref={iconRef} size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
                  {onDelete ? <DropdownMenuItem variant="destructive" onSelect={handleDelete}>Delete</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
