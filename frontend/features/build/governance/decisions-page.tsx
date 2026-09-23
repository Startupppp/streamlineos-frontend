"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  useProjectDecisions,
  useCreateDecision,
  useUpdateDecision,
  useDeleteDecision,
  useProjectMembers,
  GOVERNANCE_PAGE_SIZE,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import type {
  Decision,
  CreateDecisionInput,
  UpdateDecisionInput,
} from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { useCursorPager } from "@/components/ui/table-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import { DecisionFormSheet } from "./decision-form-sheet";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import {
  DECISION_TABLE_HEADERS,
  buildDecisionColumns,
  DecisionMobileCard,
} from "./decisions-table-columns";

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "proposed", label: "Proposed" },
  { value: "accepted", label: "Accepted" },
  { value: "superseded", label: "Superseded" },
  { value: "revisit", label: "Revisit" },
];

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((o) => o.value),
  },
] as const;

interface DecisionsPageProps {
  projectId: number;
}

export function DecisionsPage({ projectId }: DecisionsPageProps) {
  const canManage = useCan("build:decisions:manage");
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDecision, setEditDecision] = useState<Decision | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Decision | null>(null);

  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const statusValue = listFilters.value("status");
  const { data, isLoading, isError, error, refetch } = useProjectDecisions(
    projectId,
    {
      status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
      cursor: cursor === undefined ? undefined : Number(cursor),
    },
  );
  const { data: members = [] } = useProjectMembers(projectId);
  const pageState = usePageState({
    permission: "build:decisions:view",
    isLoading,
    isError,
    error,
  });

  const createDecision = useCreateDecision(projectId);
  const updateDecision = useUpdateDecision(projectId);
  const deleteDecision = useDeleteDecision(projectId);

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

  const allDecisions = useMemo(() => data?.data ?? [], [data]);

  const search = listFilters.debouncedSearch.trim().toLowerCase();
  const displayed = useMemo(() => {
    if (!search) return allDecisions;
    return allDecisions.filter(
      (d) =>
        d.title.toLowerCase().includes(search) ||
        `dec-${d.decisionNumber}`.includes(search),
    );
  }, [allDecisions, search]);

  const handleCreate = useCallback(
    (input: CreateDecisionInput) => {
      createDecision.mutate(input, {
        onSuccess: () => {
          toast.success("Decision logged");
          setSheetOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createDecision],
  );

  const handleUpdate = useCallback(
    (input: UpdateDecisionInput & { decisionId: number }) => {
      updateDecision.mutate(input, {
        onSuccess: () => {
          toast.success("Decision updated");
          setEditDecision(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateDecision],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteDecision.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Decision deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteDecision, deleteTarget]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleNewDecision = useCallback(() => setSheetOpen(true), []);

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
      setEditDecision(null);
    }
  }, []);

  const handleEditRow = useCallback((d: Decision) => setEditDecision(d), []);
  const handleDeleteRow = useCallback((d: Decision) => setDeleteTarget(d), []);

  const columns = useMemo(
    () =>
      buildDecisionColumns({
        canManage,
        memberName,
        ownerOf,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
      }),
    [canManage, memberName, ownerOf, handleEditRow, handleDeleteRow],
  );

  const renderMobileCard = useCallback(
    (row: Decision) => (
      <DecisionMobileCard
        decision={row}
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
      title="Decisions Log"
      subtitle="Log and track key project decisions for accountability and audit"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search decisions…",
            label: "Search decisions",
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
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canManage
              ? [
                  {
                    id: "create",
                    label: "New Decision",
                    icon: Plus,
                    primary: true,
                    onSelect: handleNewDecision,
                  },
                ]
              : []
          }
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton mobileCards
                rows={12}
                headers={DECISION_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="documents"
                title="No decisions recorded"
                description="Record key project decisions to maintain a clear audit trail."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  canManage
                    ? { label: "Log Decision", onClick: handleNewDecision }
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
              minWidth="720px"
              mobileCard={renderMobileCard}
              className={PM_FILL_PANEL}
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
