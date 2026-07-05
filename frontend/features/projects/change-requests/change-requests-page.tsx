"use client";

import { useState } from "react";
import { useChangeRequests, useDeleteChangeRequest } from "@/hooks/api/projects/change-requests";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import type { ChangeRequest, ChangeRequestStatus } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { ChangeRequestSheet } from "./change-request-sheet";

const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  submitted: "Submitted", under_review: "Under Review", estimated: "Estimated",
  awaiting_approval: "Awaiting Approval", approved: "Approved", rejected: "Rejected",
  in_progress: "In Progress", completed: "Completed",
};

const CR_STATUS_STYLES: Record<ChangeRequestStatus, string> = {
  submitted: "text-slate-600 border-slate-200",
  under_review: "text-blue-600 border-blue-200",
  estimated: "text-amber-600 border-amber-200",
  awaiting_approval: "text-orange-600 border-orange-200",
  approved: "text-green-600 border-green-200",
  rejected: "text-red-600 border-red-200",
  in_progress: "text-purple-600 border-purple-200",
  completed: "text-emerald-700 border-emerald-300",
};

const CR_STATUSES: ChangeRequestStatus[] = [
  "submitted", "under_review", "estimated", "awaiting_approval",
  "approved", "rejected", "in_progress", "completed",
];

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
  const members = membersData?.data ?? [];

  function handleNew() { setEditCr(null); setSheetOpen(true); }
  function handleEdit(cr: ChangeRequest) { setEditCr(cr); setSheetOpen(true); }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteCr.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Change request deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete"),
    });
  }

  const filtered = (crs ?? []).filter((cr) =>
    !search || cr.title.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataTableColumn<ChangeRequest>[] = [
    {
      key: "crNumber",
      header: "ID",
      cell: (row) => <span className="text-[11px] font-mono text-muted-foreground">CR-{row.crNumber}</span>,
      className: "w-[72px]",
    },
    {
      key: "title",
      header: "Title",
      cell: (row) => <span className="text-[11px] font-medium">{row.title}</span>,
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleEdit(row)}>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteTarget(row)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
      className: "w-[40px]",
    },
  ];

  const filtersBar = (
    <div className="flex items-center gap-2 flex-wrap w-full">
      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-[11px] w-44"
      />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-7 text-[11px] w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {CR_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{CR_STATUS_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Project"
      title="Change Requests"
      subtitle="Track and manage change requests"
      filters={filtersBar}
      actions={
        canCreate ? (
          <Button size="sm" className="h-7 text-[11px]" onClick={handleNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Change Request
          </Button>
        ) : undefined
      }
    >
      <div className="px-4 pb-4">
        {isLoading ? (
          <SkeletonTable rows={6} columns={7} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
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
          <DataTable<ChangeRequest>
            data={filtered}
            columns={columns}
            getRowKey={(row) => row.id}
          />
        )}
      </div>

      <ChangeRequestSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editCr={editCr}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
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
