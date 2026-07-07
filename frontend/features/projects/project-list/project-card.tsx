"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  RotateCcw,
  Ticket,
  CheckCircle2,
} from "lucide-react";
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
import type { ProjectListItem } from "@/types/projects/projects";
import { ProjectCardProgressRing } from "./project-card-progress-ring";
import { ProjectCardDialogs } from "./project-card-dialogs";
import {
  avatarTints,
  buildTeamMembers,
  dateToneClasses,
  resolveDateMeta,
  statusAccentBar,
  statusDotColors,
} from "./project-card-utils";

interface ProjectCardProps {
  project: ProjectListItem;
}

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const canUpdate = useCan("projects:update");
  const canDelete = useCan("projects:delete");

  const status = project.status ?? "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const accentBar = getColorSafe(statusAccentBar, status);
  const statusDot = getColorSafe(statusDotColors, status);
  const avatarTint = getColorSafe(avatarTints, status);
  const dateMeta = resolveDateMeta(project.endDate, project.startDate, status);
  const progressValue = project.progress.total > 0 ? project.progress.percentage : 0;
  const hasTickets = project.progress.total > 0;
  const openTickets = project.progress.total - project.progress.done;
  const teamMembers = useMemo(() => buildTeamMembers(project), [project]);
  const initials = project.key.slice(0, 2).toUpperCase();

  const handleCardClick = useCallback(() => {
    router.push(`/projects/${project.id}`);
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
      <div
        className={cn(
          "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm",
          "transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          "hover:border-blue-500/35 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        role="listitem"
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
        aria-label={`${project.name} — ${displayLabel}. Press Enter to open.`}
      >
        <div className={cn("absolute inset-x-0 top-0 h-0.5", accentBar)} aria-hidden="true" />

        <div className="mb-2.5 flex items-start gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
              "text-[11px] font-bold tracking-tight",
              avatarTint,
            )}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <span className="mb-0.5 block font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">
                  {project.key}
                </span>
                <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-blue-600">
                  {project.name}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <ChevronRight
                  className="h-3.5 w-3.5 opacity-0 text-blue-500/70 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
                  aria-hidden="true"
                />
                {(canUpdate || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                        aria-label={`Actions for ${project.name}`}
                        onClick={handleStopPropagation}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44" onClick={handleStopPropagation}>
                      {canUpdate && (
                        <DropdownMenuItem onClick={handleEditClick}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit project
                        </DropdownMenuItem>
                      )}
                      {canUpdate && (
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
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleDeleteClick}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete project
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <Badge
              variant="secondary"
              className={cn(
                "mt-1.5 gap-1 rounded-full border-0 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                statusColor,
              )}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot)} aria-hidden="true" />
              {displayLabel}
            </Badge>
          </div>
        </div>

        {project.description ? (
          <p className="mb-2.5 line-clamp-2 flex-1 text-[11px] leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <div className="mb-2.5 flex-1" aria-hidden="true" />
        )}

        <div className="mt-auto space-y-2.5 border-t border-border/80 pt-2.5">
          {hasTickets ? (
            <div className="flex items-center gap-2.5">
              <ProjectCardProgressRing percentage={progressValue} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-medium text-muted-foreground">Progress</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {project.progress.done}/{project.progress.total}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
                      progressValue >= 100 ? "bg-emerald-500" : "bg-blue-500",
                    )}
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2.5">
              <Ticket className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              <span className="text-[10px] text-muted-foreground/70">No tickets yet</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {hasTickets && (
                <>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                    {project.progress.done} done
                  </span>
                  {openTickets > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      <Ticket className="h-2.5 w-2.5" aria-hidden="true" />
                      {openTickets} open
                    </span>
                  )}
                </>
              )}
              {teamMembers.length > 0 && (
                <AvatarStack
                  users={teamMembers}
                  limit={4}
                  className={cn(
                    hasTickets && "ml-0.5",
                    "[&_[data-slot=avatar]]:size-5 [&_[data-slot=avatar]]:text-[8px]",
                  )}
                />
              )}
            </div>
            {dateMeta && (
              <div
                className={cn(
                  "flex shrink-0 items-center gap-1 text-[10px] font-medium",
                  dateToneClasses[dateMeta.tone],
                )}
              >
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dateMeta.label}
              </div>
            )}
          </div>
        </div>
      </div>

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
