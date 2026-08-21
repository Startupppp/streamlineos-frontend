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
  useCreateOrgBranch,
  useOrgBranches,
  useUpdateOrgBranch,
} from "@/hooks/api/org-hierarchy";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { OrgBranch } from "@/types/org-hierarchy";
import { BranchForm } from "./branch-form";
import type { BranchFormValues } from "./branch-form-schema";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { HierarchyEntityFormSheet } from "./hierarchy-entity-form-sheet";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { useHierarchyListState } from "./use-hierarchy-list-state";

export function OrgBranchesPage() {
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
  const createBranch = useCreateOrgBranch();
  const updateBranch = useUpdateOrgBranch();
  const { data: membersPage } = useOrgMembers(1, 100);
  const {
    data: branchesPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgBranches(query);
  const canManage = useCan("settings:organization:manage");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<OrgBranch | null>(null);

  const archiveFlow = useHierarchyArchive<OrgBranch>({
    unitKind: "BRANCH",
    archive: (branch, callbacks) =>
      updateBranch.mutate(
        { branchId: branch.id, status: "ARCHIVED" },
        callbacks,
      ),
    successMessage: "Branch archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const memberNamesByUserId = Object.fromEntries(
    (membersPage?.data ?? []).map((member) => [
      member.userId,
      member.name ?? member.email,
    ]),
  );

  const handleCreate = useCallback(
    (values: BranchFormValues) => {
      createBranch.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          businessUnitId: values.businessUnitId || undefined,
          managerUserId: values.managerUserId || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          country: values.country || undefined,
          postalCode: values.postalCode || undefined,
          address: values.address || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Branch created");
            setCreateSheetOpen(false);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [createBranch],
  );

  const handleUpdate = useCallback(
    (values: BranchFormValues) => {
      if (!editingBranch) return;
      updateBranch.mutate(
        {
          branchId: editingBranch.id,
          name: values.name,
          code: values.code.toUpperCase(),
          businessUnitId: values.businessUnitId || null,
          managerUserId: values.managerUserId || null,
          city: values.city || null,
          state: values.state || null,
          country: values.country || null,
          postalCode: values.postalCode || null,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
        },
        {
          onSuccess: () => {
            toast.success("Branch updated");
            setEditingBranch(null);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [editingBranch, updateBranch],
  );

  const handleRestore = useCallback(
    (branch: OrgBranch) => {
      updateBranch.mutate(
        { branchId: branch.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Branch restored");
            setStatus("CURRENT");
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [setStatus, updateBranch],
  );

  const handleOpenCreate = useCallback(() => setCreateSheetOpen(true), []);
  const handleSearchInputChange = useCallback(
    (searchValue: string) => setSearch(searchValue),
    [setSearch],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function makeRestoreHandler(branch: OrgBranch) {
    return () => handleRestore(branch);
  }

  function makeArchiveHandler(branch: OrgBranch) {
    return () => archiveFlow.requestArchive(branch);
  }

  function makeEditHandler(branch: OrgBranch) {
    return () => setEditingBranch(branch);
  }

  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditingBranch(null);
  }

  function handleNextPage() {
    nextPage(branchesPage?.pageInfo.nextCursor);
  }

  const columns: DataTableColumn<OrgBranch>[] = [
    {
      key: "name",
      header: "Name",
      cell: (branch) => <span className="font-medium">{branch.name}</span>,
      sortable: true,
      sortValue: (branch) => branch.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (branch) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {branch.code}
        </code>
      ),
    },
    {
      key: "businessUnit",
      header: "Business Unit",
      cell: (branch) => (
        <span className="text-muted-foreground">
          {branch.businessUnitName ?? "â€”"}
        </span>
      ),
    },
    {
      key: "manager",
      header: "Manager",
      cell: (branch) => (
        <span className="text-muted-foreground">
          {branch.managerUserId
            ? (memberNamesByUserId[branch.managerUserId] ?? "â€”")
            : "â€”"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (branch) => (
        <span className="text-muted-foreground">
          {[branch.city, branch.state, branch.country]
            .filter(Boolean)
            .join(", ") || "â€”"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (branch) => (
        <span className="text-muted-foreground">{branch.phone ?? "â€”"}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (branch) => (
        <span className="text-muted-foreground">{branch.email ?? "â€”"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (branch) => (
        <Badge
          variant={branch.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            branch.status === "ACTIVE"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : branch.status === "ARCHIVED"
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {branch.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (branch) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {branch.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(branch)}
                title="Restore"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeEditHandler(branch)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(branch)}
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

  const emptyState = serverSearch ? (
    <EmptyState
      illustrationPreset="companies"
      title={`No branches matching "${serverSearch}"`}
      description="Try a different search term."
      compact
      className="min-h-[200px]"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived branches"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="companies"
      title="No branches yet"
      description="Create your first branch to get started."
      action={
        canManage
          ? { label: "Add Branch", onClick: handleOpenCreate }
          : undefined
      }
    />
  );

  return (
    <RequireModule module="hr">
      <PageWrapper
        title="Branches"
        subtitle="Branches within your organization."
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
                Add Branch
              </AnimatedIconButton>
            ) : null}
          </div>
        }
        filters={
          <SearchInput
            placeholder="Search branchesâ€¦"
            value={search}
            onValueChange={handleSearchInputChange}
          />
        }
      >
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load branches"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={branchesPage?.data ?? []}
            columns={columns}
            getRowKey={(branch) => branch.id}
            isLoading={isLoading}
            emptyState={emptyState}
            rowClassName={(branch) =>
              cn(branch.status === "ARCHIVED" && "opacity-60")
            }
            minWidth="1000px"
            className="flex-1 min-h-0"
            footer={
              page > 1 || branchesPage?.pageInfo.hasMore ? (
                <CursorPageControls
                  page={page}
                  hasNext={branchesPage?.pageInfo.hasMore ?? false}
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
          title="New Branch"
          formId="branch-form"
          isPending={createBranch.isPending}
        >
          {createSheetOpen ? <BranchForm onSubmit={handleCreate} /> : null}
        </HierarchyEntityFormSheet>

        <HierarchyEntityFormSheet
          open={!!editingBranch}
          onOpenChange={handleEditSheetOpenChange}
          title="Edit Branch"
          formId="branch-form"
          isPending={updateBranch.isPending}
        >
          {editingBranch ? (
            <BranchForm
              defaultValues={{
                name: editingBranch.name,
                code: editingBranch.code,
                businessUnitId: editingBranch.businessUnitId ?? "",
                managerUserId: editingBranch.managerUserId ?? "",
                city: editingBranch.city ?? "",
                state: editingBranch.state ?? "",
                country: editingBranch.country ?? "",
                postalCode: editingBranch.postalCode ?? "",
                address: editingBranch.address ?? "",
                phone: editingBranch.phone ?? "",
                email: editingBranch.email ?? "",
              }}
              selectedBusinessUnitName={editingBranch.businessUnitName}
              onSubmit={handleUpdate}
            />
          ) : null}
        </HierarchyEntityFormSheet>

        <HierarchyArchiveDialog
          open={!!archiveFlow.target}
          unitName={archiveFlow.target?.name ?? ""}
          unitLabel="branch"
          isPending={updateBranch.isPending}
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
