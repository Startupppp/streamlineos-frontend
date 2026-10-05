"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Trash2, RotateCcw, Pencil } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TEXT_FLEX_CHILD, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import type { ProjectListItem } from "@/types/projects/projects";
import { ProjectCardDialogs } from "./project-card-dialogs";
import { ProjectCardFooter } from "./project-card-footer";
import {
  InlineProjectTitle,
  InlineProjectDescription,
} from "./project-field-text";
import { InlineProjectStatus } from "./project-field-status-priority";
import {
  avatarTints,
  statusDotColors,
  statusStripe,
} from "./project-card-utils";

interface ProjectCardProps {
  project: ProjectListItem;
}

export const ProjectCard = React.memo(function ProjectCard({
  project,
}: ProjectCardProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const { iconRef: ellipsisRef, hoverHandlers: ellipsisHover } =
    useAnimatedIcon();

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
  const initials = project.key.slice(0, 2).toUpperCase();
  const showActions = canEdit || canDelete;

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      requestLeave(() => router.push(`/build/${project.id}`));
    },
    [requestLeave, router, project.id],
  );

  const handleProjectLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      e.preventDefault();
      requestLeave(() => router.push(`/build/${project.id}`));
    },
    [requestLeave, router, project.id],
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
          "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border/60 border-l-[3px] bg-card p-3 shadow-sm",
          "transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          "hover:border-primary/25 hover:shadow-md",
          stripe,
        )}
        role="listitem"
        onClick={handleCardClick}
      >
        {showActions ? (
          <div className="absolute right-2 top-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                  aria-label={`Actions for ${project.name}`}
                  onClick={handleStopPropagation}
                  {...ellipsisHover}
                >
                  <EllipsisIcon ref={ellipsisRef} size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44"
                onClick={handleStopPropagation}
              >
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
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleDeleteClick}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete project
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
              "text-micro font-medium tracking-tight",
              avatarTint,
            )}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className={cn(TEXT_FLEX_CHILD, "min-w-0 flex-1 space-y-1")}>
            <div
              className={cn(
                "flex min-w-0 items-center gap-2",
                showActions && "pr-7",
              )}
            >
              <Link
                href={`/build/${project.id}`}
                onClick={handleProjectLinkClick}
                aria-label={`Open ${project.name}`}
                className="font-mono text-micro font-normal tracking-wide text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {project.key}
              </Link>
              {canEdit ? (
                <InlineProjectStatus
                  projectId={project.id}
                  currentStatus={status}
                />
              ) : (
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium",
                    statusColor,
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      statusDot,
                    )}
                    aria-hidden="true"
                  />
                  {displayLabel}
                </Badge>
              )}
            </div>

            <h3
              className={cn(
                "text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary",
                TEXT_ONE_LINE,
              )}
            >
              {canEdit ? (
                <InlineProjectTitle
                  projectId={project.id}
                  currentName={project.name}
                />
              ) : (
                <TruncatedText text={project.name} />
              )}
            </h3>

            {canEdit ? (
              <InlineProjectDescription
                projectId={project.id}
                currentDescription={project.description}
              />
            ) : project.description ? (
              <p
                className={cn(
                  TEXT_ONE_LINE,
                  "text-micro text-muted-foreground",
                )}
                title={project.description}
              >
                {project.description}
              </p>
            ) : null}
          </div>
        </div>

        <ProjectCardFooter project={project} canEdit={canEdit} />
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
