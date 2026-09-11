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
  useCreateOrgDepartment,
  useOrgDepartments,
  useUpdateOrgDepartment,
} from "@/hooks/api/org-hierarchy";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { OrgDepartment } from "@/types/org-hierarchy";
import { DepartmentForm } from "./department-form";
import type { DepartmentFormValues } from "./department-form-schema";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { HierarchyEntityFormSheet } from "./hierarchy-entity-form-sheet";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { useHierarchyListState } from "./use-hierarchy-list-state";

export function OrgDepartmentsPage() {
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
    data: departmentsPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgDepartments(query);
  const { data: membersPage } = useOrgMembers(1, 100);
  const createDepartment = useCreateOrgDepartment();
  const updateDepartment = useUpdateOrgDepartment();
  const canManage = useCan("settings:organization:manage");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<OrgDepartment | null>(null);

  const archiveFlow = useHierarchyArchive<OrgDepartment>({
    unitKind: "DEPARTMENT",
    archive: (department, callbacks) =>
      updateDepartment.mutate(
        { departmentId: department.id, status: "ARCHIVED" },
        callbacks,
      ),
    successMessage: "Department archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const memberNamesByUserId = Object.fromEntries(
    (membersPage?.data ?? []).map((member) => [
      member.userId,
      member.name ?? member.email,
    ]),
  );

  const handleCreate = useCallback(
    (values: DepartmentFormValues) => {
      createDepartment.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          branchId: values.branchId || undefined,
          headUserId: values.headUserId || undefined,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Department created");
            setCreateSheetOpen(false);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [createDepartment],
  );

  const handleUpdate = useCallback(
    (values: DepartmentFormValues) => {
      if (!editingDepartment) return;
      updateDepartment.mutate(
        {
          departmentId: editingDepartment.id,
          name: values.name,
          code: values.code.toUpperCase(),
          branchId: values.branchId || null,
          headUserId: values.headUserId || null,
          description: values.description || null,
        },
        {
          onSuccess: () => {
            toast.success("Department updated");
            setEditingDepartment(null);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [editingDepartment, updateDepartment],
  );

  const handleRestore = useCallback(
    (department: OrgDepartment) => {
      updateDepartment.mutate(
        { departmentId: department.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Department restored");
            setStatus("CURRENT");
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [setStatus, updateDepartment],
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

  function makeRestoreHandler(department: OrgDepartment) {
    return () => handleRestore(department);
  }

  function makeArchiveHandler(department: OrgDepartment) {
    return () => archiveFlow.requestArchive(department);
  }

  function makeEditHandler(department: OrgDepartment) {
    return () => setEditingDepartment(department);
  }

  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditingDepartment(null);
  }

  function handleNextPage() {
    nextPage(departmentsPage?.pageInfo.nextCursor);
  }

  const columns: DataTableColumn<OrgDepartment>[] = [
    {
      key: "name",
      header: "Name",
      cell: (department) => (
        <span className="font-medium">{department.name}</span>
      ),
    },
    {
      key: "code",
      header: "Code",
      cell: (department) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {department.code}
        </code>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      cell: (department) => (
        <span className="text-muted-foreground">
          {department.branchName ?? "—"}
        </span>
      ),
    },
    {
      key: "head",
      header: "Head",
      cell: (department) => (
        <span className="text-muted-foreground">
          {department.headUserId
            ? (memberNamesByUserId[department.headUserId] ?? "—")
            : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (department) => (
        <span className="block max-w-[200px] truncate text-muted-foreground">
          {department.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (department) => (
        <Badge
          variant={department.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-micro",
            department.status === "ACTIVE"
              ? "border-status-success-rule bg-status-success-surface text-status-success-ink"
              : department.status === "ARCHIVED"
                ? "border-status-warning-rule bg-status-warning-surface text-status-warning-ink"
                : "",
          )}
        >
          {department.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (department) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {department.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(department)}
                title="Restore"
                aria-label="Restore"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeEditHandler(department)}
                  title="Edit"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(department)}
                  title="Archive"
                  aria-label="Archive"
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
      title="No archived departments"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="team"
      title="No departments yet"
      description={serverSearch ? undefined : "Create your first department to get started."}
      filtersActive={!!serverSearch}
      onClearFilters={handleClearSearch}
      action={canManage && !serverSearch ? { label: "Add Department", onClick: handleOpenCreate } : undefined}
    />
  );

  return (
    <RequireModule module="hr">
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
                Add Department
              </AnimatedIconButton>
            ) : null}
          </div>
        }
        filters={
          <SearchInput
            placeholder="Search departments…"
            value={search}
            onValueChange={handleSearchInputChange}
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
            data={departmentsPage?.data ?? []}
            columns={columns}
            getRowKey={(department) => department.id}
            isLoading={isLoading}
            emptyState={emptyState}
            rowClassName={(department) =>
              cn(department.status === "ARCHIVED" && "opacity-60")
            }
            minWidth="820px"
            className="flex-1 min-h-0"
            footer={
              page > 1 || departmentsPage?.pageInfo.hasMore ? (
                <CursorPageControls
                  page={page}
                  hasNext={departmentsPage?.pageInfo.hasMore ?? false}
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
          title="New Department"
          formId="department-form"
          isPending={createDepartment.isPending}
        >
          {createSheetOpen ? <DepartmentForm onSubmit={handleCreate} /> : null}
        </HierarchyEntityFormSheet>

        <HierarchyEntityFormSheet
          open={!!editingDepartment}
          onOpenChange={handleEditSheetOpenChange}
          title="Edit Department"
          formId="department-form"
          isPending={updateDepartment.isPending}
        >
          {editingDepartment ? (
            <DepartmentForm
              defaultValues={{
                name: editingDepartment.name,
                code: editingDepartment.code,
                branchId: editingDepartment.branchId ?? "",
                headUserId: editingDepartment.headUserId ?? "",
                description: editingDepartment.description ?? "",
              }}
              selectedBranchName={editingDepartment.branchName}
              onSubmit={handleUpdate}
            />
          ) : null}
        </HierarchyEntityFormSheet>

        <HierarchyArchiveDialog
          open={!!archiveFlow.target}
          unitName={archiveFlow.target?.name ?? ""}
          unitLabel="department"
          isPending={updateDepartment.isPending}
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
