"use client";

import { useCallback, useMemo, useState } from "react";
import { useChangeRequests, useDeleteChangeRequest } from "@/hooks/api/projects/change-requests";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import type { ChangeRequest, ChangeRequestStatus } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ChangeRequestSheet } from "./change-request-sheet";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  submitted: "Submitted", under_review: "Under Review", estimated: "Estimated",
  awaiting_approval: "Awaiting Approval", approved: "Approved", rejected: "Rejected",
  in_progress: "In Progress", completed: "Completed",
};

const CR_STATUS_STYLES: Record<ChangeRequestStatus, string> = {
  submitted: "text-muted-foreground border-border",
  under_review: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
  estimated: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  awaiting_approval: "text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/30",
  approved: "text-green-600 border-green-200 dark:text-green-400 dark:border-green-500/30",
  rejected: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
  in_progress: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
  completed: "text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/30",
};

const CR_STATUSES: ChangeRequestStatus[] = [
  "submitted", "under_review", "estimated", "awaiting_approval",
  "approved", "rejected", "in_progress", "completed",
];

function NewCrButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1 text-[11px]" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Change Request
    </Button>
  );
}

function CrRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Change request actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ChangeRequestsPageProps { projectId: number }

export function ChangeRequestsPage({ projectId }: ChangeRequestsPageProps) {
  const canCreate = useCan("projects:changerequests:create");
  const canManage = useCan("projects:changerequests:manage");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCr, setEditCr] = useState<ChangeRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangeRequest | null>(null);

  const { data: crs, isLoading, isError, refetch } = useChangeRequests(
    projectId,
    statusFilter !== "all" ? { status: statusFilter } : undefined,
  );
  const { data: membersData } = useOrgMembers(1, 100);
  const deleteCr = useDeleteChangeRequest(projectId);
  const members = useMemo(() => membersData?.data ?? [], [membersData]);

  const handleNew = useCallback(() => { setEditCr(null); setSheetOpen(true); }, []);
  const handleEdit = useCallback((cr: ChangeRequest) => { setEditCr(cr); setSheetOpen(true); }, []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTarget(null); }, []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCr.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Change request deleted"); setDeleteTarget(null); },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteTarget, deleteCr]);

  const filtered = useMemo(
    () => (crs ?? []).filter((cr) => !search || cr.title.toLowerCase().includes(search.toLowerCase())),
    [crs, search],
  );

  const columns = useMemo<DataTableColumn<ChangeRequest>[]>(() => [
    {
      key: "crNumber",
      header: "ID",
      cell: (row) => <span className="text-[11px] font-mono text-muted-foreground">CR-{row.crNumber}</span>,
      className: "w-[72px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span
          className={cn("text-[11px] font-medium", TEXT_ONE_LINE)}
          title={row.title}
        >
          {row.title}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] ${CR_STATUS_STYLES[row.status]}`}>
          {CR_STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[140px]",
    },
    {
      key: "estimateMinutes",
      header: "Est. (hrs)",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground">
          {row.estimateMinutes != null ? (row.estimateMinutes / 60).toFixed(1) : "—"}
        </span>
      ),
      className: "w-[80px]",
    },
    {
      key: "budgetImpactCents",
      header: "Budget",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground">
          {row.budgetImpactCents != null ? `₹${(row.budgetImpactCents / 100).toLocaleString("en-IN")}` : "—"}
        </span>
      ),
      className: "w-[100px]",
    },
    {
      key: "timelineImpactDays",
      header: "Timeline",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground">
          {row.timelineImpactDays != null ? `${row.timelineImpactDays}d` : "—"}
        </span>
      ),
      className: "w-[80px]",
    },
    {
      key: "requestedById",
      header: "Requester",
      cell: (row) => {
        const m = members.find((m) => m.userId === row.requestedById);
        return <span className="text-[11px] text-muted-foreground">{m ? (m.name ?? m.email) : "—"}</span>;
      },
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage ? (
          <CrRowActions
            onEdit={() => handleEdit(row)}
            onDelete={() => setDeleteTarget(row)}
          />
        ) : null,
      className: "w-[40px]",
    },
  ], [canManage, handleEdit, members]);

  const filtersBar = (
    <div className={cn(PM_TOOLBAR, "sm:justify-start")}>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={handleSearchChange}
          className="w-44 text-[11px]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CR_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CR_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Change Requests"
      subtitle="Track and manage change requests"
      filters={filtersBar}
      actions={canCreate ? <NewCrButton onClick={handleNew} /> : undefined}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={() => void refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="ticket"
                title="No change requests"
                description={
                  search || statusFilter !== "all"
                    ? "No change requests match the active filters."
                    : "Create a change request to get started."
                }
                action={canCreate ? { label: "New Change Request", onClick: handleNew } : undefined}
              />
          ) : (
            <PmPanel className={PM_FILL_PANEL} solid>
              <DataTable<ChangeRequest>
                data={filtered}
                columns={columns}
                getRowKey={(row) => row.id}
                className="min-h-0 flex-1 border-0"
              />
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <ChangeRequestSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editCr={editCr}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete change request?</AlertDialogTitle>
            <AlertDialogDescription>
              CR-{deleteTarget?.crNumber} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
