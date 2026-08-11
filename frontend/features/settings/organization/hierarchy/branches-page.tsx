"use client";

import { useState, useCallback } from "react";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgBranches,
  useBusinessUnits,
  useCreateOrgBranch,
  useUpdateOrgBranch,
} from "@/hooks/api/org-hierarchy";
import { useOrgMembers } from "@/hooks/api/organization";
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
import type { OrgBranch } from "@/types/org-hierarchy";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { isAssignableHierarchyParent } from "./hierarchy-option";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import {
  useHierarchyListState,
  useHierarchyPageBounds,
} from "./use-hierarchy-list-state";
import { useCan } from "@/hooks/api/access";
import { BranchForm } from "./branch-form";
import { HierarchyFormSheet } from "./hierarchy-form-sheet";
import { NO_BUSINESS_UNIT, type BranchFormValues } from "./branches-schema";

export function OrgBranchesPage() {
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
  const create = useCreateOrgBranch();
  const update = useUpdateOrgBranch();
  const { data: membersData } = useOrgMembers(1, 100);
  const { data: busData } = useBusinessUnits({
    page: 1,
    limit: 100,
    status: "ACTIVE",
  });
  const {
    data: branches,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgBranches(query);
  const isCorrectingPage = useHierarchyPageBounds({
    page,
    pageSize,
    total: isError ? undefined : branches?.total,
    setPage,
  });
  const canManage = useCan("settings:organization:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgBranch | null>(null);
  const archiveFlow = useHierarchyArchive<OrgBranch>({
    unitKind: "BRANCH",
    archive: (branch, callbacks) =>
      update.mutate({ id: branch.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Branch archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const businessUnits = (busData?.data ?? [])
    .filter(isAssignableHierarchyParent)
    .map((unit) => ({ id: unit.id, name: unit.name }));
  const buMap = Object.fromEntries(businessUnits.map((b) => [b.id, b.name]));
  const memberMap = Object.fromEntries(
    (membersData?.data ?? []).map((m) => [m.userId, m.name ?? m.email]),
  );
  const displayed = branches?.data ?? [];

  const handleCreate = useCallback(
    (values: BranchFormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          businessUnitId:
            values.businessUnitId === NO_BUSINESS_UNIT
              ? undefined
              : values.businessUnitId,
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
            setShowCreate(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: BranchFormValues) => {
      if (!editing) return;
      update.mutate(
        {
          id: editing.id,
          name: values.name,
          code: values.code.toUpperCase(),
          businessUnitId:
            values.businessUnitId === NO_BUSINESS_UNIT
              ? null
              : values.businessUnitId,
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
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (b: OrgBranch) => {
      update.mutate(
        { id: b.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Branch restored");
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
  function makeRestoreHandler(branch: OrgBranch) {
    return () => handleRestore(branch);
  }
  function makeArchiveHandler(branch: OrgBranch) {
    return () => archiveFlow.requestArchive(branch);
  }
  function makeSetEditingHandler(branch: OrgBranch) {
    return () => setEditing(branch);
  }
  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }

  const emptyState = serverSearch ? (
    <EmptyState
      illustrationPreset="companies"
      title={`No branches matching "${serverSearch}"`}
      description="Try a different search term."
      compact
      className="flex-1 min-h-0"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived branches"
      compact
      className="flex-1 min-h-0"
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

  const columns: DataTableColumn<OrgBranch>[] = [
    {
      key: "name",
      header: "Name",
      cell: (b) => <span className="font-medium">{b.name}</span>,
      sortable: true,
      sortValue: (b) => b.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (b) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.code}</code>
      ),
    },
    {
      key: "businessUnit",
      header: "Business Unit",
      cell: (b) => (
        <span className="text-muted-foreground">
          {b.businessUnitId ? (buMap[b.businessUnitId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "manager",
      header: "Manager",
      cell: (b) => (
        <span className="text-muted-foreground">
          {b.managerUserId ? (memberMap[b.managerUserId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (b) => (
        <span className="text-muted-foreground">
          {[b.city, b.state, b.country].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (b) => (
        <span className="text-muted-foreground">{b.phone ?? "—"}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (b) => (
        <span className="text-muted-foreground">{b.email ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => (
        <Badge
          variant={b.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            b.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : b.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {b.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (b) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {b.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(b)}
                title="Restore"
                aria-label="Restore branch"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeSetEditingHandler(b)}
                  title="Edit"
                  aria-label="Edit branch"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(b)}
                  title="Archive"
                  aria-label="Archive branch"
                >
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        ) : null,
    },
  ];

  return (
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
              Add Branch
            </AnimatedIconButton>
          ) : null}
        </div>
      }
      filters={
        <SearchInput
          placeholder="Search branches…"
          value={search}
          onValueChange={handleSearchChange}
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
          data={displayed}
          columns={columns}
          getRowKey={(b) => b.id}
          isLoading={isLoading || isCorrectingPage}
          emptyState={emptyState}
          rowClassName={(b) => cn(b.status === "ARCHIVED" && "opacity-60")}
          minWidth="1000px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: branches?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <HierarchyFormSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="New Branch"
        formId="branch-form"
        isPending={create.isPending}
      >
        {showCreate && (
          <BranchForm
            businessUnits={businessUnits}
            onSubmit={handleCreate}
            isPending={create.isPending}
          />
        )}
      </HierarchyFormSheet>

      <HierarchyFormSheet
        open={!!editing}
        onOpenChange={handleEditSheetOpenChange}
        title="Edit Branch"
        formId="branch-form"
        isPending={update.isPending}
      >
        {editing && (
          <BranchForm
            defaultValues={{
              name: editing.name,
              code: editing.code,
              businessUnitId: editing.businessUnitId ?? NO_BUSINESS_UNIT,
              managerUserId: editing.managerUserId ?? "",
              city: editing.city ?? "",
              state: editing.state ?? "",
              country: editing.country ?? "",
              postalCode: editing.postalCode ?? "",
              address: editing.address ?? "",
              phone: editing.phone ?? "",
              email: editing.email ?? "",
            }}
            businessUnits={businessUnits}
            onSubmit={handleUpdate}
            isPending={update.isPending}
          />
        )}
      </HierarchyFormSheet>

      <HierarchyArchiveDialog
        open={!!archiveFlow.target}
        unitName={archiveFlow.target?.name ?? ""}
        unitLabel="branch"
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
