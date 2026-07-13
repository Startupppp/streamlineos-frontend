"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useBugs, useDeleteBug } from "@/hooks/api/projects/bugs";
import { useCan } from "@/hooks/api/access";
import { useProjectMembers } from "@/hooks/api/projects";
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
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  const handleEdit = useCallback((bug: Bug) => { setEditBug(bug); setSheetOpen(true); }, []);
  const handleNewBug = useCallback(() => { setEditBug(null); setSheetOpen(true); }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteBug.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => { toast.success("Bug deleted"); setDeleteTarget(null); },
        onError: () => toast.error("Failed to delete bug"),
      },
    );
  }, [deleteTarget, deleteBug, projectId]);

  const columns = useMemo<DataTableColumn<Bug>[]>(() => [
    {
      key: "bugNumber",
      header: "ID",
      cell: (row) => <span className="text-[11px] font-mono text-muted-foreground">BUG-{row.bugNumber}</span>,
      className: "w-[72px]",
    },
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium">{row.title}</span>
          {row.reopenCount > 0 && (
            <Badge variant="outline" className="text-[9px] text-orange-600 border-orange-200">
              ×{row.reopenCount}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${SEVERITY_STYLES[row.severity]}`}>
          {row.severity}
        </Badge>
      ),
      className: "w-[90px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[110px]",
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${PRIORITY_STYLES[row.priority]}`}>
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
        return (
          <span className="text-[11px] text-muted-foreground">
            {member ? getUserDisplayName(member) : "—"}
          </span>
        );
      },
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (canUpdate || canDelete) ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canUpdate && <DropdownMenuItem onSelect={() => handleEdit(row)}>Edit</DropdownMenuItem>}
            {canDelete && (
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(row)}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null,
      className: "w-[40px]",
    },
  ], [canUpdate, canDelete, handleEdit, members]);

  const filtersBar = (
    <div className="flex items-center gap-2 flex-wrap w-full">
      <Input
        placeholder="Search bugs..."
        value={search}
        onChange={handleSearchChange}
        className="h-7 text-[11px] w-44"
      />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-7 text-[11px] w-32"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {BUG_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={severityFilter} onValueChange={setSeverityFilter}>
        <SelectTrigger className="h-7 text-[11px] w-28"><SelectValue placeholder="Severity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          {BUG_SEVERITIES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
        <SelectTrigger className="h-7 text-[11px] w-32"><SelectValue placeholder="Assignee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>{getUserDisplayName(m)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Quality"
      title="Bugs"
      subtitle="Track and triage project bugs"
      filters={filtersBar}
      actions={
        canCreate ? (
          <Button size="sm" className="h-7 text-[11px]" onClick={handleNewBug}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Report Bug
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <DataTableSkeleton rows={8} columns={6} className="flex-1" />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : (bugs ?? []).length === 0 ? (
          <EmptyState
            illustrationPreset="ticket"
            title="No bugs found"
            description={search || statusFilter !== "all" || severityFilter !== "all" ? "No bugs match the active filters." : "Report a bug to get started."}
            action={canCreate ? { label: "Report Bug", onClick: handleNewBug } : undefined}
          />
        ) : (
          <DataTable<Bug>
            data={bugs ?? []}
            columns={columns}
            getRowKey={(row) => row.id}
            className="flex-1 min-h-0"
          />
        )}
      </div>

      <BugSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editBug={editBug}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bug?</AlertDialogTitle>
            <AlertDialogDescription>
              BUG-{deleteTarget?.bugNumber} will be permanently deleted.
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
