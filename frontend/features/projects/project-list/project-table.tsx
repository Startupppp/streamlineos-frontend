"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  RotateCcw,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, isPast, differenceInDays } from "date-fns";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { useCan } from "@/hooks/api/access";
import { resolveImageUrl } from "@/lib/utils";
import type { ProjectListItem } from "@/types/projects/projects";
import { ProjectCardDialogs } from "./project-card-dialogs";
import { statusDotColors } from "./project-card-utils";

type SortField = "name" | "status" | "lead" | "endDate" | "progress";
type SortDir = "asc" | "desc";

interface SortState {
  field: SortField;
  dir: SortDir;
}

interface ProjectTableProps {
  projects: ProjectListItem[];
}

function SortIcon({ field, sort }: { field: SortField; sort: SortState }) {
  if (sort.field !== field)
    return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/40" aria-hidden="true" />;
  if (sort.dir === "asc")
    return <ArrowUp className="ml-1 h-3 w-3 text-foreground" aria-hidden="true" />;
  return <ArrowDown className="ml-1 h-3 w-3 text-foreground" aria-hidden="true" />;
}

function SortHeader({
  field,
  sort,
  onSort,
  children,
  className,
}: {
  field: SortField;
  sort: SortState;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const handleClick = useCallback(() => onSort(field), [onSort, field]);
  return (
    <TableHead
      className={cn("select-none cursor-pointer group/th whitespace-nowrap", className)}
      onClick={handleClick}
      aria-sort={sort.field === field ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground group-hover/th:text-foreground transition-colors">
        {children}
        <SortIcon field={field} sort={sort} />
      </span>
    </TableHead>
  );
}

function StatusDot({ status }: { status: string }) {
  const dotColor = getColorSafe(statusDotColors, status);
  return (
    <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", dotColor)} aria-hidden="true" />
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

function ProjectTableRow({ project }: { project: ProjectListItem }) {
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
  const targetDate = resolveTargetDate(project.endDate, status);
  const progressValue = project.progress.total > 0 ? project.progress.percentage : 0;
  const leadName = getUserDisplayName(project.manager);
  const leadInitials = getUserInitials(project.manager);

  const handleRowClick = useCallback(() => {
    router.push(`/projects/${project.id}`);
  }, [router, project.id]);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleRowClick();
    },
    [handleRowClick],
  );

  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
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
      <TableRow
        className="group cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="row"
        aria-label={`${project.name} — ${displayLabel}`}
      >
        <TableCell className="py-2 pl-3 pr-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold tracking-tight bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              {project.key.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-sm font-medium text-foreground truncate group-hover:text-blue-600 transition-colors min-w-0">
              {project.name}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground/60 shrink-0">
              {project.key}
            </span>
          </div>
        </TableCell>

        <TableCell className="py-2 w-[120px]">
          <Badge
            variant="secondary"
            className={cn(
              "gap-1 rounded-full border-0 px-2 py-0.5 text-[10px] font-medium",
              statusColor,
            )}
          >
            <StatusDot status={status} />
            {displayLabel}
          </Badge>
        </TableCell>

        <TableCell className="py-2 w-[140px] hidden md:table-cell">
          {project.manager ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5 shrink-0">
                {project.manager.image ? (
                  <AvatarImage src={resolveImageUrl(project.manager.image)} alt={leadName} />
                ) : null}
                <AvatarFallback className="text-[9px]">{leadInitials}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">{leadName}</span>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              Unassigned
            </span>
          )}
        </TableCell>

        <TableCell className="py-2 w-[100px] hidden lg:table-cell">
          {targetDate ? (
            <div className={cn("flex items-center gap-1 text-xs font-medium", dateToneClasses[targetDate.tone])}>
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              {targetDate.label}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          )}
        </TableCell>

        <TableCell className="py-2 w-[130px] hidden sm:table-cell">
          {project.progress.total > 0 ? (
            <div className="flex items-center gap-2">
              <Progress value={progressValue} className="h-1 flex-1 min-w-0" />
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-7 text-right">
                {Math.round(progressValue)}%
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          )}
        </TableCell>

        <TableCell className="py-2 w-10 pr-3" onClick={handleStopPropagation}>
          {(canUpdate || canDelete) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Actions for ${project.name}`}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canUpdate && (
                  <DropdownMenuItem onClick={handleEditClick}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit project
                  </DropdownMenuItem>
                )}
                {canUpdate && (
                  <DropdownMenuItem onClick={handleArchiveClick}>
                    {isArchived ? (
                      <><RotateCcw className="mr-2 h-3.5 w-3.5" />Restore project</>
                    ) : (
                      <><Archive className="mr-2 h-3.5 w-3.5" />Archive project</>
                    )}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive"
                      onClick={handleDeleteClick}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </TableCell>
      </TableRow>

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
}

export const ProjectTable = React.memo(function ProjectTable({ projects }: ProjectTableProps) {
  const [sort, setSort] = useState<SortState>({ field: "name", dir: "asc" });

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" },
    );
  }, []);

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "status":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        case "lead":
          cmp = getUserDisplayName(a.manager).localeCompare(getUserDisplayName(b.manager));
          break;
        case "endDate": {
          const da = a.endDate ? new Date(a.endDate).getTime() : Infinity;
          const db = b.endDate ? new Date(b.endDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case "progress":
          cmp = a.progress.percentage - b.progress.percentage;
          break;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [projects, sort]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
            <SortHeader field="name" sort={sort} onSort={handleSort} className="pl-3 pr-2 w-full">
              Name
            </SortHeader>
            <SortHeader field="status" sort={sort} onSort={handleSort} className="w-[120px]">
              Status
            </SortHeader>
            <SortHeader field="lead" sort={sort} onSort={handleSort} className="w-[140px] hidden md:table-cell">
              Lead
            </SortHeader>
            <SortHeader field="endDate" sort={sort} onSort={handleSort} className="w-[100px] hidden lg:table-cell">
              Target
            </SortHeader>
            <SortHeader field="progress" sort={sort} onSort={handleSort} className="w-[130px] hidden sm:table-cell">
              Progress
            </SortHeader>
            <TableHead className="w-10 pr-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((project) => (
            <ProjectTableRow key={project.id} project={project} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
