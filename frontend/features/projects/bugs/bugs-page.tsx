"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useBugs, useDeleteBug } from "@/hooks/api/projects/bugs";
import { useCan } from "@/hooks/api/access";
import { useProjectMembers } from "@/hooks/api/projects";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import type { Bug, BugSeverity, BugStatus, BugPriority } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { BugSheet } from "./bug-sheet";

const BUG_STATUSES: readonly BugStatus[] = [
  "new", "triaged", "assigned", "in_progress", "fixed",
  "ready_for_qa", "verified", "reopened", "closed",
];
const BUG_SEVERITIES: readonly BugSeverity[] = ["blocker", "critical", "major", "minor", "trivial"];

const SEVERITY_STYLES: Record<BugSeverity, string> = {
  blocker: "text-red-700 border-red-300 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  critical: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
  major: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  minor: "text-muted-foreground border-border",
  trivial: "text-muted-foreground border-border",
};

const STATUS_STYLES: Record<BugStatus, string> = {
  new: "text-muted-foreground border-border",
  triaged: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
  assigned: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
  in_progress: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  fixed: "text-green-600 border-green-200 dark:text-green-400 dark:border-green-500/30",
  ready_for_qa: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
  verified: "text-green-700 border-green-300 dark:text-green-400 dark:border-green-500/30",
  reopened: "text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/30",
  closed: "text-muted-foreground border-border",
};

const STATUS_LABELS: Record<BugStatus, string> = {
  new: "New", triaged: "Triaged", assigned: "Assigned", in_progress: "In Progress",
  fixed: "Fixed", ready_for_qa: "Ready for QA", verified: "Verified",
  reopened: "Reopened", closed: "Closed",
};

const PRIORITY_STYLES: Record<BugPriority, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  high: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
  urgent: "text-red-700 border-red-300 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

function ReportBugButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1 text-[11px]" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      Report Bug
    </Button>
  );
}

function BugActions({
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  if (!canUpdate && !canDelete) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Bug actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate ? <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem> : null}
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BugsPageProps { projectId: number }

export function BugsPage({ projectId }: BugsPageProps) {
  const canCreate = useCan("projects:bugs:create");
  const canUpdate = useCan("projects:bugs:update");
  const canDelete = useCan("projects:bugs:delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editBug, setEditBug] = useState<Bug | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bug | null>(null);

  const filters = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    q: debouncedSearch || undefined,
  };

  const { data: bugs, isLoading, isError, refetch } = useBugs(projectId, filters);
  const { data: members = [] } = useProjectMembers(projectId);
  const deleteBug = useDeleteBug();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleEdit = useCallback((bug: Bug) => { setEditBug(bug); setSheetOpen(true); }, []);
  const handleNewBug = useCallback(() => { setEditBug(null); setSheetOpen(true); }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteBug.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => { toast.success("Bug deleted"); setDeleteTarget(null); },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [deleteTarget, deleteBug, projectId]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const columns = useMemo<DataTableColumn<Bug>[]>(() => [
    {
      key: "bugNumber",
      header: "ID",
      cell: (row) => <span className="font-mono text-[11px] text-muted-foreground">BUG-{row.bugNumber}</span>,
      className: "w-[72px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span
            className={cn("text-[11px] font-medium", TEXT_ONE_LINE)}
            title={row.title}
          >
            {row.title}
          </span>
          {row.reopenCount > 0 ? (
            <Badge variant="outline" className="shrink-0 text-[9px] text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/30">
              ×{row.reopenCount}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => (
        <Badge variant="outline" className={cn("text-[10px] capitalize", SEVERITY_STYLES[row.severity])}>
          {row.severity}
        </Badge>
      ),
      className: "w-[90px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[row.status])}>
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[110px]",
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row) => (
        <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_STYLES[row.priority])}>
          {row.priority}
        </Badge>
      ),
      className: "w-[80px]",
    },
    {
      key: "assignee",
      header: "Assignee",
      cell: (row) => {
        const member = members.find((m) => m.id === row.assigneeId);
        const label = member ? getUserDisplayName(member) : "—";
        return (
          <span className={cn("max-w-[7rem] text-[11px] text-muted-foreground", TEXT_ONE_LINE)} title={label}>
            {label}
          </span>
        );
      },
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <BugActions
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={() => handleEdit(row)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
      className: "w-[40px]",
    },
  ], [canUpdate, canDelete, handleEdit, members]);

  const filtersBar = (
    <div className={cn(PM_TOOLBAR, "w-full")}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Input
          placeholder="Search bugs..."
          value={search}
          onChange={handleSearchChange}
          className="w-44 text-[11px]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 text-[11px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BUG_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-28 text-[11px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {BUG_SEVERITIES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-32 text-[11px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{getUserDisplayName(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Bugs"
      subtitle="Track and triage project bugs"
      filters={filtersBar}
      actions={canCreate ? <ReportBugButton onClick={handleNewBug} /> : undefined}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={6} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : (bugs ?? []).length === 0 ? (
            <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="ticket"
                title="No bugs found"
                description={
                  search || statusFilter !== "all" || severityFilter !== "all"
                    ? "No bugs match the active filters."
                    : "Report a bug to get started."
                }
                action={canCreate ? { label: "Report Bug", onClick: handleNewBug } : undefined}
              />
          ) : (
            <PmPanel className={PM_FILL_PANEL} solid>
              <DataTable<Bug>
                data={bugs ?? []}
                columns={columns}
                getRowKey={(row) => row.id}
                className="min-h-0 flex-1 border-0"
              />
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <BugSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editBug={editBug}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bug?</AlertDialogTitle>
            <AlertDialogDescription>
              BUG-{deleteTarget?.bugNumber}
              {deleteTarget?.title ? ` · ${deleteTarget.title}` : ""} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
