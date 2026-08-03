"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
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
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PortfolioStatusBadge,
  PortfolioHealthBadge,
} from "@/features/build/portfolios/portfolio-status-badge";
import { ProgramFormSheet } from "./program-form-sheet";
import type { Program, CreateProgramInput, UpdateProgramInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

function NewProgramButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> New Program
    </Button>
  );
}

function ProgramRowActions({
  program,
  onEdit,
  onDelete,
}: {
  program: Program;
  onEdit: (p: Program) => void;
  onDelete: (p: Program) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(program), [program, onEdit]);
  const handleDelete = useCallback(() => onDelete(program), [program, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Program actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProgramsPage() {
  const canManage = useCan("build:programs:manage");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const { data, isLoading, isError, refetch } = usePrograms({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: portfolios } = usePortfolios();
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();

  const memberName = useCallback(
    (userId: string | null): string => {
      if (!userId) return "—";
      const m = members.find((x) => x.userId === userId);
      return m?.name ?? m?.email ?? "Unknown";
    },
    [members],
  );

  const portfolioName = useCallback(
    (portfolioId: number | null): string => {
      if (portfolioId === null) return "—";
      return (portfolios ?? []).find((p) => p.id === portfolioId)?.name ?? "—";
    },
    [portfolios],
  );

  const displayed = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter((p) => p.name.toLowerCase().includes(q));
  }, [data, search]);

  function handleCreate(input: CreateProgramInput) {
    createProgram.mutate(input, {
      onSuccess: () => {
        toast.success("Program created");
        setCreateOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdateProgramInput & { id: number }) {
    updateProgram.mutate(input, {
      onSuccess: () => {
        toast.success("Program updated");
        setEditTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteProgram.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Program deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleClearFilters() {
    setStatusFilter("all");
    setSearch("");
  }

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

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  function handleEditRow(row: Program) {
    setEditTarget(row);
  }

  function handleDeleteRow(row: Program) {
    setDeleteTarget(row);
  }

  const columns: DataTableColumn<Program>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span className={cn("font-medium text-foreground", TEXT_ONE_LINE)} title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <PortfolioStatusBadge status={row.status} />,
    },
    {
      key: "health",
      header: "Health",
      cell: (row) => <PortfolioHealthBadge health={row.health} />,
    },
    {
      key: "portfolioId",
      header: "Portfolio",
      cell: (row) => (
        <span className={cn("max-w-[160px] text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {portfolioName(row.portfolioId)}
        </span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: (row) => (
        <span className={cn("max-w-[140px] text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {memberName(row.ownerId)}
        </span>
      ),
    },
    {
      key: "projectCount",
      header: "Projects",
      className: "w-20",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">{row.projectCount ?? 0}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <ProgramRowActions program={row} onEdit={handleEditRow} onDelete={handleDeleteRow} />
        ) : null,
    },
  ];

  const isFiltered = statusFilter !== "all" || !!search.trim();
  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search programs…"
        value={search}
        onValueChange={handleSearchChange}
      />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isFiltered ? (
        <Button size="sm" variant="ghost" className="text-xs" onClick={handleClearFilters}>
          Clear
        </Button>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title="Programs"
      subtitle="Coordinate related projects as a single program of work"
      filters={filtersBar}
      actions={canManage ? <NewProgramButton onClick={handleOpenCreate} /> : undefined}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : displayed.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="projects"
              title={isFiltered ? "No matching programs" : "No programs yet"}
              description={
                isFiltered
                  ? "Try adjusting your filters."
                  : "Create a program to coordinate related projects toward one outcome."
              }
              action={
                isFiltered
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : canManage
                    ? { label: "New Program", onClick: handleOpenCreate }
                    : undefined
              }
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
