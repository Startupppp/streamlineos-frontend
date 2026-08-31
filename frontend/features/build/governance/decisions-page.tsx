"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useProjectDecisions, useCreateDecision, useUpdateDecision, useDeleteDecision, useProjectMembers } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { getUserDisplayName } from "@/lib/person-display";
import type { Decision, DecisionStatus, CreateDecisionInput, UpdateDecisionInput } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import { DecisionFormSheet } from "./decision-form-sheet";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
const DEC_STATUS_LABEL: Record<DecisionStatus, string> = {
  proposed: "Proposed", accepted: "Accepted", superseded: "Superseded", revisit: "Revisit",
};
const DEC_STATUS_STYLE: Record<DecisionStatus, string> = {
  proposed: "text-status-info-ink border-status-info-rule bg-status-info-surface",
  accepted: "text-status-success-ink border-status-success-rule bg-status-success-surface",
  superseded: "text-muted-foreground border-border",
  revisit: "text-status-warning-ink border-status-warning-rule bg-status-warning-surface",
};

function NewDecisionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Decision
    </Button>
  );
}

function DecisionRowActions({
  decision,
  onEdit,
  onDelete,
}: {
  decision: Decision;
  onEdit: (d: Decision) => void;
  onDelete: (d: Decision) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(decision), [decision, onEdit]);
  const handleDelete = useCallback(() => onDelete(decision), [decision, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-7" aria-label="Decision actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "proposed", label: "Proposed" },
  { value: "accepted", label: "Accepted" },
  { value: "superseded", label: "Superseded" },
  { value: "revisit", label: "Revisit" },
];

interface DecisionsPageProps { projectId: number }

export function DecisionsPage({ projectId }: DecisionsPageProps) {
  const canManage = useCan("build:decisions:manage");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDecision, setEditDecision] = useState<Decision | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Decision | null>(null);

  const { data, isLoading, isError, refetch } = useProjectDecisions(projectId, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: members = [] } = useProjectMembers(projectId);

  const createDecision = useCreateDecision(projectId);
  const updateDecision = useUpdateDecision(projectId);
  const deleteDecision = useDeleteDecision(projectId);

  const memberName = useCallback((userId: string | null): string => {
    if (!userId) return "—";
    const m = members.find((x) => x.id === userId);
    return getUserDisplayName(m) || userId;
  }, [members]);

  const allDecisions = useMemo(() => data ?? [], [data]);

  const displayed = useMemo(() => {
    if (!search.trim()) return allDecisions;
    const q = search.toLowerCase();
    return allDecisions.filter(
      (d) => d.title.toLowerCase().includes(q) || `dec-${d.decisionNumber}`.includes(q),
    );
  }, [allDecisions, search]);

  function handleCreate(input: CreateDecisionInput) {
    createDecision.mutate(input, {
      onSuccess: () => { toast.success("Decision logged"); setSheetOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUpdate(input: UpdateDecisionInput & { id: number }) {
    updateDecision.mutate(input, {
      onSuccess: () => { toast.success("Decision updated"); setEditDecision(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteDecision.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Decision deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleNewDecision = useCallback(() => setSheetOpen(true), []);

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setSearch("");
  }, []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) { setSheetOpen(false); setEditDecision(null); }
  }, []);

  const columns = useMemo((): DataTableColumn<Decision>[] => [
    {
      key: "decisionNumber", header: "ID", className: "w-20",
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">DEC-{row.decisionNumber}</span>,
    },
    {
      key: "title", header: "Title", sortable: true, sortValue: (d) => d.title,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <TruncatedText text={row.title} className="font-medium text-foreground" />
      ),
    },
    {
      key: "status", header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro px-1.5 py-0.5 ${DEC_STATUS_STYLE[row.status]}`}>
          {DEC_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "ownerId", header: "Owner",
      cell: (row) => <span className="text-dense text-muted-foreground">{memberName(row.ownerId)}</span>,
    },
    {
      key: "decidedAt", header: "Decided", sortable: true, sortValue: (d) => d.decidedAt ?? "",
      cell: (row) => (
        <span className="text-dense tabular-nums text-muted-foreground">
          {row.decidedAt ? row.decidedAt.slice(0, 10) : "—"}
        </span>
      ),
    },
    {
      key: "revisitAt", header: "Revisit", sortable: true, sortValue: (d) => d.revisitAt ?? "",
      cell: (row) => (
        <span className="text-dense tabular-nums text-muted-foreground">
          {row.revisitAt ? row.revisitAt.slice(0, 10) : "—"}
        </span>
      ),
    },
    {
      key: "actions", header: "", className: "w-10",
      cell: (row) => canManage ? (
        <DecisionRowActions decision={row} onEdit={setEditDecision} onDelete={setDeleteTarget} />
      ) : null,
    },
  ], [canManage, memberName]);

  const isFiltered = statusFilter !== "all" || !!search.trim();

  return (
    <PageWrapper
      title="Decisions Log"
      subtitle="Log and track key project decisions for accountability and audit"
      actions={canManage ? <NewDecisionButton onClick={handleNewDecision} /> : undefined}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchInput
            placeholder="Search decisions..."
            value={search}
            onValueChange={handleSearchChange}
          />
          {isFiltered ? (
            <Button size="sm" variant="ghost" className="text-xs" onClick={handleClearFilters}>
              Clear
            </Button>
          ) : null}
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : displayed.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="documents"
              title="No decisions recorded"
              description={isFiltered ? undefined : "Record key project decisions to maintain a clear audit trail."}
              filtersActive={isFiltered}
              onClearFilters={handleClearFilters}
              action={canManage && !isFiltered ? { label: "Log Decision", onClick: handleNewDecision } : undefined}
            />
          ) : (
            <DataTable
              data={displayed}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="720px"
              className={PM_FILL_PANEL}
            />
          )}
        </PmSection>
      </PmPageShell>

      <DecisionFormSheet
        open={sheetOpen || !!editDecision}
        onOpenChange={handleSheetOpenChange}
        mode={editDecision ? "edit" : "create"}
        defaultValues={editDecision ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createDecision.isPending || updateDecision.isPending}
        projectId={projectId}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete this decision?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
