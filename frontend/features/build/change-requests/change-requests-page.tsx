"use client";

import { useCallback, useMemo, useState } from "react";
import { useChangeRequests, useDeleteChangeRequest } from "@/hooks/api/build/change-requests";
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
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ChangeRequestSheet } from "./change-request-sheet";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";

const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  submitted: "Submitted", under_review: "Under Review", estimated: "Estimated",
  awaiting_approval: "Awaiting Approval", approved: "Approved", rejected: "Rejected",
  in_progress: "In Progress", completed: "Completed",
};

const CR_STATUS_STYLES: Record<ChangeRequestStatus, string> = {
  submitted: "text-muted-foreground border-border",
  under_review: "text-status-info-ink border-status-info-rule",
  estimated: "text-status-warning-ink border-status-warning-rule",
  awaiting_approval: "text-status-warning-ink border-status-warning-rule",
  approved: "text-status-success-ink border-status-success-rule",
  rejected: "text-status-danger-ink border-status-danger-rule",
  in_progress: "text-status-info-ink border-status-info-rule",
  completed: "text-status-success-ink border-status-success-rule",
};

const CR_STATUSES: ChangeRequestStatus[] = [
  "submitted", "under_review", "estimated", "awaiting_approval",
  "approved", "rejected", "in_progress", "completed",
];

function NewCrButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1 text-dense" onClick={onClick} {...hoverHandlers}>
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
  const canCreate = useCan("build:changerequests:create");
  const canManage = useCan("build:changerequests:manage");

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
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCr.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Change request deleted"); setDeleteTarget(null); },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteTarget, deleteCr]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const filtersActive = !!(search || statusFilter !== "all");

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
  }, []);

  const filtered = useMemo(
    () => (crs ?? []).filter((cr) => !search || cr.title.toLowerCase().includes(search.toLowerCase())),
    [crs, search],
  );

  const columns = useMemo<DataTableColumn<ChangeRequest>[]>(() => [
    {
      key: "crNumber",
      header: "ID",
      cell: (row) => <span className="text-dense font-mono text-muted-foreground">CR-{row.crNumber}</span>,
      className: "w-[72px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <TruncatedText text={row.title} className="text-dense font-medium" />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro ${CR_STATUS_STYLES[row.status]}`}>
          {CR_STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[140px]",
    },
    {
      key: "estimateMinutes",
      header: "Est. (hrs)",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.estimateMinutes != null ? (row.estimateMinutes / 60).toFixed(1) : "—"}
        </span>
      ),
      className: "w-[80px]",
    },
    {
      key: "budgetImpactCents",
      header: "Budget",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.budgetImpactCents != null ? `₹${(row.budgetImpactCents / 100).toLocaleString("en-IN")}` : "—"}
        </span>
      ),
      className: "w-[100px]",
    },
    {
      key: "timelineImpactDays",
      header: "Timeline",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
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
        return <span className="text-dense text-muted-foreground">{m ? (m.name ?? m.email) : "—"}</span>;
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
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search..."
        value={search}
        onValueChange={handleSearchChange}
      />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40">
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
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : filtered.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="ticket"
              title="No change requests"
              description={filtersActive ? undefined : "Create a change request to get started."}
              filtersActive={filtersActive}
              onClearFilters={handleClearFilters}
              action={canCreate && !filtersActive ? { label: "New Change Request", onClick: handleNew } : undefined}
            />
          ) : (
            <DataTable<ChangeRequest>
                data={filtered}
                columns={columns}
                getRowKey={(row) => row.id}
                className={PM_FILL_PANEL}
              />
          )}
        </PmSection>
      </PmPageShell>

      <ChangeRequestSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editCr={editCr}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete change request?"
        description={`CR-${deleteTarget?.crNumber ?? ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
