"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  usePrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  usePortfolios,
  useProjects,
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
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import {
  PROGRAM_TABLE_HEADERS,
  ProgramMobileCard,
  buildProgramColumns,
} from "./program-table-columns";
import {
  PROGRAM_FILTER_DEFINITIONS,
  PROGRAM_HEALTH_VALUES,
  PROGRAM_ORDER_VALUES,
  PROGRAM_SORT_VALUES,
  PROGRAM_STATUS_VALUES,
  ProgramsToolbar,
} from "./programs-toolbar";

const PAGE_SIZE = 25;

function positiveId(value: string): number | undefined {
  if (value === BUILD_FILTER_ALL) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function ProgramsPage() {
  const canManage = useCan("build:programs:manage");
  const listFilters = useBuildListFilters({
    filters: PROGRAM_FILTER_DEFINITIONS,
  });
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
  const healthValue = listFilters.value("health");
  const ownerIdValue = listFilters.value("ownerId");
  const portfolioIdValue = listFilters.value("portfolioId");
  const projectIdValue = listFilters.value("projectId");
  const sortValue = listFilters.value("sort");
  const orderValue = listFilters.value("order");
  const status = PROGRAM_STATUS_VALUES.find((value) => value === statusValue);
  const health = PROGRAM_HEALTH_VALUES.find((value) => value === healthValue);
  const sort = PROGRAM_SORT_VALUES.find((value) => value === sortValue);
  const order = PROGRAM_ORDER_VALUES.find((value) => value === orderValue);
  const normalizedOwnerId = ownerIdValue.trim();
  const ownerId =
    ownerIdValue === BUILD_FILTER_ALL ||
    normalizedOwnerId.length === 0 ||
    normalizedOwnerId.length > 255
      ? undefined
      : normalizedOwnerId;
  const portfolioId = positiveId(portfolioIdValue);
  const projectId = positiveId(projectIdValue);
  const query = listFilters.debouncedSearch.trim().slice(0, 120);

  const { data, isLoading, isError, error, refetch } = usePrograms({
    cursor,
    limit: PAGE_SIZE,
    q: query || undefined,
    ownerId,
    health,
    status,
    portfolioId,
    projectId,
    sort,
    order,
  });
  const { data: portfoliosPage } = usePortfolios({ limit: 100 });
  const portfolios = useMemo(() => portfoliosPage?.data ?? [], [portfoliosPage]);
  const { data: projectsPage } = useProjects({ limit: 100, status: "ALL" });
  const projects = useMemo(() => projectsPage?.data ?? [], [projectsPage]);
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

  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All owners" },
      ...members.map((member) => ({
        value: member.userId,
        label: getUserDisplayName(member),
      })),
    ],
    [members],
  );

  const portfolioOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All portfolios" },
      ...portfolios.map((portfolio) => ({
        value: String(portfolio.id),
        label: portfolio.name,
      })),
    ],
    [portfolios],
  );

  const projectOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All projects" },
      ...projects.map((project) => ({
        value: String(project.id),
        label: project.name,
      })),
    ],
    [projects],
  );

  const rows = useMemo(() => data?.data ?? [], [data]);

  const resolution = usePageState({
    permission: "build:programs:view",
    isLoading,
    isError,
    error,
    isEmpty: rows.length === 0,
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

  const handleOpenCreate = useCallback(() => {
    openCreate();
  }, [openCreate]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleOpenByIndex = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row) setEditTarget(row);
    },
    [rows],
  );
  const handleEditByIndex = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row) setEditTarget(row);
    },
    [rows],
  );
  const handleClearSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: rows.length,
    onOpen: handleOpenByIndex,
    onEdit: handleEditByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

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
        <ProgramsToolbar
          filters={listFilters}
          ownerOptions={ownerOptions}
          portfolioOptions={portfolioOptions}
          projectOptions={projectOptions}
          searchInputRef={searchInputRef}
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
              data={rows}
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
