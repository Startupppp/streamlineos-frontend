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
  GOVERNANCE_PAGE_SIZE,
} from "@/hooks/api/build/governance";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCan } from "@/hooks/api/access";
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
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
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
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
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

const PROBABILITY_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All probabilities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const IMPACT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All impacts" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((o) => o.value),
  },
  {
    param: "probability",
    options: ["low", "medium", "high"] as const,
  },
  {
    param: "impact",
    options: ["low", "medium", "high"] as const,
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

  const { cursor, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const statusValue = listFilters.value("status");
  const probabilityValue = listFilters.value("probability");
  const impactValue = listFilters.value("impact");
  const { data, isLoading, isError, error, refetch } = useProjectRisks(
    projectId,
    {
      status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
      probability: probabilityValue !== BUILD_FILTER_ALL ? probabilityValue : undefined,
      impact: impactValue !== BUILD_FILTER_ALL ? impactValue : undefined,
      cursor: cursor === undefined ? undefined : Number(cursor),
      search: listFilters.debouncedSearch || undefined,
    },
  );
  const { data: stats, isLoading: isStatsLoading } =
    useProjectRiskStats(projectId);

  const { data: membersPage } = useProjectMembers(projectId);
  const members = membersPage?.data ?? [];

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

  const isFiltered = listFilters.isFiltered || !!matrixCell;

  const displayed = useMemo(() => {
    if (!matrixCell) return filteredRisks;
    return filteredRisks.filter(
      (r) =>
        r.probability === matrixCell.probability &&
        r.impact === matrixCell.impact,
    );
  }, [filteredRisks, matrixCell]);

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

  const handleProbabilityChange = useCallback(
    (value: string) => listFilters.setValue("probability", value),
    [listFilters],
  );

  const handleImpactChange = useCallback(
    (value: string) => listFilters.setValue("impact", value),
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

  const handleEditRiskByIndex = useCallback(
    (index: number) => { if (filteredRisks[index]) handleEditRow(filteredRisks[index]); },
    [filteredRisks, handleEditRow],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: filteredRisks.length,
    onOpen: handleEditRiskByIndex,
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
            {
              id: "probability",
              label: "Probability",
              active: listFilters.isActive("probability"),
              control: (
                <BuildFilterSelect
                  label="Probability"
                  value={probabilityValue}
                  onValueChange={handleProbabilityChange}
                  options={PROBABILITY_OPTIONS}
                />
              ),
            },
            {
              id: "impact",
              label: "Impact",
              active: listFilters.isActive("impact"),
              control: (
                <BuildFilterSelect
                  label="Impact"
                  value={impactValue}
                  onValueChange={handleImpactChange}
                  options={IMPACT_OPTIONS}
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

        {!isStatsLoading && !isLoading ? (
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
          <BuildListSurface<Risk>
            permission="build:risks:view"
            rows={displayed}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={isFiltered}
            getRowKey={(row) => row.id}
            minWidth="780px"
            mobileCard={renderMobileCard}
            loadingHeaders={RISK_TABLE_HEADERS}
            loadingRows={12}
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
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="alert"
                title="No risks logged"
                description="Log risks to track probability, impact, and mitigation plans."
                action={
                  canManage
                    ? { label: "New Risk", onClick: handleNewRisk }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="alert"
                title="No risks match your filters"
                description="Try adjusting the filters to see more risks."
                onClearFilters={handleClearAll}
              />
            }
            onRetry={handleRetry}
          />
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
