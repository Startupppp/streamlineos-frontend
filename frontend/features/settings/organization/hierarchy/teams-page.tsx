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
  useCreateOrgTeam,
  useOrgTeams,
  useUpdateOrgTeam,
} from "@/hooks/api/org-hierarchy";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { OrgTeam } from "@/types/org-hierarchy";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { HierarchyEntityFormSheet } from "./hierarchy-entity-form-sheet";
import { TeamForm } from "./team-form";
import type { TeamFormValues } from "./team-form-schema";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { useHierarchyListState } from "./use-hierarchy-list-state";

export function OrgTeamsPage() {
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
    data: teamsPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgTeams(query);
  const createTeam = useCreateOrgTeam();
  const updateTeam = useUpdateOrgTeam();
  const canManage = useCan("settings:organization:manage");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<OrgTeam | null>(null);

  const archiveFlow = useHierarchyArchive<OrgTeam>({
    unitKind: "TEAM",
    archive: (team, callbacks) =>
      updateTeam.mutate(
        { teamId: team.id, status: "ARCHIVED" },
        callbacks,
      ),
    successMessage: "Team archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const { data: membersPage } = useOrgMembers(1, 100);
  const memberNamesByUserId = Object.fromEntries(
    (membersPage?.data ?? []).map((member) => [
      member.userId,
      member.name ?? member.email,
    ]),
  );

  const handleCreate = useCallback(
    (values: TeamFormValues) => {
      createTeam.mutate(
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
            setCreateSheetOpen(false);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [createTeam],
  );

  const handleUpdate = useCallback(
    (values: TeamFormValues) => {
      if (!editingTeam) return;
      updateTeam.mutate(
        {
          teamId: editingTeam.id,
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
            setEditingTeam(null);
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [editingTeam, updateTeam],
  );

  const handleRestore = useCallback(
    (team: OrgTeam) => {
      updateTeam.mutate(
        { teamId: team.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Team restored");
            setStatus("CURRENT");
          },
          onError: (mutationError) =>
            toast.error(getErrorMessage(mutationError)),
        },
      );
    },
    [setStatus, updateTeam],
  );

  const handleOpenCreate = useCallback(() => setCreateSheetOpen(true), []);
  const handleSearchInputChange = useCallback(
    (searchValue: string) => setSearch(searchValue),
    [setSearch],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function makeRestoreHandler(team: OrgTeam) {
    return () => handleRestore(team);
  }

  function makeArchiveHandler(team: OrgTeam) {
    return () => archiveFlow.requestArchive(team);
  }

  function makeEditHandler(team: OrgTeam) {
    return () => setEditingTeam(team);
  }

  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditingTeam(null);
  }

  function handleNextPage() {
    nextPage(teamsPage?.pageInfo.nextCursor);
  }

  const columns: DataTableColumn<OrgTeam>[] = [
    {
      key: "name",
      header: "Name",
      cell: (team) => <span className="font-medium">{team.name}</span>,
    },
    {
      key: "code",
      header: "Code",
      cell: (team) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {team.code}
        </code>
      ),
    },
    {
      key: "department",
      header: "Department",
      cell: (team) => (
        <span className="text-muted-foreground">
          {team.departmentName ?? "â€”"}
        </span>
      ),
    },
    {
      key: "lead",
      header: "Team Lead",
      cell: (team) => (
        <span className="text-muted-foreground">
          {team.leadUserId
            ? (memberNamesByUserId[team.leadUserId] ?? "â€”")
            : "â€”"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (team) => (
        <span className="block max-w-[180px] truncate text-muted-foreground">
          {team.description ?? "â€”"}
        </span>
      ),
      className: "max-w-[180px]",
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (team) => (
        <span className="text-muted-foreground tabular-nums">
          {team.capacity ?? "â€”"}
        </span>
      ),
      className: "tabular-nums",
    },
    {
      key: "status",
      header: "Status",
      cell: (team) => (
        <Badge
          variant={team.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-micro",
            team.status === "ACTIVE"
              ? "border-status-success-rule bg-status-success-surface text-status-success-ink"
              : team.status === "ARCHIVED"
                ? "border-status-warning-rule bg-status-warning-surface text-status-warning-ink"
                : "",
          )}
        >
          {team.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (team) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {team.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(team)}
                title="Restore"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeEditHandler(team)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(team)}
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
      illustrationPreset="team"
      title={`No teams matching "${serverSearch}"`}
      description="Try a different search term."
      compact
      className="min-h-[200px]"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived teams"
      compact
      className="min-h-[200px]"
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
    <RequireModule module="hr">
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
                Add Team
              </AnimatedIconButton>
            ) : null}
          </div>
        }
        filters={
          <SearchInput
            placeholder="Search teamsâ€¦"
            value={search}
            onValueChange={handleSearchInputChange}
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
            data={teamsPage?.data ?? []}
            columns={columns}
            getRowKey={(team) => team.id}
            isLoading={isLoading}
            emptyState={emptyState}
            rowClassName={(team) =>
              cn(team.status === "ARCHIVED" && "opacity-60")
            }
            minWidth="900px"
            className="flex-1 min-h-0"
            footer={
              page > 1 || teamsPage?.pageInfo.hasMore ? (
                <CursorPageControls
                  page={page}
                  hasNext={teamsPage?.pageInfo.hasMore ?? false}
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
          title="New Team"
          formId="team-form"
          isPending={createTeam.isPending}
        >
          {createSheetOpen ? <TeamForm onSubmit={handleCreate} /> : null}
        </HierarchyEntityFormSheet>

        <HierarchyEntityFormSheet
          open={!!editingTeam}
          onOpenChange={handleEditSheetOpenChange}
          title="Edit Team"
          formId="team-form"
          isPending={updateTeam.isPending}
        >
          {editingTeam ? (
            <TeamForm
              defaultValues={{
                name: editingTeam.name,
                code: editingTeam.code,
                departmentId: editingTeam.departmentId ?? "",
                leadUserId: editingTeam.leadUserId ?? "",
                description: editingTeam.description ?? "",
                capacity:
                  editingTeam.capacity != null
                    ? String(editingTeam.capacity)
                    : "",
              }}
              selectedDepartmentName={editingTeam.departmentName}
              onSubmit={handleUpdate}
            />
          ) : null}
        </HierarchyEntityFormSheet>

        <HierarchyArchiveDialog
          open={!!archiveFlow.target}
          unitName={archiveFlow.target?.name ?? ""}
          unitLabel="team"
          isPending={updateTeam.isPending}
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
