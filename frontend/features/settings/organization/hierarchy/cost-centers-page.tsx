"use client";

import { useState, useCallback } from "react";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgCostCenters,
  useCreateOrgCostCenter,
  useUpdateOrgCostCenter,
} from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import type { OrgCostCenter } from "@/types/org-hierarchy";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import {
  useHierarchyListState,
  useHierarchyPageBounds,
} from "./use-hierarchy-list-state";
import { useCan } from "@/hooks/api/access";
import { CostCenterForm } from "./cost-center-form";
import { HierarchyFormSheet } from "./hierarchy-form-sheet";
import { type CostCenterFormValues } from "./cost-centers-schema";

export function OrgCostCentersPage() {
  const {
    page,
    pageSize,
    query,
    search,
    serverSearch,
    showArchived,
    setPage,
    setPageSize,
    setSearch,
    setStatus,
    toggleArchived,
  } = useHierarchyListState();
  const {
    data: costCenters,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgCostCenters(query);
  const isCorrectingPage = useHierarchyPageBounds({
    page,
    pageSize,
    total: isError ? undefined : costCenters?.total,
    setPage,
  });
  const create = useCreateOrgCostCenter();
  const update = useUpdateOrgCostCenter();
  const canManage = useCan("settings:organization:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgCostCenter | null>(null);
  const archiveFlow = useHierarchyArchive<OrgCostCenter>({
    unitKind: "COST_CENTER",
    archive: (costCenter, callbacks) =>
      update.mutate({ id: costCenter.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Cost center archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const displayed = costCenters?.data ?? [];

  const handleCreate = useCallback(
    (values: CostCenterFormValues) => {
      create.mutate(
        {
          code: values.code.toUpperCase(),
          name: values.name,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Cost center created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: CostCenterFormValues) => {
      if (!editing) return;
      update.mutate(
        {
          id: editing.id,
          code: values.code.toUpperCase(),
          name: values.name,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Cost center updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (c: OrgCostCenter) => {
      update.mutate(
        { id: c.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Cost center restored");
            setStatus("CURRENT");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [setStatus, update],
  );

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function handleSearchChange(value: string) {
    setSearch(value);
  }
  function makeRestoreHandler(cc: OrgCostCenter) {
    return () => handleRestore(cc);
  }
  function makeArchiveHandler(cc: OrgCostCenter) {
    return () => archiveFlow.requestArchive(cc);
  }
  function makeSetEditingHandler(cc: OrgCostCenter) {
    return () => setEditing(cc);
  }
  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }

  const columns: DataTableColumn<OrgCostCenter>[] = [
    {
      key: "code",
      header: "Code",
      cell: (c) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.code}</code>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (c) => <span className="font-medium">{c.name}</span>,
      sortable: true,
      sortValue: (c) => c.name,
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <Badge
          variant={c.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            c.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : c.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {c.status}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (c) => (
        <span className="text-muted-foreground max-w-[200px] truncate block">
          {c.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (c) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {c.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(c)}
                title="Restore"
                aria-label="Restore cost center"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeSetEditingHandler(c)}
                  title="Edit"
                  aria-label="Edit cost center"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(c)}
                  title="Archive"
                  aria-label="Archive cost center"
                >
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        ) : null,
    },
  ];

  const emptyState = serverSearch ? (
    <EmptyState
      illustrationPreset="payroll"
      title={`No cost centers matching "${serverSearch}"`}
      description="Try a different search term."
      compact
      className="flex-1 min-h-0"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived cost centers"
      compact
      className="flex-1 min-h-0"
    />
  ) : (
    <EmptyState
      illustrationPreset="payroll"
      title="No cost centers yet"
      description="Create cost centers to classify payroll, budgets, and expenses for reporting."
      action={
        canManage
          ? { label: "Add Cost Center", onClick: handleOpenCreate }
          : undefined
      }
    />
  );

  return (
    <PageWrapper
      title="Cost Centers"
      subtitle="Classify payroll, budgets, and expenses for reporting."
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            className="flex-1 text-xs sm:flex-none"
            onClick={toggleArchived}
          >
            <Archive className="h-4 w-4 mr-1.5" />
            {showArchived ? "Show current" : "View archived"}
          </Button>
          {canManage ? (
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleOpenCreate}
            >
              Add Cost Center
            </AnimatedIconButton>
          ) : null}
        </div>
      }
      filters={
        <SearchInput
          placeholder="Search cost centers…"
          value={search}
          onValueChange={handleSearchChange}
        />
      }
    >
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load cost centers"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={displayed}
          columns={columns}
          getRowKey={(c) => c.id}
          isLoading={isLoading || isCorrectingPage}
          emptyState={emptyState}
          rowClassName={(c) => cn(c.status === "ARCHIVED" && "opacity-60")}
          minWidth="580px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: costCenters?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <HierarchyFormSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="New Cost Center"
        formId="cc-form"
        isPending={create.isPending}
      >
        <CostCenterForm onSubmit={handleCreate} isPending={create.isPending} />
      </HierarchyFormSheet>

      <HierarchyFormSheet
        open={!!editing}
        onOpenChange={handleEditSheetOpenChange}
        title="Edit Cost Center"
        formId="cc-form"
        isPending={update.isPending}
      >
        {editing && (
          <CostCenterForm
            defaultValues={{
              code: editing.code,
              name: editing.name,
              description: editing.description ?? "",
            }}
            onSubmit={handleUpdate}
            isPending={update.isPending}
          />
        )}
      </HierarchyFormSheet>

      <HierarchyArchiveDialog
        open={!!archiveFlow.target}
        unitName={archiveFlow.target?.name ?? ""}
        unitLabel="cost center"
        isPending={update.isPending}
        error={archiveFlow.error}
        preflightError={archiveFlow.preflightError}
        dependencies={archiveFlow.dependencies}
        isChecking={archiveFlow.isChecking}
        onRetryPreflight={archiveFlow.retryPreflight}
        onConfirm={archiveFlow.confirmArchive}
        onOpenChange={archiveFlow.handleOpenChange}
      />
    </PageWrapper>
  );
}
