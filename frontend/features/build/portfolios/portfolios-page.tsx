"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import Link from "next/link";
import {
  usePortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";

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
} from "./portfolio-status-badge";
import { PortfolioFormSheet } from "./portfolio-form-sheet";
import type {
  Portfolio,
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

function NewPortfolioButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> New Portfolio
    </Button>
  );
}

function PortfolioRowActions({
  portfolio,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
  onEdit: (p: Portfolio) => void;
  onDelete: (p: Portfolio) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(portfolio), [portfolio, onEdit]);
  const handleDelete = useCallback(
    () => onDelete(portfolio),
    [portfolio, onDelete],
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Portfolio actions"
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

export function PortfoliosPage() {
  const canManage = useCan("build:portfolios:manage");

  const { cursor, setCursor, setListParams, clearFilters } = useBuildListUrlState();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") ?? "all";
  const urlQ = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlQ);
  const debouncedSearchInput = useDebouncedValue(searchInput, 300);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearchInput === current) return;
    setListParams({ q: debouncedSearchInput || null });
  }, [debouncedSearchInput, searchParams, setListParams]);

  const { data, isLoading, isError, error, refetch } = usePortfolios({
    cursor: cursor ?? undefined,
    limit: 20,
    status: urlStatus !== "all" ? urlStatus : undefined,
  });
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  function memberName(userId: string | null): string {
    if (!userId) return "—";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? "Unknown";
  }

  const rows = data?.data ?? [];
  const displayed = useMemo(() => {
    if (!searchInput.trim()) return rows;
    const q = searchInput.toLowerCase();
    return rows.filter((p) => p.name.toLowerCase().includes(q));
  }, [rows, searchInput]);

  const resolution = usePageState({
    permission: "build:portfolios:view",
    isLoading,
    isError,
    error,
    isEmpty: displayed.length === 0,
  });

  function handleCreate(input: CreatePortfolioInput) {
    createPortfolio.mutate(input, {
      onSuccess: () => {
        toast.success("Portfolio created");
        setCreateOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdatePortfolioInput & { portfolioId: number }) {
    updatePortfolio.mutate(input, {
      onSuccess: () => {
        toast.success("Portfolio updated");
        setEditTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deletePortfolio.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Portfolio deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  function handleStatusChange(value: string) {
    setListParams({ status: value !== "all" ? value : null });
    setCursorStack([]);
  }

  function handleClearFilters() {
    setSearchInput("");
    clearFilters();
    setCursorStack([]);
  }

  function handleNextPage() {
    const nextCursor = data?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  }

  function handlePrevPage() {
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((prev) => prev.slice(0, -1));
    setCursor(prevCursor === "" ? null : prevCursor);
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

  function handleEditRow(row: Portfolio) {
    setEditTarget(row);
  }

  function handleDeleteRow(row: Portfolio) {
    setDeleteTarget(row);
  }

  const columns: DataTableColumn<Portfolio>[] = [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`/build/portfolios/${row.id}`}
          className={cn(
            "font-medium text-foreground hover:text-primary",
            TEXT_ONE_LINE,
          )}
          title={row.name}
        >
          {row.name}
        </Link>
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
      key: "ownerId",
      header: "Owner",
      cell: (row) => (
        <span
          className={cn(
            "max-w-[140px] text-sm text-muted-foreground",
            TEXT_ONE_LINE,
          )}
        >
          {memberName(row.ownerId)}
        </span>
      ),
    },
    {
      key: "projectCount",
      header: "Projects",
      className: "w-20",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {row.projectCount ?? 0}
        </span>
      ),
    },
    {
      key: "strategicGoal",
      header: "Strategic Goal",
      cell: (row) => (
        <span
          className={cn(
            "max-w-[200px] text-sm text-muted-foreground",
            TEXT_ONE_LINE,
          )}
          title={row.strategicGoal ?? undefined}
        >
          {row.strategicGoal ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <PortfolioRowActions
            portfolio={row}
            onEdit={handleEditRow}
            onDelete={handleDeleteRow}
          />
        ) : null,
    },
  ];

  const isFiltered = urlStatus !== "all" || !!searchInput.trim();
  const hasPrev = cursorStack.length > 0;
  const hasNext = !!data?.pagination.hasMore;

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={urlStatus} onValueChange={handleStatusChange}>
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
        placeholder="Search portfolios…"
        value={searchInput}
        onValueChange={handleSearchChange}
      />
      {isFiltered ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={handleClearFilters}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title="Portfolios"
      subtitle="Group related projects into portfolios"
      filters={filtersBar}
      actions={
        canManage ? (
          <NewPortfolioButton onClick={handleOpenCreate} />
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={resolution}
            loading={
              <DataTableSkeleton rows={12} columns={7} className="flex-1" />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No portfolios yet"
                description={
                  isFiltered
                    ? undefined
                    : "Create a portfolio to group and govern your projects."
                }
                filtersActive={isFiltered}
                onClearFilters={handleClearFilters}
                action={
                  canManage && !isFiltered
                    ? { label: "New Portfolio", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <>
              <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="780px"
                className={PM_FILL_PANEL}
              />
              {hasPrev || hasNext ? (
                <div className="flex items-center justify-end gap-2 border-t px-2 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={handlePrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    onClick={handleNextPage}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          </PageState>
        </PmSection>
      </PmPageShell>

      <PortfolioFormSheet
        open={createOpen || !!editTarget}
        onOpenChange={handleSheetOpenChange}
        mode={editTarget ? "edit" : "create"}
        defaultValues={editTarget ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        isPending={createPortfolio.isPending || updatePortfolio.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this portfolio?"
        description="This action cannot be undone. Projects will not be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
