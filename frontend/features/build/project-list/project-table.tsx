"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Pencil,
  Archive,
  Trash2,
  RotateCcw,
  User,
  Ticket,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarStack } from "@/components/ui/avatar-stack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn, resolveImageUrl } from "@/lib/utils";
import { format, isPast, differenceInDays } from "date-fns";
import {
  getColorSafe,
  healthDotColors,
  healthStatusColors,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/build/shared/resolve-user-name";
import { TEXT_FLEX_CHILD } from "@/features/build/shared/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PmPanel } from "@/features/build/shared/pm-chrome";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { ProjectListItem, ProjectHealth } from "@/types/projects/projects";
import type { DisplayPrefs } from "./use-display-prefs";
import { ProjectCardDialogs } from "./project-card-dialogs";
import {
  InlineProjectLead,
  InlineProjectMembers,
  InlineProjectPriority,
} from "./project-card-inline-fields";
import { statusDotColors } from "./project-card-utils";

interface ProjectTableProps {
  projects: ProjectListItem[];
  prefs?: DisplayPrefs;
}

type ActiveDialog = "edit" | "delete" | "archive" | null;

function StatusDot({ status }: { status: string }) {
  const dotColor = getColorSafe(statusDotColors, status);
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotColor)}
      aria-hidden="true"
    />
  );
}

function resolveTargetDate(
  endDate: Date | string | null,
  status: string,
): { label: string; tone: "muted" | "soon" | "overdue" } | null {
  if (!endDate) return null;
  const date = new Date(endDate);
  const terminal = status === "COMPLETED" || status === "ARCHIVED";
  if (!terminal && isPast(date)) {
    return { label: format(date, "MMM d"), tone: "overdue" };
  }
  const daysLeft = differenceInDays(date, new Date());
  if (!terminal && daysLeft >= 0 && daysLeft <= 7) {
    return { label: format(date, "MMM d"), tone: "soon" };
  }
  return { label: format(date, "MMM d"), tone: "muted" };
}

const dateToneClasses = {
  muted: "text-muted-foreground",
  soon: "text-amber-600 dark:text-amber-400",
  overdue: "text-red-600 dark:text-red-400",
} as const;

function ActionsCell({
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
  const canUpdate = useCan("build:update");
  const canManage = useCan("build:manage");
  const canEdit = canUpdate || canManage;
  const canDelete = useCan("build:delete");
  const isArchived = (project.status ?? "ACTIVE") === "ARCHIVED";
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  if (!canEdit && !canDelete) return null;

  function handleStopPropagation(e: React.MouseEvent) {
    e.stopPropagation();
  }
  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(project);
  }
  function handleArchiveClick(e: React.MouseEvent) {
    e.stopPropagation();
    onArchive(project);
  }
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(project);
  }

  return (
    <div onClick={handleStopPropagation}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
            aria-label={`Actions for ${project.name}`}
            {...hoverHandlers}
          >
            <EllipsisIcon ref={iconRef} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canEdit ? (
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit project
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
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
  );
}

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

  const columns = useMemo<DataTableColumn<ProjectListItem>[]>(() => {
    const cols: DataTableColumn<ProjectListItem>[] = [
      {
        key: "name",
        header: "Name",
        sortable: true,
        sortValue: (p) => p.name,
        className: "min-w-[200px] w-[240px] max-w-[320px]",
        cell: (p) => (
          <div
            className={cn(
              TEXT_FLEX_CHILD,
              "flex min-w-0 items-center gap-2 overflow-hidden",
            )}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold tracking-tight bg-primary/10 text-primary ring-1 ring-primary/10"
              aria-hidden="true"
            >
              {p.key.slice(0, 2).toUpperCase()}
            </span>
            <TruncatedText
              text={p.name}
              className="text-[13px] font-medium text-foreground transition-colors group-hover:text-primary"
            />
            <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground/60 sm:inline-block">
              {p.key}
            </span>
          </div>
        ),
      },
    ];

    if (!prefs || prefs.showSummary) {
      cols.push({
        key: "summary",
        header: "Summary",
        className: "w-[180px]",
        cell: (p) =>
          p.description ? (
            <TruncatedText
              text={p.description}
              className="text-[11px] text-muted-foreground"
            />
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      });
    }

    if (!prefs || prefs.showStatus) {
      cols.push({
        key: "status",
        header: "Status",
        sortable: true,
        sortValue: (p) => p.status ?? "",
        className: "w-[100px]",
        cell: (p) => {
          const status = p.status ?? "ACTIVE";
          const displayLabel = projectStatusDisplayLabels[status] ?? status;
          const statusColor = getColorSafe(projectStatusColors, status);
          return (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1 rounded-full border-0 px-1.5 py-0 text-[10px] font-medium",
                statusColor,
              )}
            >
              <StatusDot status={status} />
              {displayLabel}
            </Badge>
          );
        },
      });
    }

    if (prefs?.showPriority) {
      cols.push({
        key: "priority",
        header: "Priority",
        sortable: true,
        sortValue: (p) => {
          const order: Record<string, number> = {
            URGENT: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
          };
          return order[p.priority ?? ""] ?? 4;
        },
        className: "w-[96px]",
        cell: (p) => (
          <InlineProjectPriority
            projectId={p.id}
            currentPriority={p.priority}
          />
        ),
      });
    }

    if (prefs?.showHealth) {
      cols.push({
        key: "health",
        header: "Health",
        sortable: true,
        sortValue: (p) => {
          const order: Record<ProjectHealth, number> = {
            off_track: 0,
            at_risk: 1,
            on_track: 2,
          };
          return order[p.health];
        },
        className: "w-[96px]",
        cell: (p) => {
          const healthLabels: Record<ProjectHealth, string> = {
            on_track: "On Track",
            at_risk: "At Risk",
            off_track: "Off Track",
          };
          const dotColor = getColorSafe(healthDotColors, p.health);
          const badgeColor = getColorSafe(healthStatusColors, p.health);
          return (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1 rounded-full border-0 px-1.5 py-0 text-[10px] font-medium",
                badgeColor,
              )}
            >
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                  dotColor,
                )}
                aria-hidden="true"
              />
              {healthLabels[p.health]}
            </Badge>
          );
        },
      });
    }

    if (!prefs || prefs.showLead) {
      cols.push({
        key: "lead",
        header: "Lead",
        sortable: true,
        sortValue: (p) => getUserDisplayName(p.manager),
        className: "w-[130px]",
        cell: (p) =>
          canEdit ? (
            <InlineProjectLead projectId={p.id} manager={p.manager} />
          ) : p.manager ? (
            <div className={cn(TEXT_FLEX_CHILD, "flex items-center gap-1.5")}>
              <Avatar className="h-5 w-5 shrink-0">
                {p.manager.image ? (
                  <AvatarImage
                    src={resolveImageUrl(p.manager.image)}
                    alt={getUserDisplayName(p.manager)}
                  />
                ) : null}
                <AvatarFallback className="text-[9px]">
                  {getUserInitials(p.manager)}
                </AvatarFallback>
              </Avatar>
              <TruncatedText
                text={getUserDisplayName(p.manager)}
                className="max-w-[96px] text-xs text-muted-foreground"
              />
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              Unassigned
            </span>
          ),
      });
    }

    if (prefs?.showMembers) {
      cols.push({
        key: "members",
        header: "Members",
        className: "w-[90px]",
        cell: (p) =>
          canEdit ? (
            <InlineProjectMembers projectId={p.id} members={p.members} />
          ) : p.members.length > 0 ? (
            <AvatarStack
              users={p.members}
              limit={3}
              className="[&_[data-slot=avatar]]:size-5 [&_[data-slot=avatar]]:text-[8px]"
            />
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      });
    }

    if (prefs?.showTeams) {
      cols.push({
        key: "teams",
        header: "Teams",
        className: "w-[140px]",
        cell: (p) => {
          if (!p.teams || p.teams.length === 0) {
            return <span className="text-xs text-muted-foreground/40">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {p.teams.slice(0, 3).map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="h-[18px] px-1.5 text-[10px] font-normal"
                >
                  {t}
                </Badge>
              ))}
              {p.teams.length > 3 ? (
                <Badge
                  variant="outline"
                  className="h-[18px] px-1.5 text-[10px] font-normal text-muted-foreground"
                >
                  +{p.teams.length - 3}
                </Badge>
              ) : null}
            </div>
          );
        },
      });
    }

    if (!prefs || prefs.showTargetDate) {
      cols.push({
        key: "endDate",
        header: "Target",
        sortable: true,
        sortValue: (p) =>
          p.endDate ? new Date(p.endDate).getTime() : Infinity,
        className: "w-[84px]",
        cell: (p) => {
          const status = p.status ?? "ACTIVE";
          const targetDate = resolveTargetDate(p.endDate, status);
          return targetDate ? (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                dateToneClasses[targetDate.tone],
              )}
            >
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              {targetDate.label}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          );
        },
      });
    }

    if (prefs?.showStartDate) {
      cols.push({
        key: "startDate",
        header: "Start",
        sortable: true,
        sortValue: (p) =>
          p.startDate ? new Date(p.startDate).getTime() : Infinity,
        className: "w-[80px]",
        cell: (p) =>
          p.startDate ? (
            <span className="text-xs text-muted-foreground">
              {format(new Date(p.startDate), "MMM d")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      });
    }

    if (!prefs || prefs.showIssueCount) {
      cols.push({
        key: "issues",
        header: "Issues",
        sortable: true,
        sortValue: (p) => p.progress.total,
        className: "w-[72px]",
        cell: (p) => (
          <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
            <Ticket className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{p.progress.total}</span>
          </div>
        ),
      });
    }

    if (!prefs || prefs.showProgress) {
      cols.push({
        key: "progress",
        header: "Progress",
        sortable: true,
        sortValue: (p) => p.progress.percentage,
        className: "w-[110px]",
        cell: (p) => {
          const progressValue =
            p.progress.total > 0 ? p.progress.percentage : 0;
          return p.progress.total > 0 ? (
            <div className="flex items-center gap-2">
              <Progress value={progressValue} className="h-1 min-w-0 flex-1" />
              <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                {Math.round(progressValue)}%
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          );
        },
      });
    }

    cols.push({
      key: "actions",
      header: "",
      className: "w-10 pr-2",
      cell: (p) => (
        <ActionsCell
          project={p}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      ),
    });

    return cols;
  }, [prefs, canEdit, handleEdit, handleArchive, handleDelete]);

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
