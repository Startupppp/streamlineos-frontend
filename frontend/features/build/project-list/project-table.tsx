"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { PmPanel } from "@/components/pm-chrome";
import { useCan } from "@/hooks/api/access";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { cn } from "@/lib/utils";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { ProjectListItem } from "@/types/projects/projects";
import type { DisplayPrefs } from "./use-display-prefs";
import { ProjectCardDialogs } from "./project-card-dialogs";
import { useProjectTableColumns } from "./project-table-columns";
import {
  ActionsCell,
  StatusDot,
  resolveTargetDate,
  dateToneClasses,
} from "./project-table-actions";

function ProjectStatusBadge({ status }: { status: string }) {
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 rounded-full border-0 px-1.5 py-0 text-micro font-medium",
        statusColor,
      )}
    >
      <StatusDot status={status} />
      {displayLabel}
    </Badge>
  );
}

function ProjectMobileCard({
  project,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: ProjectListItem;
  onEdit: (p: ProjectListItem) => void;
  onArchive: (p: ProjectListItem) => void;
  onDelete: (p: ProjectListItem) => void;
}) {
  const status = project.status ?? "ACTIVE";
  const targetDate = resolveTargetDate(project.endDate, status);
  const progressValue =
    project.progress.total > 0 ? Math.round(project.progress.percentage) : null;

  return (
    <BuildMobileCard
      eyebrow={project.key}
      title={project.name}
      status={<ProjectStatusBadge status={status} />}
      person={{ user: project.manager, role: "Lead" }}
      footer={
        <div className="space-y-2">
          <div className="flex min-w-0 items-center justify-between gap-3 text-label text-muted-foreground">
            <span className="min-w-0 truncate">
              Progress{" "}
              <span className="font-normal font-mono tabular-nums text-foreground">
                {progressValue !== null ? `${progressValue}%` : "—"}
              </span>
            </span>
            <span className="shrink-0">
              Target{" "}
              {targetDate ? (
                <span
                  className={cn(
                    "font-normal font-mono tabular-nums",
                    dateToneClasses[targetDate.tone],
                  )}
                >
                  {targetDate.label}
                </span>
              ) : (
                <span className="font-normal text-foreground">—</span>
              )}
            </span>
          </div>
          {progressValue !== null ? (
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  progressValue >= 100
                    ? "bg-status-success-fill"
                    : "bg-primary",
                )}
                style={{ width: `${progressValue}%` }}
              />
            </div>
          ) : null}
        </div>
      }
      actions={
        <ActionsCell
          project={project}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      }
    />
  );
}

interface ProjectTableProps {
  projects: ProjectListItem[];
  prefs?: DisplayPrefs;
  hasMore?: boolean;
  hasPrevious?: boolean;
  pageNumber?: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

type ActiveDialog = "edit" | "delete" | "archive" | null;

export const ProjectTable = React.memo(function ProjectTable({
  projects,
  prefs,
  hasMore,
  hasPrevious,
  pageNumber = 1,
  onNext,
  onPrevious,
}: ProjectTableProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const canUpdate = useCan("build:update");
  const canDelete = useCan("build:delete");
  const [activeProject, setActiveProject] = useState<ProjectListItem | null>(
    null,
  );
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const handleEdit = useCallback((p: ProjectListItem) => {
    if (!canUpdate) return;
    setActiveProject(p);
    setActiveDialog("edit");
  }, [canUpdate]);

  const handleArchive = useCallback((p: ProjectListItem) => {
    if (!canUpdate) return;
    setActiveProject(p);
    setActiveDialog("archive");
  }, [canUpdate]);

  const handleDelete = useCallback((p: ProjectListItem) => {
    if (!canDelete) return;
    setActiveProject(p);
    setActiveDialog("delete");
  }, [canDelete]);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) setActiveDialog(null);
  }, []);

  const columns = useProjectTableColumns({
    prefs,
    canEdit: canUpdate,
    onEdit: handleEdit,
    onArchive: handleArchive,
    onDelete: handleDelete,
  });

  const handleRowClick = useCallback(
    (project: ProjectListItem) => {
      requestLeave(() => router.push(`/build/${project.id}`));
    },
    [requestLeave, router],
  );

  const renderMobileCard = useCallback(
    (project: ProjectListItem) => (
      <ProjectMobileCard
        project={project}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />
    ),
    [handleEdit, handleArchive, handleDelete],
  );

  return (
    <PmPanel className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <DataTable
        data={projects}
        columns={columns}
        getRowKey={(p) => p.id}
        onRowClick={handleRowClick}
        minWidth="content"
        mobileCard={renderMobileCard}
        rowClassName={() => "group hover:bg-foreground/[0.035] focus-visible:bg-foreground/[0.05]"}
        className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-none border-0 bg-transparent shadow-none"
        emptyState={
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">No projects found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try clearing filters or search.
            </p>
          </div>
        }
        pagination={
          onNext && onPrevious
            ? {
                mode: "cursor",
                pageSize: 25,
                pageNumber,
                hasMore: Boolean(hasMore),
                hasPrevious: Boolean(hasPrevious),
                onNext,
                onPrevious,
              }
            : undefined
        }
      />
      {activeProject &&
      ((canUpdate && (activeDialog === "edit" || activeDialog === "archive")) ||
        (canDelete && activeDialog === "delete")) ? (
        <ProjectCardDialogs
          project={activeProject}
          isArchived={activeProject.status === "ARCHIVED"}
          editOpen={activeDialog === "edit"}
          onEditOpenChange={handleDialogClose}
          archiveConfirmOpen={activeDialog === "archive"}
          onArchiveConfirmOpenChange={handleDialogClose}
          deleteConfirmOpen={activeDialog === "delete"}
          onDeleteConfirmOpenChange={handleDialogClose}
        />
      ) : null}
    </PmPanel>
  );
});
