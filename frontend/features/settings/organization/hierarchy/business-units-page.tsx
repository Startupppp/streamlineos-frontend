"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { Archive, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RequireModule } from "@/components/auth/require-module";
import { ErrorState } from "@/components/shared/error-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { useCan } from "@/hooks/api/access";
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
} from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { OrgBusinessUnit } from "@/types/org-hierarchy";
import { BusinessUnitForm } from "./business-unit-form";
import type { BusinessUnitFormValues } from "./business-unit-form-schema";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { HierarchyEntityFormSheet } from "./hierarchy-entity-form-sheet";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { useHierarchyListState } from "./use-hierarchy-list-state";

export function BusinessUnitsPage() {
  const {
    page,
    pageSize,
    query,
    search,
    serverSearch,
    showArchived,
    nextPage,
    previousPage,
    setPageSize,
    setSearch,
    setStatus,
    toggleArchived,
  } = useHierarchyListState();
  const {
    data: businessUnitsPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useBusinessUnits(query);
  const createBusinessUnit = useCreateBusinessUnit();
  const updateBusinessUnit = useUpdateBusinessUnit();
  const canManage = useCan("settings:organization:manage");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingBusinessUnit, setEditingBusinessUnit] =
    useState<OrgBusinessUnit | null>(null);

  const archiveFlow = useHierarchyArchive<OrgBusinessUnit>({
    unitKind: "BUSINESS_UNIT",
    archive: (businessUnit, callbacks) =>
      updateBusinessUnit.mutate(
        { id: businessUnit.id, status: "ARCHIVED" },
        callbacks,
      ),
    successMessage: "Business unit archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const handleCreate = useCallback(
    (values: BusinessUnitFormValues) => {
      createBusinessUnit.mutate(
        { ...values, code: values.code.toUpperCase() },
        {
          onSuccess: () => {
            toast.success("Business unit created");
            setCreateSheetOpen(false);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [createBusinessUnit],
  );

  const handleUpdate = useCallback(
    (values: BusinessUnitFormValues) => {
      if (!editingBusinessUnit) return;
      updateBusinessUnit.mutate(
        {
          id: editingBusinessUnit.id,
          ...values,
          code: values.code.toUpperCase(),
        },
        {
          onSuccess: () => {
            toast.success("Business unit updated");
            setEditingBusinessUnit(null);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [editingBusinessUnit, updateBusinessUnit],
  );

  const handleRestore = useCallback(
    (businessUnit: OrgBusinessUnit) => {
      updateBusinessUnit.mutate(
        { id: businessUnit.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Business unit restored");
            setStatus("CURRENT");
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [setStatus, updateBusinessUnit],
  );

  const handleOpenCreate = useCallback(() => setCreateSheetOpen(true), []);
  const handleSearchInputChange = useCallback(
    (searchValue: string) => setSearch(searchValue),
    [setSearch],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleClearSearch = useCallback(() => setSearch(""), [setSearch]);

  function makeRestoreHandler(businessUnit: OrgBusinessUnit) {
    return () => handleRestore(businessUnit);
  }

  function makeArchiveHandler(businessUnit: OrgBusinessUnit) {
    return () => archiveFlow.requestArchive(businessUnit);
  }

  function makeEditHandler(businessUnit: OrgBusinessUnit) {
    return () => setEditingBusinessUnit(businessUnit);
  }

  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditingBusinessUnit(null);
  }

  function handleNextPage() {
    nextPage(businessUnitsPage?.pageInfo.nextCursor);
  }

  const columns: DataTableColumn<OrgBusinessUnit>[] = [
    {
      key: "name",
      header: "Name",
      cell: (businessUnit) => (
        <span className="font-medium">{businessUnit.name}</span>
      ),
      sortable: true,
      sortValue: (businessUnit) => businessUnit.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (businessUnit) => (
        <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
          {businessUnit.code}
        </code>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (businessUnit) => (
        <Badge
          variant={
            businessUnit.status === "ACTIVE" ? "default" : "secondary"
          }
          className="h-5 px-1.5 py-0 text-micro"
        >
          {businessUnit.status}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (businessUnit) => (
        <span className="block max-w-[200px] truncate text-muted-foreground">
          {businessUnit.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (businessUnit) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {businessUnit.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(businessUnit)}
                title="Restore"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeEditHandler(businessUnit)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(businessUnit)}
                  title="Archive"
                >
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        ) : null,
    },
  ];

  const emptyState = showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived business units"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="companies"
      title="No business units yet"
      description={serverSearch ? undefined : "Create your first business unit to get started."}
      filtersActive={!!serverSearch}
      onClearFilters={handleClearSearch}
      action={canManage && !serverSearch ? { label: "Add Business Unit", onClick: handleOpenCreate } : undefined}
    />
  );

  return (
    <RequireModule module="hr">
      <PageWrapper
        title="Business Units"
        subtitle="Top-level divisions of your organization."
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs sm:flex-none"
              onClick={toggleArchived}
            >
              <Archive className="mr-1.5 h-4 w-4" />
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
                Add Business Unit
              </AnimatedIconButton>
            ) : null}
          </div>
        }
        filters={
          <SearchInput
            value={search}
            placeholder="Search business units…"
            onValueChange={handleSearchInputChange}
          />
        }
      >
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load business units"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={businessUnitsPage?.data ?? []}
            columns={columns}
            getRowKey={(businessUnit) => businessUnit.id}
            isLoading={isLoading}
            emptyState={emptyState}
            rowClassName={(businessUnit) =>
              cn(businessUnit.status === "ARCHIVED" && "opacity-60")
            }
            minWidth="580px"
            className="flex-1 min-h-0"
            footer={
              page > 1 || businessUnitsPage?.pageInfo.hasMore ? (
                <CursorPageControls
                  page={page}
                  hasNext={businessUnitsPage?.pageInfo.hasMore ?? false}
                  disabled={isLoading}
                  onPrevious={previousPage}
                  onNext={handleNextPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              ) : undefined
            }
          />
        )}

        <HierarchyEntityFormSheet
          open={createSheetOpen}
          onOpenChange={setCreateSheetOpen}
          title="New Business Unit"
          formId="business-unit-form"
          isPending={createBusinessUnit.isPending}
        >
          {createSheetOpen ? <BusinessUnitForm onSubmit={handleCreate} /> : null}
        </HierarchyEntityFormSheet>

        <HierarchyEntityFormSheet
          open={!!editingBusinessUnit}
          onOpenChange={handleEditSheetOpenChange}
          title="Edit Business Unit"
          formId="business-unit-form"
          isPending={updateBusinessUnit.isPending}
        >
          {editingBusinessUnit ? (
            <BusinessUnitForm
              defaultValues={{
                name: editingBusinessUnit.name,
                code: editingBusinessUnit.code,
                description: editingBusinessUnit.description ?? "",
              }}
              onSubmit={handleUpdate}
            />
          ) : null}
        </HierarchyEntityFormSheet>

        <HierarchyArchiveDialog
          open={!!archiveFlow.target}
          unitName={archiveFlow.target?.name ?? ""}
          unitLabel="business unit"
          isPending={updateBusinessUnit.isPending}
          error={archiveFlow.error}
          preflightError={archiveFlow.preflightError}
          dependencies={archiveFlow.dependencies}
          isChecking={archiveFlow.isChecking}
          onRetryPreflight={archiveFlow.retryPreflight}
          onConfirm={archiveFlow.confirmArchive}
          onOpenChange={archiveFlow.handleOpenChange}
        />
      </PageWrapper>
    </RequireModule>
  );
}
