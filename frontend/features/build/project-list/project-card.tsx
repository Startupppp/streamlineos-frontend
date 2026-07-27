"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Archive, Trash2, RotateCcw, Ticket, CheckCircle2, Pencil } from "lucide-react";
import { ChevronRightIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { TEXT_TWO_LINES, TEXT_FLEX_CHILD } from "@/features/build/shared/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ProjectListItem } from "@/types/projects/projects";
import { ProjectCardDialogs } from "./project-card-dialogs";
import {
  InlineProjectTitle,
  InlineProjectStatus,
  InlineProjectDescription,
  InlineProjectDates,
} from "./project-card-inline-fields";
import {
  avatarTints,
  buildTeamMembers,
  dateToneClasses,
  resolveDateMeta,
  statusDotColors,
  statusStripe,
} from "./project-card-utils";

interface ProjectCardProps {
  project: ProjectListItem;
}

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const { iconRef: ellipsisRef, hoverHandlers: ellipsisHover } = useAnimatedIcon();

  const canUpdate = useCan("build:update");
  const canManage = useCan("build:manage");
  const canEdit = canUpdate || canManage;
  const canDelete = useCan("build:delete");

  const status = project.status ?? "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const stripe = getColorSafe(statusStripe, status);
  const statusDot = getColorSafe(statusDotColors, status);
  const avatarTint = getColorSafe(avatarTints, status);
  const dateMeta = resolveDateMeta(project.endDate, project.startDate, status);
  const progressValue = project.progress.total > 0 ? project.progress.percentage : 0;
  const hasTickets = project.progress.total > 0;
  const openTickets = project.progress.total - project.progress.done;
  const teamMembers = useMemo(() => buildTeamMembers(project), [project]);
  const initials = project.key.slice(0, 2).toUpperCase();
  const showActions = canEdit || canDelete;

  const handleCardClick = useCallback(() => {
    router.push(`/build/${project.id}`);
  }, [router, project.id]);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick],
  );

  const handleStopPropagation = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditOpen(true);
  }, []);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setArchiveConfirmOpen(true);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmOpen(true);
  }, []);

  return (
    <>
      <article
        className={cn(
          "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border/60 border-l-[3px] bg-card/80 p-2 shadow-sm",
          "backdrop-blur-sm supports-[backdrop-filter]:bg-card/70",
          "transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          "hover:border-primary/25 hover:shadow-md hover:shadow-primary/[0.04]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          stripe,
        )}
        role="listitem"
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
        aria-label={`${project.name} — ${displayLabel}. Press Enter to open.`}
      >
        <div className="mb-1.5 flex items-start gap-2">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
              "text-[10px] font-bold tracking-tight transition-transform duration-150 group-hover:scale-105",
              avatarTint,
            )}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className={cn(TEXT_FLEX_CHILD, "flex-1")}>
            <div className="flex items-start justify-between gap-1.5">
              <div className={cn(TEXT_FLEX_CHILD, "flex-1")}>
                <span className="mb-0.5 block font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">
                  {project.key}
                </span>
                <h3
                  className="text-[13px] font-semibold leading-tight text-foreground transition-colors group-hover:text-primary min-w-0"
                >
                  {canEdit ? (
                    <InlineProjectTitle projectId={project.id} currentName={project.name} />
                  ) : (
                    <TruncatedText text={project.name} />
                  )}
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                {canEdit ? (
                  <InlineProjectStatus projectId={project.id} currentStatus={status} />
                ) : (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-0.5 rounded-full border-0 px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wide",
                      statusColor,
                    )}
                  >
                    <span className={cn("h-1 w-1 shrink-0 rounded-full", statusDot)} aria-hidden="true" />
                    {displayLabel}
                  </Badge>
                )}

                {showActions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                        aria-label={`Actions for ${project.name}`}
                        onClick={handleStopPropagation}
                        {...ellipsisHover}
                      >
                        <EllipsisIcon ref={ellipsisRef} size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44" onClick={handleStopPropagation}>
                      {canEdit ? (
                        <>
                          <DropdownMenuItem onClick={handleEditClick}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit project
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleArchiveClick}>
                            {isArchived ? (
                              <>
                                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                Restore project
                              </>
                            ) : (
                              <>
                                <Archive className="mr-2 h-3.5 w-3.5" />
                                Archive project
                              </>
                            )}
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete project
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>

            {canEdit ? (
              <InlineProjectDescription
                projectId={project.id}
                currentDescription={project.description}
              />
            ) : project.description ? (
              <p
                className={cn(TEXT_TWO_LINES, "mt-1 text-[10px] text-muted-foreground")}
                title={project.description}
              >
                {project.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto space-y-1.5 border-t border-border/60 pt-1.5">
          {hasTickets ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                  <span className="text-foreground">{progressValue}%</span> complete
                </span>
                <ChevronRightIcon
                  className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </div>
              <div
                className="h-1 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progressValue}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${project.name} progress`}
                aria-valuetext={`${progressValue}% complete`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                    progressValue >= 100 ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border/70 bg-muted/30 px-1.5 py-0.5">
                <Ticket className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                <span className="text-[9px] text-muted-foreground/70">No tickets yet</span>
              </div>
              <ChevronRightIcon
                className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                aria-hidden="true"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-1.5">
            <div className={cn(TEXT_FLEX_CHILD, "flex flex-1 flex-wrap items-center gap-1")}>
              {hasTickets ? (
                <>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1 py-0.5 text-[8px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-2 w-2" aria-hidden="true" />
                    {project.progress.done} done
                  </span>
                  {openTickets > 0 ? (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1 py-0.5 text-[8px] font-medium text-muted-foreground">
                      <Ticket className="h-2 w-2" aria-hidden="true" />
                      {openTickets} open
                    </span>
                  ) : null}
                </>
              ) : null}
              {teamMembers.length > 0 ? (
                <AvatarStack
                  users={teamMembers}
                  limit={3}
                  className={cn(
                    hasTickets && "ml-0.5",
                    "[&_[data-slot=avatar]]:size-4 [&_[data-slot=avatar]]:text-[7px]",
                  )}
                />
              ) : null}
            </div>
            {canEdit ? (
              <InlineProjectDates
                projectId={project.id}
                currentStartDate={project.startDate}
                currentEndDate={project.endDate}
                currentStatus={status}
              />
            ) : dateMeta ? (
              <div
                className={cn(
                  "flex shrink-0 items-center gap-0.5 text-[9px] font-medium",
                  dateToneClasses[dateMeta.tone],
                )}
              >
                <Calendar className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                {dateMeta.label}
              </div>
            ) : null}
          </div>
        </div>
      </article>

      <ProjectCardDialogs
        project={project}
        isArchived={isArchived}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        archiveConfirmOpen={archiveConfirmOpen}
        onArchiveConfirmOpenChange={setArchiveConfirmOpen}
        deleteConfirmOpen={deleteConfirmOpen}
        onDeleteConfirmOpenChange={setDeleteConfirmOpen}
      />
    </>
  );
});
