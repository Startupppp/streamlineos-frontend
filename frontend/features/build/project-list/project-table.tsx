"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { PmPanel } from "@/components/pm-chrome";
import { useCan } from "@/hooks/api/access";
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
      title={project.name}
      status={<ProjectStatusBadge status={status} />}
      person={{ user: project.manager, role: "Lead" }}
      meta={[
        {
          label: "Progress",
          value:
            progressValue !== null ? (
              <span className="font-mono tabular-nums">{progressValue}%</span>
            ) : (
              "—"
            ),
        },
        {
          label: "Target",
          value: targetDate ? (
            <span className={cn("font-mono tabular-nums", dateToneClasses[targetDate.tone])}>
              {targetDate.label}
            </span>
          ) : (
            "—"
          ),
        },
      ]}
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
  onLoadMore?: () => void;
}

type ActiveDialog = "edit" | "delete" | "archive" | null;

export const ProjectTable = React.memo(function ProjectTable({
  projects,
  prefs,
  hasMore,
  onLoadMore,
}: ProjectTableProps) {
  const router = useRouter();
  const canUpdate = useCan("build:update");
  const canManage = useCan("build:manage");
  const canEdit = canUpdate || canManage;
  const [activeProject, setActiveProject] = useState<ProjectListItem | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const handleEdit = useCallback((p: ProjectListItem) => {
    setActiveProject(p);
    setActiveDialog("edit");
  }, []);

  const handleArchive = useCallback((p: ProjectListItem) => {
    setActiveProject(p);
    setActiveDialog("archive");
  }, []);

  const handleDelete = useCallback((p: ProjectListItem) => {
    setActiveProject(p);
    setActiveDialog("delete");
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) setActiveDialog(null);
  }, []);

  const handleNoPreviousPage = useCallback(() => {}, []);

  const columns = useProjectTableColumns({
    prefs,
    canEdit,
    onEdit: handleEdit,
    onArchive: handleArchive,
    onDelete: handleDelete,
  });

  const handleRowClick = useCallback(
    (project: ProjectListItem) => {
      router.push(`/build/${project.id}`);
    },
    [router],
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
        rowClassName={() => "group h-9 hover:bg-primary/[0.035]"}
        className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-none border-0 bg-transparent shadow-none"
        emptyState={
          <div className="py-4 text-center text-sm text-muted-foreground">
            No projects found
          </div>
        }
        pagination={
          hasMore && onLoadMore
            ? {
                mode: "cursor",
                pageSize: 25,
                hasMore: true,
                hasPrevious: false,
                onNext: onLoadMore,
                onPrevious: handleNoPreviousPage,
              }
            : undefined
        }
      />
      {activeProject ? (
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
