"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useProjectRisks, useProjectRiskStats, useCreateRisk, useUpdateRisk, useDeleteRisk, useProjectMembers, GOVERNANCE_PAGE_SIZE } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { getUserDisplayName } from "@/lib/person-display";
import type { Risk, RiskProbability, RiskImpact, CreateRiskInput, UpdateRiskInput } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

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
} from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

const LEVEL_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
const LEVEL_STYLE: Record<string, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-status-warning-ink border-status-warning-rule bg-status-warning-surface",
  high: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open", mitigating: "Mitigating", monitoring: "Monitoring", accepted: "Accepted", closed: "Closed",
};
const STATUS_STYLE: Record<string, string> = {
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

  const { cursor, setCursor, setListParams, clearFilters } = useBuildListUrlState();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") ?? "all";

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const debouncedSearchInput = useDebouncedValue(searchInput, 300);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [matrixCell, setMatrixCell] = useState<{ probability: RiskProbability; impact: RiskImpact } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearchInput === current) return;
    setListParams({ q: debouncedSearchInput || null });
  }, [debouncedSearchInput, searchParams, setListParams]);

  const { data, isLoading, isError, error, refetch } = useProjectRisks(projectId, {
    status: urlStatus !== "all" ? urlStatus : undefined,
    cursor: cursor ? Number(cursor) : undefined,
  });
  const { data: stats, isLoading: isStatsLoading } = useProjectRiskStats(projectId);

  const pageState = usePageState({ permission: "build:risks:view", isLoading, isError, error });
  const { data: members = [] } = useProjectMembers(projectId);

  const createRisk = useCreateRisk(projectId);
  const updateRisk = useUpdateRisk(projectId);
  const deleteRisk = useDeleteRisk(projectId);

  const memberName = useCallback((userId: string | null): string => {
    if (!userId) return "—";
    const m = members.find((x) => x.id === userId);
    return getUserDisplayName(m) || userId;
  }, [members]);

  const filteredRisks = useMemo(() => data?.data ?? [], [data]);
  const openCount = stats?.open ?? 0;
  const highCritCount = stats?.highCritical ?? 0;
  const closedCount = stats?.closed ?? 0;

  const displayed = useMemo(() => {
    let items = filteredRisks;
    if (matrixCell) {
      items = items.filter((r) => r.probability === matrixCell.probability && r.impact === matrixCell.impact);
    }
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      items = items.filter((r) => r.title.toLowerCase().includes(q) || `risk-${r.riskNumber}`.includes(q));
    }
    return items;
  }, [filteredRisks, matrixCell, searchInput]);

  function handleCreate(input: CreateRiskInput) {
    createRisk.mutate(input, {
      onSuccess: () => { toast.success("Risk added"); setSheetOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUpdate(input: UpdateRiskInput & { riskId: number }) {
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
    setSearchInput(value);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setListParams({ status: value !== "all" ? value : null });
    setCursorStack([]);
  }, [setListParams]);

  const handleNewRisk = useCallback(() => setSheetOpen(true), []);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setMatrixCell(null);
    clearFilters();
    setCursorStack([]);
  }, [clearFilters]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.nextCursor;
    if (nextCursor == null) return;
    setCursorStack((prev) => [...prev, cursor ?? ""]);
    setCursor(String(nextCursor));
  }, [cursor, data, setCursor]);

  const handlePrevPage = useCallback(() => {
    const prev = cursorStack[cursorStack.length - 1];
    setCursorStack((stack) => stack.slice(0, -1));
    setCursor(prev === "" ? null : prev);
  }, [cursorStack, setCursor]);

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
      key: "title", header: "Title",
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

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Risk Register" subtitle="Identify, assess, and mitigate project risks">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  const isFiltered = urlStatus !== "all" || !!searchInput.trim() || !!matrixCell;

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={urlStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-40" aria-label="Filter by status">
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
        value={searchInput}
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
            <StatCard label="Open" value={openCount} icon={ShieldAlert} tone="default" isLoading={isStatsLoading} />
            <StatCard label="High / Critical" value={highCritCount} icon={AlertTriangle} tone="red" isLoading={isStatsLoading} />
            <StatCard label="Closed" value={closedCount} icon={CheckCircle2} tone="emerald" isLoading={isStatsLoading} />
          </StatCardGrid>
        </PmSection>

        {!isStatsLoading && pageState.kind !== "loading" ? (
          <PmSection index={1} className="shrink-0">
            <PmPanel className="p-3" solid>
              <RiskMatrix cells={stats?.matrix ?? []} onCellClick={handleCellClick} selectedCell={matrixCell} />
            </PmPanel>
          </PmSection>
        ) : null}

        <PmSection index={2} className="flex min-h-0 flex-1 flex-col">
          {isLoading || pageState.kind === "loading" ? (
            <DataTableSkeleton rows={12} columns={8} className="flex-1" />
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
                pagination={{
                  mode: "cursor",
                  pageSize: GOVERNANCE_PAGE_SIZE,
                  hasMore: data?.hasMore ?? false,
                  hasPrevious: cursorStack.length > 0,
                  onNext: handleNextPage,
                  onPrevious: handlePrevPage,
                }}
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
