"use client";

import { useState, useCallback } from "react";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgTeams,
  useOrgDepartments,
  useCreateOrgTeam,
  useUpdateOrgTeam,
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
import type { OrgTeam } from "@/types/org-hierarchy";
import { useCan } from "@/hooks/api/access";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { isAssignableHierarchyParent } from "./hierarchy-option";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import {
  useHierarchyListState,
  useHierarchyPageBounds,
} from "./use-hierarchy-list-state";
import { TeamForm } from "./team-form";
import { HierarchyFormSheet } from "./hierarchy-form-sheet";
import { type TeamFormValues } from "./teams-schema";

export function OrgTeamsPage() {
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
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgTeam | null>(null);
  const {
    data: teams,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgTeams(query);
  const isCorrectingPage = useHierarchyPageBounds({
    page,
    pageSize,
    total: isError ? undefined : teams?.total,
    setPage,
  });
  const { data: deptsData } = useOrgDepartments({
    page: 1,
    limit: 100,
    status: "ACTIVE",
  });
  const create = useCreateOrgTeam();
  const update = useUpdateOrgTeam();
  const canManage = useCan("settings:organization:manage");

  const archiveFlow = useHierarchyArchive<OrgTeam>({
    unitKind: "TEAM",
    archive: (team, callbacks) =>
      update.mutate({ id: team.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Team archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const { data: membersData } = useOrgMembers(1, 100);
  const departments = (deptsData?.data ?? [])
    .filter(isAssignableHierarchyParent)
    .map((department) => ({ id: department.id, name: department.name }));
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const memberMap = Object.fromEntries(
    (membersData?.data ?? []).map((m) => [m.userId, m.name ?? m.email]),
  );
  const displayedTeams = teams?.data ?? [];

  const handleCreate = useCallback(
    (values: TeamFormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          departmentId: values.departmentId,
          leadUserId: values.leadUserId || undefined,
          description: values.description || undefined,
          capacity: values.capacity ? Number(values.capacity) : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Team created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: TeamFormValues) => {
      if (!editing) return;
      update.mutate(
        {
          id: editing.id,
          name: values.name,
          code: values.code.toUpperCase(),
          departmentId: values.departmentId,
          leadUserId: values.leadUserId || null,
          description: values.description || null,
          capacity: values.capacity ? Number(values.capacity) : null,
        },
        {
          onSuccess: () => {
            toast.success("Team updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (t: OrgTeam) => {
      update.mutate(
        { id: t.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Team restored");
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
  function makeRestoreHandler(team: OrgTeam) {
    return () => handleRestore(team);
  }
  function makeArchiveHandler(team: OrgTeam) {
    return () => archiveFlow.requestArchive(team);
  }
  function makeSetEditingHandler(team: OrgTeam) {
    return () => setEditing(team);
  }
  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }

  const columns: DataTableColumn<OrgTeam>[] = [
    {
      key: "name",
      header: "Name",
      cell: (t) => <span className="font-medium">{t.name}</span>,
      sortable: true,
      sortValue: (t) => t.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (t) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.code}</code>
      ),
    },
    {
      key: "department",
      header: "Department",
      cell: (t) => (
        <span className="text-muted-foreground">
          {t.departmentId ? (deptMap[t.departmentId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "lead",
      header: "Team Lead",
      cell: (t) => (
        <span className="text-muted-foreground">
          {t.leadUserId ? (memberMap[t.leadUserId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (t) => (
        <span className="text-muted-foreground truncate block max-w-[180px]">
          {t.description ?? "—"}
        </span>
      ),
      className: "max-w-[180px]",
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (t) => (
        <span className="text-muted-foreground tabular-nums">
          {t.capacity ?? "—"}
        </span>
      ),
      className: "tabular-nums",
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => (
        <Badge
          variant={t.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            t.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : t.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {t.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (t) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {t.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(t)}
                title="Restore"
                aria-label="Restore team"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeSetEditingHandler(t)}
                  title="Edit"
                  aria-label="Edit team"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(t)}
                  title="Archive"
                  aria-label="Archive team"
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
      title={`No teams matching "${serverSearch}"`}
      description="Try a different search term."
      compact
      className="flex-1 min-h-0"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived teams"
      compact
      className="flex-1 min-h-0"
    />
  ) : (
    <EmptyState
      illustrationPreset="team"
      title="No teams yet"
      description="Create your first team to get started."
      action={
        canManage ? { label: "Add Team", onClick: handleOpenCreate } : undefined
      }
    />
  );

  return (
    <PageWrapper
      title="Teams"
      subtitle="Teams within departments."
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
              Add Team
            </AnimatedIconButton>
          ) : null}
        </div>
      }
      filters={
        <SearchInput
          placeholder="Search teams…"
          value={search}
          onValueChange={handleSearchChange}
        />
      }
    >
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load teams"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={displayedTeams}
          columns={columns}
          getRowKey={(t) => t.id}
          isLoading={isLoading || isCorrectingPage}
          emptyState={emptyState}
          rowClassName={(t) => cn(t.status === "ARCHIVED" && "opacity-60")}
          minWidth="900px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: teams?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <HierarchyFormSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="New Team"
        formId="team-form"
        isPending={create.isPending}
      >
        {showCreate && (
          <TeamForm
            departments={departments}
            onSubmit={handleCreate}
            isPending={create.isPending}
          />
        )}
      </HierarchyFormSheet>

      <HierarchyFormSheet
        open={!!editing}
        onOpenChange={handleEditSheetOpenChange}
        title="Edit Team"
        formId="team-form"
        isPending={update.isPending}
      >
        {editing && (
          <TeamForm
            defaultValues={{
              name: editing.name,
              code: editing.code,
              departmentId: editing.departmentId ?? "",
              leadUserId: editing.leadUserId ?? "",
              description: editing.description ?? "",
              capacity:
                editing.capacity != null ? String(editing.capacity) : "",
            }}
            departments={departments}
            onSubmit={handleUpdate}
            isPending={update.isPending}
          />
        )}
      </HierarchyFormSheet>

      <HierarchyArchiveDialog
        open={!!archiveFlow.target}
        unitName={archiveFlow.target?.name ?? ""}
        unitLabel="team"
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
