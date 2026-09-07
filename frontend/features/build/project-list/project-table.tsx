"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { PmPanel } from "@/components/pm-chrome/pm-chrome";
import { useCan } from "@/hooks/api/access";
import type { ProjectListItem } from "@/types/projects/projects";
import type { DisplayPrefs } from "./use-display-prefs";
import { ProjectCardDialogs } from "./project-card-dialogs";
import { useProjectTableColumns } from "./project-table-columns";

interface ProjectTableProps {
  projects: ProjectListItem[];
  prefs?: DisplayPrefs;
}

type ActiveDialog = "edit" | "delete" | "archive" | null;

export const ProjectTable = React.memo(function ProjectTable({
  projects,
  prefs,
}: ProjectTableProps) {
  const router = useRouter();
  const canUpdate = useCan("build:update");
  const canManage = useCan("build:manage");
  const canEdit = canUpdate || canManage;
  const [activeProject, setActiveProject] = useState<ProjectListItem | null>(
    null,
  );
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

  return (
    <PmPanel className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <DataTable
        data={projects}
        columns={columns}
        getRowKey={(p) => p.id}
        onRowClick={handleRowClick}
        minWidth="content"
        rowClassName={() => "group h-9 hover:bg-primary/[0.035]"}
        className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-none border-0 bg-transparent shadow-none"
        emptyState={
          <div className="py-4 text-center text-sm text-muted-foreground">
            No projects found
          </div>
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
