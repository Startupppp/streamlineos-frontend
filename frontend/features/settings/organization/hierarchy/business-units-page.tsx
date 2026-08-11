"use client";

import { useState, useCallback } from "react";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
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
import type { OrgBusinessUnit } from "@/types/org-hierarchy";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import {
  useHierarchyListState,
  useHierarchyPageBounds,
} from "./use-hierarchy-list-state";
import { useCan } from "@/hooks/api/access";
import { BuForm } from "./business-unit-form";
import { HierarchyFormSheet } from "./hierarchy-form-sheet";
import { type BusinessUnitFormValues } from "./business-units-schema";

export function BusinessUnitsPage() {
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
    data: units,
    isLoading,
    isError,
    error,
    refetch,
  } = useBusinessUnits(query);
  const isCorrectingPage = useHierarchyPageBounds({
    page,
    pageSize,
    total: isError ? undefined : units?.total,
    setPage,
  });
  const create = useCreateBusinessUnit();
  const update = useUpdateBusinessUnit();
  const canManage = useCan("settings:organization:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgBusinessUnit | null>(null);
  const archiveFlow = useHierarchyArchive<OrgBusinessUnit>({
    unitKind: "BUSINESS_UNIT",
    archive: (unit, callbacks) =>
      update.mutate({ id: unit.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Business unit archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const displayed = units?.data ?? [];

  const handleCreate = useCallback(
    (values: BusinessUnitFormValues) => {
      create.mutate(
        { ...values, code: values.code.toUpperCase() },
        {
          onSuccess: () => {
            toast.success("Business unit created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: BusinessUnitFormValues) => {
      if (!editing) return;
      update.mutate(
        { id: editing.id, ...values, code: values.code.toUpperCase() },
        {
          onSuccess: () => {
            toast.success("Business unit updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (u: OrgBusinessUnit) => {
      update.mutate(
        { id: u.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Business unit restored");
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
  function makeRestoreHandler(unit: OrgBusinessUnit) {
    return () => handleRestore(unit);
  }
  function makeArchiveHandler(unit: OrgBusinessUnit) {
    return () => archiveFlow.requestArchive(unit);
  }
  function makeSetEditingHandler(unit: OrgBusinessUnit) {
    return () => setEditing(unit);
  }
  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }

  const columns: DataTableColumn<OrgBusinessUnit>[] = [
    {
      key: "name",
      header: "Name",
      cell: (u) => <span className="font-medium">{u.name}</span>,
      sortable: true,
      sortValue: (u) => u.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (u) => (
        <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
          {u.code}
        </code>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge
          variant={u.status === "ACTIVE" ? "default" : "secondary"}
          className="h-5 px-1.5 py-0 text-[10px]"
        >
          {u.status}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (u) => (
        <span className="text-muted-foreground max-w-[200px] truncate block">
          {u.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (u) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {u.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(u)}
                title="Restore"
                aria-label="Restore business unit"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeSetEditingHandler(u)}
                  title="Edit"
                  aria-label="Edit business unit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(u)}
                  title="Archive"
                  aria-label="Archive business unit"
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
      illustrationPreset="companies"
      title={`No business units matching "${serverSearch}"`}
      description="Try a different search term."
      compact
      className="flex-1 min-h-0"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived business units"
      compact
      className="flex-1 min-h-0"
    />
  ) : (
    <EmptyState
      illustrationPreset="companies"
      title="No business units yet"
      description="Create your first business unit to get started."
      action={
        canManage
          ? { label: "Add Business Unit", onClick: handleOpenCreate }
          : undefined
      }
    />
  );

  return (
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
              Add Business Unit
            </AnimatedIconButton>
          ) : null}
        </div>
      }
      filters={
        <SearchInput
          value={search}
          placeholder="Search business units…"
          onValueChange={handleSearchChange}
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
          data={displayed}
          columns={columns}
          getRowKey={(u) => u.id}
          isLoading={isLoading || isCorrectingPage}
          emptyState={emptyState}
          rowClassName={(u) => cn(u.status === "ARCHIVED" && "opacity-60")}
          minWidth="580px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: units?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <HierarchyFormSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="New Business Unit"
        formId="bu-form"
        isPending={create.isPending}
      >
        <BuForm onSubmit={handleCreate} isPending={create.isPending} />
      </HierarchyFormSheet>

      <HierarchyFormSheet
        open={!!editing}
        onOpenChange={handleEditSheetOpenChange}
        title="Edit Business Unit"
        formId="bu-form"
        isPending={update.isPending}
      >
        {editing && (
          <BuForm
            defaultValues={{
              name: editing.name,
              code: editing.code,
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
        unitLabel="business unit"
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
