"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import Link from "next/link";
import {
  usePortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PortfolioStatusBadge, PortfolioHealthBadge } from "./portfolio-status-badge";
import { PortfolioFormSheet } from "./portfolio-form-sheet";
import type { Portfolio, CreatePortfolioInput, UpdatePortfolioInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";

function NewPortfolioButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
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
  const handleDelete = useCallback(() => onDelete(portfolio), [portfolio, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-7" aria-label="Portfolio actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>Delete</DropdownMenuItem>
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
  const canManage = useCan("projects:portfolios:manage");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);

  const { data, isLoading, isError, refetch } = usePortfolios({
    status: statusFilter !== "all" ? statusFilter : undefined,
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

  const displayed = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter((p) => p.name.toLowerCase().includes(q));
  }, [data, search]);

  function handleCreate(input: CreatePortfolioInput) {
    createPortfolio.mutate(input, {
      onSuccess: () => {
        toast.success("Portfolio created");
        setSheetOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdatePortfolioInput & { id: number }) {
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
    setSearch(value);
  }

  function handleClearFilters() {
    setStatusFilter("all");
    setSearch("");
  }

  function handleOpenCreate() {
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) {
      setSheetOpen(false);
      setEditTarget(null);
    }
  }

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
      sortable: true,
      sortValue: (r) => r.name,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`/projects/portfolios/${row.id}`}
          className={cn("font-medium text-foreground hover:text-primary", TEXT_ONE_LINE)}
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
      key: "strategicGoal",
      header: "Strategic Goal",
      cell: (row) => (
        <span
          className={cn("max-w-[200px] text-sm text-muted-foreground", TEXT_ONE_LINE)}
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
          <PortfolioRowActions portfolio={row} onEdit={handleEditRow} onDelete={handleDeleteRow} />
        ) : null,
    },
  ];

  const isFiltered = statusFilter !== "all" || !!search.trim();
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
        className="w-52"
        placeholder="Search portfolios…"
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
      title="Portfolios"
      subtitle="Group related projects into portfolios"
      filters={filtersBar}
      actions={canManage ? <NewPortfolioButton onClick={handleOpenCreate} /> : undefined}
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
                title={isFiltered ? "No matching portfolios" : "No portfolios yet"}
                description={
                  isFiltered
                    ? "Try adjusting your filters."
                    : "Create a portfolio to group and govern your projects."
                }
                action={
                  isFiltered
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : canManage
                      ? { label: "New Portfolio", onClick: handleOpenCreate }
                      : undefined
                }
              />
          ) : (
            <PmPanel className={PM_FILL_PANEL}>
              <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="780px"
                className="min-h-0 flex-1"
              />
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <PortfolioFormSheet
        open={sheetOpen || !!editTarget}
        onOpenChange={handleSheetOpenChange}
        mode={editTarget ? "edit" : "create"}
        defaultValues={editTarget ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        isPending={createPortfolio.isPending || updatePortfolio.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this portfolio?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Projects will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
