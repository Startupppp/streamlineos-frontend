"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  useProjectDecisions,
  useCreateDecision,
  useUpdateDecision,
  useDeleteDecision,
  GOVERNANCE_PAGE_SIZE,
} from "@/hooks/api/build/governance";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCan } from "@/hooks/api/access";
import type {
  Decision,
  CreateDecisionInput,
  UpdateDecisionInput,
} from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import { DecisionFormSheet } from "./decision-form-sheet";
import {
  PmPageShell,
  PmSection,
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
  {
    param: "ownerId",
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

  const { cursor, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const statusValue = listFilters.value("status");
  const ownerIdValue = listFilters.value("ownerId");
  const { data, isLoading, isError, error, refetch } = useProjectDecisions(
    projectId,
    {
      status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
      ownerId: ownerIdValue !== BUILD_FILTER_ALL ? ownerIdValue : undefined,
      cursor: cursor === undefined ? undefined : Number(cursor),
      search: listFilters.debouncedSearch.trim() || undefined,
    },
  );
  const { data: membersPage } = useProjectMembers(projectId);
  const members = membersPage?.data ?? [];

  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All owners" },
      ...members.map((m) => ({
        value: String(m.id),
        label: m.name ?? m.email ?? String(m.id),
      })),
    ],
    [members],
  );

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

  const handleOwnerChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value),
    [listFilters],
  );

  const handleNewDecision = useCallback(() => setSheetOpen(true), []);

  const handleEditRow = useCallback((d: Decision) => setEditDecision(d), []);
  const handleDeleteRow = useCallback((d: Decision) => setDeleteTarget(d), []);

  const handleEditDecisionByIndex = useCallback(
    (index: number) => {
      if (allDecisions[index]) handleEditRow(allDecisions[index]);
    },
    [allDecisions, handleEditRow],
  );
  const handleOpenFocused = useCallback(
    (index: number) => {
      setEditDecision(allDecisions[index]);
      setSheetOpen(true);
    },
    [allDecisions],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: allDecisions.length,
    onOpen: handleOpenFocused,
    onEdit: canManage ? handleEditDecisionByIndex : undefined,
    onCreate: canManage ? handleNewDecision : undefined,
    onClearSelection: handleClearKeyboardSelection,
    enabled: !sheetOpen && !editDecision && !deleteTarget,
  });

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
            {
              id: "ownerId",
              label: "Owner",
              active: listFilters.isActive("ownerId"),
              control: (
                <BuildFilterSelect
                  label="Owner"
                  value={ownerIdValue}
                  onValueChange={handleOwnerChange}
                  options={ownerOptions}
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
          <BuildListSurface<Decision>
            permission="build:decisions:view"
            rows={allDecisions}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            minWidth="720px"
            mobileCard={renderMobileCard}
            loadingHeaders={DECISION_TABLE_HEADERS}
            loadingRows={12}
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
                illustrationPreset="documents"
                title="No decisions recorded"
                description="Record key project decisions to maintain a clear audit trail."
                action={
                  canManage
                    ? { label: "Log Decision", onClick: handleNewDecision }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="documents"
                title="No decisions match your filters"
                description="Try adjusting the filters to see more decisions."
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
          />
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
