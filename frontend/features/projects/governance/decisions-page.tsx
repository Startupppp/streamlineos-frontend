"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";
import { useProjectDecisions, useCreateDecision, useUpdateDecision, useDeleteDecision, useProjectMembers } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import type { Decision, DecisionStatus, CreateDecisionInput, UpdateDecisionInput } from "@/types/projects";
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
import { getErrorMessage } from "@/lib/get-error-message";
import { DecisionFormSheet } from "./decision-form-sheet";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";

const DEC_STATUS_LABEL: Record<DecisionStatus, string> = {
  proposed: "Proposed", accepted: "Accepted", superseded: "Superseded", revisit: "Revisit",
};
const DEC_STATUS_STYLE: Record<DecisionStatus, string> = {
  proposed: "text-blue-600 border-blue-200",
  accepted: "text-emerald-600 border-emerald-200",
  superseded: "text-muted-foreground border-border",
  revisit: "text-amber-600 border-amber-200",
};
const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "proposed", label: "Proposed" },
  { value: "accepted", label: "Accepted" },
  { value: "superseded", label: "Superseded" },
  { value: "revisit", label: "Revisit" },
];

interface DecisionsPageProps { projectId: number }

export function DecisionsPage({ projectId }: DecisionsPageProps) {
  const canManage = useCan("projects:decisions:manage");

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
    if (!userId) return "-";
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

  const columns = useMemo((): DataTableColumn<Decision>[] => [
    {
      key: "decisionNumber", header: "ID", className: "w-20",
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">DEC-{row.decisionNumber}</span>,
    },
    {
      key: "title", header: "Title", sortable: true, sortValue: (d) => d.title,
      cell: (row) => (
        <span
          className={cn("block max-w-[min(100%,22rem)] font-medium text-foreground", TEXT_ONE_LINE)}
          title={row.title}
        >
          {row.title}
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${DEC_STATUS_STYLE[row.status]}`}>
          {DEC_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "ownerId", header: "Owner",
      cell: (row) => <span className="text-muted-foreground text-sm">{memberName(row.ownerId)}</span>,
    },
    {
      key: "decidedAt", header: "Decided", sortable: true, sortValue: (d) => d.decidedAt ?? "",
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums text-sm">
          {row.decidedAt ? row.decidedAt.slice(0, 10) : "-"}
        </span>
      ),
    },
    {
      key: "revisitAt", header: "Revisit", sortable: true, sortValue: (d) => d.revisitAt ?? "",
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums text-sm">
          {row.revisitAt ? row.revisitAt.slice(0, 10) : "-"}
        </span>
      ),
    },
    {
      key: "actions", header: "", className: "w-10",
      cell: (row) => {
        if (!canManage) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDecision(row)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [canManage, memberName]);

  const isFiltered = statusFilter !== "all" || !!search.trim();

  return (
    <PageWrapper
      title="Decisions Log"
      eyebrow="Project"
      subtitle="Log and track key project decisions for accountability and audit"
      actions={
        canManage ? (
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Decision
          </Button>
        ) : undefined
      }
      filters={
        <div className={cn(PM_TOOLBAR, "sm:justify-start")}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
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
            <Input
              className="h-8 w-52 text-xs"
              placeholder="Search decisions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isFiltered ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter("all");
                  setSearch("");
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={5} columns={7} className="flex-1" />
          ) : isError ? (
            <ErrorState className="flex-1" onRetry={() => void refetch()} />
          ) : displayed.length === 0 ? (
            <EmptyState
              illustrationPreset="documents"
              title={isFiltered ? "No matching decisions" : "No decisions recorded"}
              description={
                isFiltered
                  ? "Try adjusting your filters."
                  : "Record key project decisions to maintain a clear audit trail."
              }
              action={
                isFiltered
                  ? {
                      label: "Clear filters",
                      onClick: () => {
                        setStatusFilter("all");
                        setSearch("");
                      },
                    }
                  : canManage
                    ? { label: "Log Decision", onClick: () => setSheetOpen(true) }
                    : undefined
              }
              className="min-h-[40vh]"
            />
          ) : (
            <PmPanel className="flex min-h-0 flex-1 flex-col" solid>
              <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="720px"
                className="min-h-0 flex-1 border-0"
              />
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <DecisionFormSheet
        open={sheetOpen || !!editDecision}
        onOpenChange={(open) => { if (!open) { setSheetOpen(false); setEditDecision(null); } }}
        mode={editDecision ? "edit" : "create"}
        defaultValues={editDecision ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createDecision.isPending || updateDecision.isPending}
        projectId={projectId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this decision?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
