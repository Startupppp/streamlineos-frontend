"use client";

import { useState, useCallback } from "react";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgDepartments,
  useOrgBranches,
  useCreateOrgDepartment,
  useUpdateOrgDepartment,
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
import { useOrgMembers } from "@/hooks/api/organization";
import type { OrgDepartment } from "@/types/org-hierarchy";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { isAssignableHierarchyParent } from "./hierarchy-option";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import {
  useHierarchyListState,
  useHierarchyPageBounds,
} from "./use-hierarchy-list-state";
import { useCan } from "@/hooks/api/access";
import { DeptForm } from "./department-form";
import { HierarchyFormSheet } from "./hierarchy-form-sheet";
import { NO_BRANCH, type DepartmentFormValues } from "./departments-schema";

export function OrgDepartmentsPage() {
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
    data: depts,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgDepartments(query);
  const isCorrectingPage = useHierarchyPageBounds({
    page,
    pageSize,
    total: isError ? undefined : depts?.total,
    setPage,
  });
  const { data: branchesData } = useOrgBranches({
    page: 1,
    limit: 100,
    status: "ACTIVE",
  });
  const { data: membersData } = useOrgMembers(1, 100);
  const create = useCreateOrgDepartment();
  const update = useUpdateOrgDepartment();
  const canManage = useCan("settings:organization:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgDepartment | null>(null);
  const archiveFlow = useHierarchyArchive<OrgDepartment>({
    unitKind: "DEPARTMENT",
    archive: (department, callbacks) =>
      update.mutate({ id: department.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Department archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const branches = (branchesData?.data ?? [])
    .filter(isAssignableHierarchyParent)
    .map((branch) => ({ id: branch.id, name: branch.name }));
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const memberMap = Object.fromEntries(
    (membersData?.data ?? []).map((m) => [m.userId, m.name ?? m.email]),
  );
  const displayed = depts?.data ?? [];

  const handleCreate = useCallback(
    (values: DepartmentFormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          branchId: values.branchId === NO_BRANCH ? undefined : values.branchId,
          headUserId: values.headUserId || undefined,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Department created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: DepartmentFormValues) => {
      if (!editing) return;
      update.mutate(
        {
          id: editing.id,
          name: values.name,
          code: values.code.toUpperCase(),
          branchId: values.branchId === NO_BRANCH ? null : values.branchId,
          headUserId: values.headUserId || null,
          description: values.description || null,
        },
        {
          onSuccess: () => {
            toast.success("Department updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (d: OrgDepartment) => {
      update.mutate(
        { id: d.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Department restored");
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
  function makeRestoreHandler(dept: OrgDepartment) {
    return () => handleRestore(dept);
  }
  function makeArchiveHandler(dept: OrgDepartment) {
    return () => archiveFlow.requestArchive(dept);
  }
  function makeSetEditingHandler(dept: OrgDepartment) {
    return () => setEditing(dept);
  }
  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }

  const columns: DataTableColumn<OrgDepartment>[] = [
    {
      key: "name",
      header: "Name",
      cell: (d) => <span className="font-medium">{d.name}</span>,
      sortable: true,
      sortValue: (d) => d.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (d) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.code}</code>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      cell: (d) => (
        <span className="text-muted-foreground">
          {d.branchId ? (branchMap[d.branchId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "head",
      header: "Head",
      cell: (d) => (
        <span className="text-muted-foreground">
          {d.headUserId ? (memberMap[d.headUserId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (d) => (
        <span className="text-muted-foreground truncate block max-w-[200px]">
          {d.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (d) => (
        <Badge
          variant={d.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            d.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : d.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {d.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (d) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {d.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(d)}
                title="Restore"
                aria-label="Restore department"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeSetEditingHandler(d)}
                  title="Edit"
                  aria-label="Edit department"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(d)}
                  title="Archive"
                  aria-label="Archive department"
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
      illustrationPreset="team"
      title={`No departments matching "${serverSearch}"`}
      description="Try a different search term."
      compact
      className="flex-1 min-h-0"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived departments"
      compact
      className="flex-1 min-h-0"
    />
  ) : (
    <EmptyState
      illustrationPreset="team"
      title="No departments yet"
      description="Create your first department to get started."
      action={
        canManage
          ? { label: "Add Department", onClick: handleOpenCreate }
          : undefined
      }
    />
  );

  return (
    <PageWrapper
      title="Departments"
      subtitle="Departments organized within branches."
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
              Add Department
            </AnimatedIconButton>
          ) : null}
        </div>
      }
      filters={
        <SearchInput
          placeholder="Search departments…"
          value={search}
          onValueChange={handleSearchChange}
        />
      }
    >
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load departments"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={displayed}
          columns={columns}
          getRowKey={(d) => d.id}
          isLoading={isLoading || isCorrectingPage}
          emptyState={emptyState}
          rowClassName={(d) => cn(d.status === "ARCHIVED" && "opacity-60")}
          minWidth="820px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: depts?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <HierarchyFormSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="New Department"
        formId="dept-form"
        isPending={create.isPending}
      >
        {showCreate && (
          <DeptForm
            branches={branches}
            onSubmit={handleCreate}
            isPending={create.isPending}
          />
        )}
      </HierarchyFormSheet>

      <HierarchyFormSheet
        open={!!editing}
        onOpenChange={handleEditSheetOpenChange}
        title="Edit Department"
        formId="dept-form"
        isPending={update.isPending}
      >
        {editing && (
          <DeptForm
            defaultValues={{
              name: editing.name,
              code: editing.code,
              branchId: editing.branchId ?? NO_BRANCH,
              headUserId: editing.headUserId ?? "",
              description: editing.description ?? "",
            }}
            branches={branches}
            onSubmit={handleUpdate}
            isPending={update.isPending}
          />
        )}
      </HierarchyFormSheet>

      <HierarchyArchiveDialog
        open={!!archiveFlow.target}
        unitName={archiveFlow.target?.name ?? ""}
        unitLabel="department"
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
