"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useProjectRisks, useCreateRisk, useUpdateRisk, useDeleteRisk, useProjectMembers } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import type { Risk, RiskStatus, RiskProbability, RiskImpact, CreateRiskInput, UpdateRiskInput } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
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
import { getRiskSeverity } from "./risk-severity";
import { RiskMatrix } from "./risk-matrix";
import { RiskFormSheet } from "./risk-form-sheet";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";

const LEVEL_LABEL: Record<"low" | "medium" | "high", string> = { low: "Low", medium: "Medium", high: "High" };
const LEVEL_STYLE: Record<"low" | "medium" | "high", string> = {
  low: "text-muted-foreground border-border",
  medium: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  high: "text-red-600 border-red-200 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};
const STATUS_LABEL: Record<RiskStatus, string> = {
  open: "Open", mitigating: "Mitigating", monitoring: "Monitoring", accepted: "Accepted", closed: "Closed",
};
const STATUS_STYLE: Record<RiskStatus, string> = {
  open: "text-primary border-border bg-primary/5 dark:bg-primary/10",
  mitigating: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  monitoring: "text-primary border-border bg-primary/5 dark:bg-primary/10",
  accepted: "text-muted-foreground border-border",
  closed: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

function NewRiskButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Risk
    </Button>
  );
}

function RiskRowActions({
  risk,
  onEdit,
  onDelete,
}: {
  risk: Risk;
  onEdit: (r: Risk) => void;
  onDelete: (r: Risk) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(risk), [risk, onEdit]);
  const handleDelete = useCallback(() => onDelete(risk), [risk, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Risk actions" {...hoverHandlers}>
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
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "monitoring", label: "Monitoring" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

interface RisksPageProps { projectId: number }

export function RisksPage({ projectId }: RisksPageProps) {
  const canManage = useCan("projects:risks:manage");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [matrixCell, setMatrixCell] = useState<{ probability: RiskProbability; impact: RiskImpact } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);

  const { data, isLoading, isError, refetch } = useProjectRisks(projectId, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: members = [] } = useProjectMembers(projectId);

  const createRisk = useCreateRisk(projectId);
  const updateRisk = useUpdateRisk(projectId);
  const deleteRisk = useDeleteRisk(projectId);

  const memberName = useCallback((userId: string | null): string => {
    if (!userId) return "—";
    const m = members.find((x) => x.id === userId);
    return getUserDisplayName(m) || userId;
  }, [members]);

  const allRisks = useMemo(() => data ?? [], [data]);
  const openCount = allRisks.filter((r) => r.status === "open").length;
  const highCritCount = allRisks.filter((r) => {
    const { label } = getRiskSeverity(r.probability, r.impact);
    return label === "High" || label === "Critical";
  }).length;
  const closedCount = allRisks.filter((r) => r.status === "closed").length;

  const displayed = useMemo(() => {
    let items = allRisks;
    if (matrixCell) {
      items = items.filter((r) => r.probability === matrixCell.probability && r.impact === matrixCell.impact);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.title.toLowerCase().includes(q) || `risk-${r.riskNumber}`.includes(q));
    }
    return items;
  }, [allRisks, matrixCell, search]);

  function handleCreate(input: CreateRiskInput) {
    createRisk.mutate(input, {
      onSuccess: () => { toast.success("Risk added"); setSheetOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUpdate(input: UpdateRiskInput & { id: number }) {
    updateRisk.mutate(input, {
      onSuccess: () => { toast.success("Risk updated"); setEditRisk(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteRisk.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Risk deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);
  const handleNewRisk = useCallback(() => setSheetOpen(true), []);
  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setSearch("");
    setMatrixCell(null);
  }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTarget(null); }, []);
  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) { setSheetOpen(false); setEditRisk(null); }
  }, []);

  function handleCellClick(probability: RiskProbability, impact: RiskImpact) {
    setMatrixCell((prev) =>
      prev?.probability === probability && prev?.impact === impact ? null : { probability, impact },
    );
  }

  const columns = useMemo<DataTableColumn<Risk>[]>(() => [
    {
      key: "riskNumber", header: "ID", className: "w-20",
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">RISK-{row.riskNumber}</span>,
    },
    {
      key: "title", header: "Title", sortable: true, sortValue: (r) => r.title,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span
          className={cn("font-medium text-foreground", TEXT_ONE_LINE)}
          title={row.title}
        >
          {row.title}
        </span>
      ),
    },
    {
      key: "probability", header: "Probability",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${LEVEL_STYLE[row.probability]}`}>
          {LEVEL_LABEL[row.probability]}
        </Badge>
      ),
    },
    {
      key: "impact", header: "Impact",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${LEVEL_STYLE[row.impact]}`}>
          {LEVEL_LABEL[row.impact]}
        </Badge>
      ),
    },
    {
      key: "severity", header: "Severity",
      cell: (row) => {
        const s = getRiskSeverity(row.probability, row.impact);
        return <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${s.className}`}>{s.label}</Badge>;
      },
    },
    {
      key: "ownerId", header: "Owner",
      cell: (row) => <span className="text-[11px] text-muted-foreground">{memberName(row.ownerId)}</span>,
    },
    {
      key: "status", header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${STATUS_STYLE[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-10",
      cell: (row) => canManage ? (
        <RiskRowActions risk={row} onEdit={setEditRisk} onDelete={setDeleteTarget} />
      ) : null,
    },
  ], [canManage, memberName]);

  const isFiltered = statusFilter !== "all" || !!search.trim() || !!matrixCell;

  return (
    <PageWrapper
      title="Risk Register"
      subtitle="Identify, assess, and mitigate project risks"
      actions={canManage ? <NewRiskButton onClick={handleNewRisk} /> : undefined}
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <StatCardGrid cols={3}>
            <StatCard label="Open" value={openCount} icon={ShieldAlert} tone="default" isLoading={isLoading} />
            <StatCard label="High / Critical" value={highCritCount} icon={AlertTriangle} tone="red" isLoading={isLoading} />
            <StatCard label="Closed" value={closedCount} icon={CheckCircle2} tone="emerald" isLoading={isLoading} />
          </StatCardGrid>
        </PmSection>

        {!isLoading && !isError ? (
          <PmSection index={1} className="shrink-0">
            <PmPanel className="p-3" solid>
              <RiskMatrix risks={allRisks} onCellClick={handleCellClick} selectedCell={matrixCell} />
            </PmPanel>
          </PmSection>
        ) : null}

        <PmSection index={2} className="shrink-0">
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
                placeholder="Search risks…"
                value={search}
                onChange={handleSearchChange}
              />
              {isFiltered ? (
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleClearFilters}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </PmSection>

        <PmSection index={3} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={8} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : displayed.length === 0 ? (
            <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="alert"
                title={isFiltered ? "No matching risks" : "No risks logged"}
                description={
                  isFiltered
                    ? "Try adjusting your filters or clearing the matrix selection."
                    : "Log risks to track probability, impact, and mitigation plans."
                }
                action={
                  isFiltered
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : canManage
                      ? { label: "New Risk", onClick: handleNewRisk }
                      : undefined
                }
              />
          ) : (
            <PmPanel className={PM_FILL_PANEL} solid>
              <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="780px"
                className="min-h-0 flex-1 border-0"
              />
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <RiskFormSheet
        open={sheetOpen || !!editRisk}
        onOpenChange={handleSheetOpenChange}
        mode={editRisk ? "edit" : "create"}
        defaultValues={editRisk ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createRisk.isPending || updateRisk.isPending}
        projectId={projectId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete risk?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `RISK-${deleteTarget.riskNumber} · ${deleteTarget.title}` : ""} will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
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
