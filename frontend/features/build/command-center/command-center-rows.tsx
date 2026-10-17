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
import { ListPlus } from "lucide-react";
import {
  LayoutGridIcon,
  LayoutListIcon,
  SettingsIcon,
} from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { ProjectListItem } from "@/types/projects";
import {
  listItem,
  listItemReduced,
  pmSnappy,
} from "@/lib/motion-presets";
import { FLEX_TITLE_SLOT } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import {
  PROJECT_HEALTH_LABEL,
  projectHealthClasses,
  STATUS_COLOR,
} from "./command-center-rows-model";

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

  const { iconRef: boardRef, hoverHandlers: boardHoverHandlers } =
    useAnimatedIcon();
  const { iconRef: backlogRef, hoverHandlers: backlogHoverHandlers } =
    useAnimatedIcon();
  const { iconRef: settingsRef, hoverHandlers: settingsHoverHandlers } =
    useAnimatedIcon();

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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-micro font-medium text-primary ring-1 ring-primary/10 transition-transform duration-150 group-hover:scale-105 group-hover:ring-primary/25"
        >
          {project.key.substring(0, 2).toUpperCase()}
        </Link>
        <Link href={base} className={FLEX_TITLE_SLOT}>
          <TruncatedText
            text={project.name}
            className="text-label font-medium text-foreground transition-colors group-hover:text-primary"
          />
          {project.description ? (
            <TruncatedText
              text={project.description}
              className="text-dense text-muted-foreground"
            />
          ) : (
            <p className="font-mono text-micro text-muted-foreground">
              {project.key}
            </p>
          )}
        </Link>
        <Badge
          variant="outline"
          className={cn(
            "h-4 shrink-0 px-1.5 py-0 text-micro",
            projectHealthClasses(project.health),
          )}
        >
          {PROJECT_HEALTH_LABEL[project.health]}
        </Badge>
        {project.progress.total > 0 ? (
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <div className="h-1 w-14 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full w-full origin-left rounded-full bg-primary"
                initial={shouldReduceMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.12,
                }}
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
