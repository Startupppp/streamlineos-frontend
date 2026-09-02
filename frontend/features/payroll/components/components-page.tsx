"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/ui/data-table";
import { EmptyPayroll } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePayrollComponents, useDeletePayrollComponent } from "@/hooks/api/payroll";
import type { SalaryComponent, ComponentType } from "@/types/payroll/setup";
import { buildComponentColumns } from "./component-columns";
import { ComponentFormSheet } from "./component-form-sheet";
import { useCan } from "@/hooks/api/access";

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
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [searchInput, setSearchInput] = useState<string>(
    () => searchParams.get("search") ?? "",
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SalaryComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalaryComponent | null>(null);

  const deleteMutation = useDeletePayrollComponent();

  const debouncedSearch = useDebouncedValue(searchInput, 300);

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
    page,
    pageSize: 20,
  });

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

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleEdit(row: SalaryComponent) {
    setEditTarget(row);
    setSheetOpen(true);
  }

  function handleDeleteRequest(row: SalaryComponent) { setDeleteTarget(row); }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: (result) => {
        toast[result.softDeleted ? "info" : "success"](
          result.softDeleted
            ? "Component deactivated (it has existing data)"
            : "Component deleted",
        );
        setDeleteTarget(null);
      },
      onError: () => { toast.error("Failed to delete component"); setDeleteTarget(null); },
    });
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }

  function handleAddNew() { setEditTarget(null); setSheetOpen(true); }

  const columns = buildComponentColumns(handleEdit, handleDeleteRequest, canManage);

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
        badge={data?.total ?? 0}
        filters={filters}
        actions={
          canManage ? (
            <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleAddNew}>
              Add Component
            </AnimatedIconButton>
          ) : undefined
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
              mode: "server",
              page,
              pageSize: 20,
              total: data?.total ?? 0,
              onPageChange: handlePageChange,
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
            <AlertDialogTitle>Delete component?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} ({deleteTarget?.code}) will be permanently deleted.
              If it has existing payroll data, it will be deactivated instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                variant="destructive"
                onClick={handleDeleteConfirm}
                isPending={deleteMutation.isPending}
                loadingText="Deleting…"
              >
                Delete
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </>
  );
}
