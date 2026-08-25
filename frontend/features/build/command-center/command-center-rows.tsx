"use client";

import { memo, useCallback, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, ListPlus } from "lucide-react";
import { ChevronRightIcon, LayoutGridIcon, LayoutListIcon, SettingsIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/features/build/shared/status-badge";
import { isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  listItem,
  listItemReduced,
  pmSnappy,
  pmSpring,
} from "@/lib/motion-presets";
import { PM_ROW } from "@/features/build/shared/pm-chrome";
import { FLEX_TITLE_SLOT } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getTicketDetailHref } from "@/features/build/shared/format-ticket-key";

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE:
    "text-status-success-ink border-status-success-rule bg-status-success-surface",
  PLANNING:
    "text-status-info-ink border-status-info-rule bg-status-info-surface",
  ON_HOLD:
    "text-status-warning-ink border-status-warning-rule bg-status-warning-surface",
  COMPLETED:
    "text-muted-foreground border-border bg-muted",
  ARCHIVED:
    "text-muted-foreground border-border bg-muted",
};

export function isOverdue(item: MyWorkItem): boolean {
  if (!item.dueDate) return false;
  try {
    const d = parseISO(item.dueDate);
    return isPast(d) && !isToday(d) && item.status !== "DONE";
  } catch {
    return false;
  }
}

export const MyWorkRow = memo(function MyWorkRow({
  item,
}: {
  item: MyWorkItem;
  index?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const overdue = isOverdue(item);
  const { iconRef: chevronRef, hoverHandlers: chevronHoverHandlers } = useAnimatedIcon();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      whileHover={shouldReduceMotion ? undefined : { x: 2 }}
      className="min-w-0"
    >
      <Link
        href={getTicketDetailHref(item.projectId, item.projectKey, item.ticketNumber)}
        className={PM_ROW}
        {...chevronHoverHandlers}
      >
        <motion.div
          className="shrink-0"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: -4 }}
          transition={pmSpring}
        >
          <PriorityBadge priority={item.priority} size="sm" />
        </motion.div>
        <div className={FLEX_TITLE_SLOT}>
          <TruncatedText
            text={item.title}
            className="text-label font-medium leading-tight text-foreground transition-colors group-hover:text-primary"
          />
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="shrink-0 font-mono text-micro font-medium text-primary/80">
              {item.projectKey}
            </span>
            <span className="shrink-0 text-micro text-muted-foreground/70">·</span>
            <TruncatedText
              text={item.projectName}
              className="min-w-0 flex-1 text-micro text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {overdue ? (
            <motion.span
              initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={pmSpring}
            >
              <AlertCircle className="h-3.5 w-3.5 text-status-danger-ink" aria-label="Overdue" />
            </motion.span>
          ) : null}
          <StatusBadge status={item.status} className="text-dense" />
          <ChevronRightIcon
            ref={chevronRef}
            size={12}
            className="-translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
          />
        </div>
      </Link>
    </motion.div>
  );
});

export const ProjectCard = memo(function ProjectCard({
  project,
  onCreateIssue,
}: {
  project: ProjectListItem;
  onCreateIssue?: (projectId: number) => void;
  index?: number;
}) {
  const base = `/build/${project.id}`;
  const shouldReduceMotion = useReducedMotion();
  const progress = project.progress.percentage;

  const { iconRef: boardRef, hoverHandlers: boardHoverHandlers } = useAnimatedIcon();
  const { iconRef: backlogRef, hoverHandlers: backlogHoverHandlers } = useAnimatedIcon();
  const { iconRef: settingsRef, hoverHandlers: settingsHoverHandlers } = useAnimatedIcon();

  const handleCreateIssue = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onCreateIssue?.(project.id);
    },
    [onCreateIssue, project.id],
  );

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.005 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      className="group min-w-0"
    >
      <div
        className={cn(
          "relative flex w-full min-w-0 items-center gap-2.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-2",
          "shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-card/45",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-md",
          "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full",
          "before:bg-transparent before:transition-colors before:duration-150 hover:before:bg-primary/70",
        )}
      >
        <Link
          href={base}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-micro font-bold text-primary ring-1 ring-primary/10 transition-transform duration-150 group-hover:scale-105 group-hover:ring-primary/25"
        >
          {project.key.substring(0, 2).toUpperCase()}
        </Link>
        <Link href={base} className={FLEX_TITLE_SLOT}>
          <TruncatedText
            text={project.name}
            className="text-label font-medium text-foreground transition-colors group-hover:text-primary"
          />
          {project.description ? (
            <TruncatedText text={project.description} className="text-dense text-muted-foreground" />
          ) : (
            <p className="font-mono text-micro text-muted-foreground/80">{project.key}</p>
          )}
        </Link>
        {project.progress.total > 0 ? (
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <div className="h-1 w-14 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={shouldReduceMotion ? false : { width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              />
            </div>
            <span className="w-7 text-right text-micro tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center justify-end">
          {project.status ? (
            <Badge
              variant="outline"
              className={cn(
                "h-4 max-w-[5.5rem] truncate px-1.5 py-0 text-micro group-hover:hidden",
                STATUS_COLOR[project.status] ?? "",
              )}
            >
              {project.status.replace(/_/g, " ")}
            </Badge>
          ) : null}
          <div className="hidden items-center gap-0.5 group-hover:flex">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={base}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                    aria-label="Open board"
                    {...boardHoverHandlers}
                  >
                    <LayoutGridIcon ref={boardRef} size={12} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Board
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`${base}/backlog`}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                    aria-label="Open backlog"
                    {...backlogHoverHandlers}
                  >
                    <LayoutListIcon ref={backlogRef} size={12} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Backlog
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  {onCreateIssue ? (
                    <button
                      type="button"
                      onClick={handleCreateIssue}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                      aria-label="New issue"
                    >
                      <ListPlus className="h-3 w-3" />
                    </button>
                  ) : (
                    <Link
                      href={`${base}?create=1`}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                      aria-label="New issue"
                    >
                      <ListPlus className="h-3 w-3" />
                    </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  New issue
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`${base}/settings`}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                    aria-label="Settings"
                    {...settingsHoverHandlers}
                  >
                    <SettingsIcon ref={settingsRef} size={12} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Settings
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
