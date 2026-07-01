"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MoreHorizontal, Pencil, Archive, Trash2, RotateCcw } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDeleteProject, useArchiveProject } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { EditProjectSheet } from "./edit-project-sheet";
import { useCan } from "@/hooks/api/access";

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    manager: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      image: string | null;
    } | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

const projectStatusAccent: Record<string, string> = {
  ACTIVE: "border-l-violet-600",
  PLANNING: "border-l-indigo-500",
  COMPLETED: "border-l-slate-400",
  ON_HOLD: "border-l-amber-500",
  ARCHIVED: "border-l-slate-300",
};

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const canUpdate = useCan("projects:update");
  const canDelete = useCan("projects:delete");

  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const status = project.status ?? "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const statusAccent = getColorSafe(projectStatusAccent, status);
  const dateStr = project.startDate ? format(new Date(project.startDate), "MMM d") : null;
  const progressValue = project.progress.total > 0 ? project.progress.percentage : 0;
  const progressLabel =
    project.progress.total > 0
      ? `${project.progress.done}/${project.progress.total}`
      : "0/0";

  const handleCardClick = useCallback(() => {
    router.push(`/projects/${project.id}`);
  }, [router, project.id]);

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

  const handleArchiveConfirm = useCallback(() => {
    archiveProject.mutate(
      { projectId: project.id, restore: isArchived },
      {
        onSuccess: () => {
          toast.success(isArchived ? "Project restored" : "Project archived");
          setArchiveConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [archiveProject, project.id, isArchived]);

  const handleDeleteConfirm = useCallback(() => {
    deleteProject.mutate(
      { projectId: project.id },
      {
        onSuccess: () => {
          toast.success("Project deleted");
          setDeleteConfirmOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [deleteProject, project.id]);

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200/80 border-l-[3px] bg-white/90 backdrop-blur-sm p-3 shadow-xl shadow-slate-200/60",
          "flex h-full flex-col group cursor-pointer",
          "transition-all duration-200 hover:scale-[1.02] hover:border-violet-500/30 hover:bg-violet-50 hover:shadow-md hover:shadow-violet-100/50 hover:ring-1 hover:ring-violet-500/20",
          statusAccent,
        )}
        role="listitem"
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(); }}
        aria-label={`${project.name} — ${displayLabel}. Press Enter to open.`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
          aria-hidden="true"
        />

        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-violet-600/90">
            {project.key}
          </span>
          <div className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full border-0 px-2 py-0 text-[9px] font-semibold uppercase tracking-wide",
                statusColor,
              )}
            >
              {displayLabel}
            </Badge>
            {(canUpdate || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                    aria-label="Project actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                  {canUpdate && (
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit project
                    </DropdownMenuItem>
                  )}
                  {canUpdate && (
                    <DropdownMenuItem onClick={handleArchiveClick}>
                      {isArchived ? (
                        <><RotateCcw className="h-3.5 w-3.5 mr-2" />Restore project</>
                      ) : (
                        <><Archive className="h-3.5 w-3.5 mr-2" />Archive project</>
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
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete project
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <h3 className="mb-0.5 line-clamp-1 text-sm font-bold text-slate-900 transition-colors group-hover:text-violet-700">
          {project.name}
        </h3>

        {project.description ? (
          <p className="mb-2 line-clamp-1 text-[11px] text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="mb-2 line-clamp-1 text-[10px] italic text-muted-foreground/45">
            No description
          </p>
        )}

        <div className="mt-auto border-t border-slate-100/80 pt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-medium">Progress</span>
            <span className="tabular-nums font-medium">{progressLabel}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <AvatarStack
              users={project.members}
              limit={4}
              className="[&>div]:h-5 [&>div]:w-5"
            />
            {dateStr && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dateStr}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <EditProjectSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />

      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArchived ? "Restore project?" : "Archive project?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? "This project will be restored and set to Active."
                : "You can restore this project later from the project list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={archiveProject.isPending}>
              {isArchived ? "Restore" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All tickets and data in this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteProject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
