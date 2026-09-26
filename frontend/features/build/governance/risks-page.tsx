"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import {
  useProjectRisks,
  useProjectRiskStats,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useProjectMembers,
  GOVERNANCE_PAGE_SIZE,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import type {
  Risk,
  RiskProbability,
  RiskImpact,
  RiskStatus,
  CreateRiskInput,
  UpdateRiskInput,
} from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { useCursorPager } from "@/components/ui/table-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import { RiskMatrix } from "./risk-matrix";
import { RiskFormSheet } from "./risk-form-sheet";
import {
  PmPageShell,
  PmSection,
  PmPanel,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import {
  RISK_TABLE_HEADERS,
  buildRiskColumns,
  RiskMobileCard,
} from "./risks-table-columns";
import { RiskBulkActionBar } from "./risk-bulk-action-bar";

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "monitoring", label: "Monitoring" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((o) => o.value),
  },
] as const;

interface RisksPageProps {
  projectId: number;
}

export function RisksPage({ projectId }: RisksPageProps) {
  const canManage = useCan("build:risks:manage");
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const [matrixCell, setMatrixCell] = useState<{
    probability: RiskProbability;
    impact: RiskImpact;
  } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);

  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const statusValue = listFilters.value("status");
  const { data, isLoading, isError, error, refetch } = useProjectRisks(
    projectId,
    {
      status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
      cursor: cursor === undefined ? undefined : Number(cursor),
    },
  );
  const { data: stats, isLoading: isStatsLoading } =
    useProjectRiskStats(projectId);

  const pageState = usePageState({
    permission: "build:risks:view",
    isLoading,
    isError,
    error,
  });
  const { data: members = [] } = useProjectMembers(projectId);

  const createRisk = useCreateRisk(projectId);
  const updateRisk = useUpdateRisk(projectId);
  const deleteRisk = useDeleteRisk(projectId);

  const memberName = useCallback(
    (userId: string | null): string => {
      if (!userId) return "—";
      const m = members.find((x) => x.id === userId);
      return getUserDisplayName(m) || userId;
    },
    [members],
  );

  const ownerOf = useCallback(
    (userId: string | null): NamedUser | null => {
      if (!userId) return null;
      const m = members.find((x) => x.id === userId);
      return m ? { name: m.name ?? undefined, email: m.email } : null;
    },
    [members],
  );

  const filteredRisks = useMemo(() => data?.data ?? [], [data]);
  const openCount = stats?.open ?? 0;
  const highCritCount = stats?.highCritical ?? 0;
  const closedCount = stats?.closed ?? 0;

  const search = listFilters.debouncedSearch.trim().toLowerCase();
  const isFiltered = listFilters.isFiltered || !!matrixCell;

  const displayed = useMemo(() => {
    let items = filteredRisks;
    if (matrixCell) {
      items = items.filter(
        (r) =>
          r.probability === matrixCell.probability &&
          r.impact === matrixCell.impact,
      );
    }
    if (search) {
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(search) ||
          `risk-${r.riskNumber}`.includes(search),
      );
    }
    return items;
  }, [filteredRisks, matrixCell, search]);

  const handleCreate = useCallback(
    (input: CreateRiskInput) => {
      createRisk.mutate(input, {
        onSuccess: () => {
          toast.success("Risk added");
          setSheetOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createRisk],
  );

  const handleUpdate = useCallback(
    (input: UpdateRiskInput & { riskId: number }) => {
      updateRisk.mutate(input, {
        onSuccess: () => {
          toast.success("Risk updated");
          setEditRisk(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateRisk],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteRisk.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Risk deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteRisk, deleteTarget]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleNewRisk = useCallback(() => setSheetOpen(true), []);

  const handleClearAll = useCallback(() => {
    listFilters.clearAll();
    setMatrixCell(null);
  }, [listFilters]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => {
    goNext(data?.nextCursor == null ? null : String(data.nextCursor));
  }, [goNext, data]);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSheetOpen(false);
      setEditRisk(null);
    }
  }, []);

  const handleCellClick = useCallback(
    (probability: RiskProbability, impact: RiskImpact) => {
      setMatrixCell((prev) =>
        prev?.probability === probability && prev?.impact === impact
          ? null
          : { probability, impact },
      );
    },
    [],
  );

  const handleEditRow = useCallback((r: Risk) => setEditRisk(r), []);
  const handleDeleteRow = useCallback((r: Risk) => setDeleteTarget(r), []);

  const [selectedIds, setSelectedIds] = useState(new Set<string | number>());

  const handleOpenFocused = useCallback(
    (index: number) => { handleEditRow(filteredRisks[index]); },
    [filteredRisks, handleEditRow],
  );
  const handleEditRiskByIndex = useCallback(
    (index: number) => { if (filteredRisks[index]) handleEditRow(filteredRisks[index]); },
    [filteredRisks, handleEditRow],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: filteredRisks.length,
    onOpen: handleOpenFocused,
    onEdit: canManage ? handleEditRiskByIndex : undefined,
    onCreate: canManage ? handleNewRisk : undefined,
    onClearSelection: handleClearKeyboardSelection,
    enabled: !sheetOpen && !editRisk && !deleteTarget,
  });

  const handleBulkStatus = useCallback(
    (status: RiskStatus) => {
      selectedIds.forEach((id) => {
        const risk = filteredRisks.find((r) => r.id === Number(id));
        if (risk) updateRisk.mutate({ riskId: risk.id, status });
      });
      setSelectedIds(new Set());
    },
    [selectedIds, filteredRisks, updateRisk],
  );

  const handleBulkOwner = useCallback(
    (ownerId: string) => {
      selectedIds.forEach((id) => {
        const risk = filteredRisks.find((r) => r.id === Number(id));
        if (risk) updateRisk.mutate({ riskId: risk.id, ownerId });
      });
      setSelectedIds(new Set());
    },
    [selectedIds, filteredRisks, updateRisk],
  );

  const handleBulkClear = useCallback(() => setSelectedIds(new Set()), []);

  const columns = useMemo(
    () =>
      buildRiskColumns({
        canManage,
        memberName,
        ownerOf,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
      }),
    [canManage, memberName, ownerOf, handleEditRow, handleDeleteRow],
  );

  const renderMobileCard = useCallback(
    (row: Risk) => (
      <RiskMobileCard
        risk={row}
        canManage={canManage}
        ownerOf={ownerOf}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, ownerOf, handleEditRow, handleDeleteRow],
  );

  return (
    <PageWrapper
      title="Risk Register"
      subtitle="Identify, assess, and mitigate project risks"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search risks…",
            label: "Search risks",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={handleClearAll}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canManage
              ? [
                  {
                    id: "create",
                    label: "New Risk",
                    icon: Plus,
                    primary: true,
                    onSelect: handleNewRisk,
                  },
                ]
              : []
          }
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <StatCardGrid cols={3}>
            <StatCard
              label="Open"
              value={openCount}
              icon={ShieldAlert}
              tone="default"
              isLoading={isStatsLoading}
            />
            <StatCard
              label="High / Critical"
              value={highCritCount}
              icon={AlertTriangle}
              tone="red"
              isLoading={isStatsLoading}
            />
            <StatCard
              label="Closed"
              value={closedCount}
              icon={CheckCircle2}
              tone="emerald"
              isLoading={isStatsLoading}
            />
          </StatCardGrid>
        </PmSection>

        {!isStatsLoading && pageState.kind !== "loading" ? (
          <PmSection index={1} className="shrink-0">
            <PmPanel className="p-3" solid>
              <RiskMatrix
                cells={stats?.matrix ?? []}
                onCellClick={handleCellClick}
                selectedCell={matrixCell}
              />
            </PmPanel>
          </PmSection>
        ) : null}

        <PmSection index={2} className="flex min-h-0 flex-1 flex-col">
          {selectedIds.size > 0 && (
            <RiskBulkActionBar
              selectedCount={selectedIds.size}
              onBulkStatus={handleBulkStatus}
              onBulkOwner={handleBulkOwner}
              members={members}
              onClear={handleBulkClear}
            />
          )}
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton mobileCards
                rows={12}
                headers={RISK_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="alert"
                title="No risks logged"
                description="Log risks to track probability, impact, and mitigation plans."
                filtersActive={isFiltered}
                onClearFilters={handleClearAll}
                action={
                  canManage
                    ? { label: "New Risk", onClick: handleNewRisk }
                    : undefined
                }
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={displayed}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="780px"
              mobileCard={renderMobileCard}
              className={PM_FILL_PANEL}
              selection={{
                selected: selectedIds,
                onChange: setSelectedIds,
                getRowLabel: (row) => row.title,
              }}
              pagination={{
                mode: "cursor",
                pageSize: GOVERNANCE_PAGE_SIZE,
                hasMore: data?.hasMore ?? false,
                hasPrevious,
                onNext: handleNextPage,
                onPrevious: goPrevious,
              }}
            />
          </PageState>
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
