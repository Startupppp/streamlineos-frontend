"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  usePrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  usePortfolios,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCursorPager } from "@/components/ui/table-pagination";
import { ProgramFormSheet } from "./program-form-sheet";
import type {
  Program,
  CreateProgramInput,
  UpdateProgramInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import type { NamedUser } from "@/lib/person-display";
import {
  PROGRAM_TABLE_HEADERS,
  ProgramMobileCard,
  buildProgramColumns,
} from "./program-table-columns";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((option) => option.value),
  },
] as const;

export function ProgramsPage() {
  const canManage = useCan("build:programs:manage");
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const statusValue = listFilters.value("status");
  const { data, isLoading, isError, error, refetch } = usePrograms({
    cursor,
    limit: PAGE_SIZE,
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
  });
  const { data: portfoliosPage } = usePortfolios();
  const portfolios = useMemo(() => portfoliosPage?.data ?? [], [portfoliosPage]);
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();

  const ownerOf = useCallback(
    (ownerId: string | null): NamedUser | null => {
      if (!ownerId) return null;
      const match = members.find((member) => member.userId === ownerId);
      return match ? { name: match.name, email: match.email } : null;
    },
    [members],
  );

  const portfolioName = useCallback(
    (portfolioId: number | null): string => {
      if (portfolioId === null) return "—";
      return portfolios.find((p) => p.id === portfolioId)?.name ?? "—";
    },
    [portfolios],
  );

  const rows = useMemo(() => data?.data ?? [], [data]);
  const search = listFilters.debouncedSearch.trim().toLowerCase();
  const displayed = useMemo(() => {
    if (!search) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(search));
  }, [rows, search]);

  const resolution = usePageState({
    permission: "build:programs:view",
    isLoading,
    isError,
    error,
    isEmpty: displayed.length === 0,
  });

  const handleCreate = useCallback(
    (input: CreateProgramInput) => {
      createProgram.mutate(input, {
        onSuccess: () => {
          toast.success("Program created");
          setCreateOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createProgram, setCreateOpen],
  );

  const handleEdit = useCallback(
    (input: UpdateProgramInput & { programId: number }) => {
      updateProgram.mutate(input, {
        onSuccess: () => {
          toast.success("Program updated");
          setEditTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateProgram],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteProgram.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Program deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteProgram, deleteTarget]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleOpenCreate = useCallback(() => {
    openCreate();
  }, [openCreate]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setCreateOpen(false);
        setEditTarget(null);
      }
    },
    [setCreateOpen],
  );

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const handleEditRow = useCallback(
    (row: Program) => setEditTarget(row),
    [],
  );
  const handleDeleteRow = useCallback(
    (row: Program) => setDeleteTarget(row),
    [],
  );

  const columns = useMemo(
    () =>
      buildProgramColumns({
        canManage,
        ownerOf,
        portfolioName,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
      }),
    [canManage, handleDeleteRow, handleEditRow, ownerOf, portfolioName],
  );

  const renderMobileCard = useCallback(
    (row: Program) => (
      <ProgramMobileCard
        program={row}
        canManage={canManage}
        ownerOf={ownerOf}
        portfolioName={portfolioName}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, handleDeleteRow, handleEditRow, ownerOf, portfolioName],
  );

  return (
    <PageWrapper
      title="Programs"
      subtitle="Coordinate related projects as a single program of work"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search programs…",
            label: "Search programs",
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
                    label: "New program",
                    icon: Plus,
                    primary: true,
                    onSelect: handleOpenCreate,
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
            resolution={resolution}
            loading={
              <DataTableSkeleton mobileCards
                rows={12}
                headers={PROGRAM_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No programs yet"
                description="Create a program to coordinate related projects toward one outcome."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  canManage
                    ? { label: "New program", onClick: handleOpenCreate }
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
              pagination={{
                mode: "cursor",
                pageSize: PAGE_SIZE,
                hasMore: Boolean(data?.pagination.hasMore),
                hasPrevious,
                onNext: handleNextPage,
                onPrevious: goPrevious,
              }}
            />
          </PageState>
        </PmSection>
      </PmPageShell>

      <ProgramFormSheet
        open={createOpen || !!editTarget}
        onOpenChange={handleSheetOpenChange}
        mode={editTarget ? "edit" : "create"}
        defaultValues={editTarget ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        isPending={createProgram.isPending || updateProgram.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this program?"
        description="This action cannot be undone. Projects will not be deleted."
        confirmLabel="Delete"
        destructive
        isPending={deleteProgram.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
