"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useProjectRisks, useCreateRisk, useUpdateRisk, useDeleteRisk, useProjectMembers } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { getUserDisplayName } from "@/lib/person-display";
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
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import { getRiskSeverity } from "./risk-severity";
import { RiskMatrix } from "./risk-matrix";
import { RiskFormSheet } from "./risk-form-sheet";
import {
  PmPageShell,
  PmSection,
  PmPanel,
  PM_FILL_PANEL,
} from "@/components/pm-chrome/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
const LEVEL_LABEL: Record<"low" | "medium" | "high", string> = { low: "Low", medium: "Medium", high: "High" };
const LEVEL_STYLE: Record<"low" | "medium" | "high", string> = {
  low: "text-muted-foreground border-border",
  medium: "text-status-warning-ink border-status-warning-rule bg-status-warning-surface",
  high: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
};
const STATUS_LABEL: Record<RiskStatus, string> = {
  open: "Open", mitigating: "Mitigating", monitoring: "Monitoring", accepted: "Accepted", closed: "Closed",
};
const STATUS_STYLE: Record<RiskStatus, string> = {
  open: "text-primary border-border bg-primary/5 dark:bg-primary/10",
  mitigating: "text-status-warning-ink border-status-warning-rule bg-status-warning-surface",
  monitoring: "text-primary border-border bg-primary/5 dark:bg-primary/10",
  accepted: "text-muted-foreground border-border",
  closed: "text-status-success-ink border-status-success-rule bg-status-success-surface",
};

function NewRiskButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
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
        <Button variant="ghost" size="icon" className="w-7" aria-label="Risk actions" {...hoverHandlers}>
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
  const canManage = useCan("build:risks:manage");

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

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
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
        <TruncatedText text={row.title} className="font-medium text-foreground" />
      ),
    },
    {
      key: "probability", header: "Probability",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro px-1.5 py-0.5 ${LEVEL_STYLE[row.probability]}`}>
          {LEVEL_LABEL[row.probability]}
        </Badge>
      ),
    },
    {
      key: "impact", header: "Impact",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro px-1.5 py-0.5 ${LEVEL_STYLE[row.impact]}`}>
          {LEVEL_LABEL[row.impact]}
        </Badge>
      ),
    },
    {
      key: "severity", header: "Severity",
      cell: (row) => {
        const s = getRiskSeverity(row.probability, row.impact);
        return <Badge variant="outline" className={`text-micro px-1.5 py-0.5 ${s.className}`}>{s.label}</Badge>;
      },
    },
    {
      key: "ownerId", header: "Owner",
      cell: (row) => <span className="text-dense text-muted-foreground">{memberName(row.ownerId)}</span>,
    },
    {
      key: "status", header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro px-1.5 py-0.5 ${STATUS_STYLE[row.status]}`}>
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

  const filtersBar = (
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
        placeholder="Search risks…"
        value={search}
        onValueChange={handleSearchChange}
      />
      {isFiltered ? (
        <Button size="sm" variant="ghost" className="text-xs" onClick={handleClearFilters}>
          Clear
        </Button>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title="Risk Register"
      subtitle="Identify, assess, and mitigate project risks"
      filters={filtersBar}
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

        <PmSection index={2} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={8} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : displayed.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="alert"
              title="No risks logged"
              description={isFiltered ? undefined : "Log risks to track probability, impact, and mitigation plans."}
              filtersActive={isFiltered}
              onClearFilters={handleClearFilters}
              action={canManage && !isFiltered ? { label: "New Risk", onClick: handleNewRisk } : undefined}
            />
          ) : (
            <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="780px"
                className={PM_FILL_PANEL}
              />
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete risk?"
        description={`RISK-${deleteTarget?.riskNumber ?? ""} · ${deleteTarget?.title ?? ""} will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
