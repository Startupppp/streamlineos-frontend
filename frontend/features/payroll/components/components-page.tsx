"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_ROW_STACKS_ON_MOBILE, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/ui/data-table";
import { useCursorPager } from "@/components/ui/table-pagination";
import { EmptyPayroll } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePayrollComponents, useDeletePayrollComponent } from "@/hooks/api/payroll";
import type { ComponentType } from "@/types/payroll/setup";
import type { SalaryComponentListItem } from "@/hooks/api/payroll/components-schema";
import { buildComponentColumns } from "./component-columns";
import { ComponentFormSheet } from "./component-form-sheet";
import { BreakupPreviewSheet } from "./breakup-preview-sheet";
import { duplicatedRoles } from "./lib/component-role";
import { useCan } from "@/hooks/api/access";

const COMPONENT_PAGE_SIZE = 20;

const TYPE_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: "EARNING", label: "Earning" },
  { value: "DEDUCTION", label: "Deduction" },
  { value: "EMPLOYER_CONTRIBUTION", label: "Employer Contribution" },
  { value: "REIMBURSEMENT", label: "Reimbursement" },
  { value: "TAX", label: "Tax" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export function ComponentsPageContent() {
  const canManage = useCan("payroll:components:manage");
  const router = useRouter();
  const searchParams = useSearchParams();

  const typeFilter = searchParams.get("type") ?? "";
  const activeFilter = searchParams.get("active") ?? "";

  const [searchInput, setSearchInput] = useState<string>(
    () => searchParams.get("search") ?? "",
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SalaryComponentListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalaryComponentListItem | null>(null);

  const deleteMutation = useDeletePayrollComponent();

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const pager = useCursorPager(`${typeFilter}|${activeFilter}|${debouncedSearch}`);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ search: debouncedSearch });
  }, [debouncedSearch, searchParams, updateParams]);

  const { data, isLoading, isError, error, refetch } = usePayrollComponents({
    search: debouncedSearch.trim() || undefined,
    type: (typeFilter as ComponentType) || undefined,
    active:
      activeFilter === "true" ? true : activeFilter === "false" ? false : undefined,
    cursor: pager.cursor,
    limit: COMPONENT_PAGE_SIZE,
  });

  const { data: activeCatalog } = usePayrollComponents({ active: true, limit: 100 });
  const duplicates = useMemo(() => duplicatedRoles(activeCatalog?.items ?? []), [activeCatalog]);

  const filtersActive =
    searchInput.trim() !== "" || typeFilter !== "" || activeFilter !== "";

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    updateParams({ search: "", type: "", active: "" });
  }, [updateParams]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }
  function handleTypeChange(value: string) { updateParams({ type: value === "all" ? "" : value }); }
  function handleActiveChange(value: string) { updateParams({ active: value === "all" ? "" : value }); }

  function handleNextPage() {
    pager.goNext(data?.pagination.nextCursor);
  }

  function handleEdit(row: SalaryComponentListItem) {
    setEditTarget(row);
    setSheetOpen(true);
  }

  function handleDeleteRequest(row: SalaryComponentListItem) { setDeleteTarget(row); }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const deactivates = deleteTarget.profileCount > 0;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(deactivates ? "Component deactivated" : "Component deleted");
        setDeleteTarget(null);
      },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTarget(null); },
    });
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }

  function handleAddNew() { setEditTarget(null); setSheetOpen(true); }

  const columns = buildComponentColumns(handleEdit, handleDeleteRequest, canManage, duplicates);

  const filters = (
    <>
      <SearchInput
        value={searchInput}
        onValueChange={handleSearchChange}
        placeholder="Search components…"
      />
      <Select value={typeFilter || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} h-9 w-44`}>
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {TYPE_OPTIONS.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={activeFilter || "all"} onValueChange={handleActiveChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} h-9 w-32`}>
          <SelectValue placeholder="All status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <>
      <PageWrapper
        title="Component Catalog"
        subtitle="Manage salary components used in payroll runs"
        badge={data?.items.length}
        filters={filters}
        filtersClassName={FILTER_ROW_STACKS_ON_MOBILE}
        actions={
          <>
            <BreakupPreviewSheet />
            {canManage ? (
              <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleAddNew}>
                Add Component
              </AnimatedIconButton>
            ) : null}
          </>
        }
      >
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load components"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={data?.items ?? []}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            minWidth="700px"
            pagination={{
              mode: "cursor",
              pageSize: COMPONENT_PAGE_SIZE,
              hasMore: data?.pagination.hasMore ?? false,
              hasPrevious: pager.hasPrevious,
              onNext: handleNextPage,
              onPrevious: pager.goPrevious,
            }}
            emptyState={
              <EmptyState
                illustration={<EmptyPayroll />}
                title="No components yet"
                description={
                  filtersActive
                    ? undefined
                    : "Add salary components like basic pay, HRA, PF, or custom allowances"
                }
                filtersActive={filtersActive}
                onClearFilters={handleClearFilters}
                action={
                  canManage && !filtersActive
                    ? { label: "Add Component", onClick: handleAddNew }
                    : undefined
                }
              />
            }
          />
        )}
      </PageWrapper>

      {canManage && (
        <ComponentFormSheet
          component={editTarget}
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
        />
      )}

      {canManage && <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.profileCount > 0 ? "Deactivate component?" : "Delete component?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.profileCount > 0
                ? `${deleteTarget.name} (${deleteTarget.code}) is used by ${deleteTarget.profileCount} salary profile${deleteTarget.profileCount === 1 ? "" : "s"}, so it will be deactivated, not deleted. Future runs stop paying it.`
                : `${deleteTarget?.name ?? ""} (${deleteTarget?.code ?? ""}) is not used by any salary profile, so it will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                variant="destructive"
                onClick={handleDeleteConfirm}
                isPending={deleteMutation.isPending}
                loadingText={deleteTarget && deleteTarget.profileCount > 0 ? "Deactivating…" : "Deleting…"}
              >
                {deleteTarget && deleteTarget.profileCount > 0 ? "Deactivate" : "Delete"}
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </>
  );
}
