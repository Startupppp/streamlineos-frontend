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
import { AlertCircle, ChevronRight, LayoutGrid, LayoutList, ListPlus, Settings } from "lucide-react";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { StatusBadge } from "@/features/projects/shared/status-badge";
import { isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  listItem,
  listItemReduced,
  pmSnappy,
  pmSpring,
} from "@/features/projects/shared/pm-motion";
import { PM_ROW } from "@/features/projects/shared/pm-chrome";
import { TEXT_FLEX_CHILD, TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE:
    "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  PLANNING:
    "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  ON_HOLD:
    "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  COMPLETED:
    "text-muted-foreground border-border bg-muted dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  ARCHIVED:
    "text-muted-foreground border-border bg-muted dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
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
      >
        <motion.div
          className="shrink-0"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: -4 }}
          transition={pmSpring}
        >
          <PriorityBadge priority={item.priority} size="sm" />
        </motion.div>
        <div className={cn(TEXT_FLEX_CHILD, "flex-1")}>
          <p
            className={cn(
              TEXT_ONE_LINE,
              "text-[13px] font-medium leading-tight text-foreground transition-colors group-hover:text-primary",
            )}
            title={item.title}
          >
            {item.title}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 font-mono text-[10px] font-medium text-primary/80">
              {item.projectKey}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground/70">·</span>
            <span
              className={cn(TEXT_ONE_LINE, "text-[10px] text-muted-foreground")}
              title={item.projectName}
            >
              {item.projectName}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {overdue ? (
            <motion.span
              initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={pmSpring}
            >
              <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="Overdue" />
            </motion.span>
          ) : null}
          <StatusBadge status={item.status} className="text-[11px]" />
          <ChevronRight className="h-3 w-3 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100" />
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
  const base = `/projects/${project.id}`;
  const shouldReduceMotion = useReducedMotion();
  const progress = project.progress.percentage;

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
          "relative flex min-w-0 items-center gap-2.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-2",
          "shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-card/45",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-md",
          "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full",
          "before:bg-transparent before:transition-colors before:duration-150 hover:before:bg-primary/70",
        )}
      >
        <Link
          href={base}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary ring-1 ring-primary/10 transition-transform duration-150 group-hover:scale-105 group-hover:ring-primary/25"
        >
          {project.key.substring(0, 2).toUpperCase()}
        </Link>
        <Link href={base} className={cn(TEXT_FLEX_CHILD, "flex-1")}>
          <p
            className={cn(
              TEXT_ONE_LINE,
              "text-[13px] font-medium text-foreground transition-colors group-hover:text-primary",
            )}
            title={project.name}
          >
            {project.name}
          </p>
          {project.description ? (
            <p
              className={cn(TEXT_ONE_LINE, "text-[11px] text-muted-foreground")}
              title={project.description}
            >
              {project.description}
            </p>
          ) : (
            <p className="font-mono text-[10px] text-muted-foreground/80">{project.key}</p>
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {project.progress.total > 0 ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <div className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={shouldReduceMotion ? false : { width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                />
              </div>
              <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
          ) : null}
          {project.status ? (
            <Badge
              variant="outline"
              className={cn(
                "h-4 max-w-[5.5rem] truncate px-1.5 py-0 text-[10px]",
                STATUS_COLOR[project.status] ?? "",
              )}
            >
              {project.status.replace(/_/g, " ")}
            </Badge>
          ) : null}
          <div className="ml-0.5 flex items-center gap-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={base}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                    aria-label="Open board"
                  >
                    <LayoutGrid className="h-3 w-3" />
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
                  >
                    <LayoutList className="h-3 w-3" />
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
                  >
                    <Settings className="h-3 w-3" />
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
