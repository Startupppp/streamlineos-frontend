"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { keepPreviousData } from "@tanstack/react-query";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useProjectWorkspaceMembers,
  useRemoveProjectWorkspaceMember,
} from "@/hooks/api/build/workspace-members";
import type { ProjectWorkspaceMember } from "@/hooks/api/build/workspace-members";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useCursorPager } from "@/components/ui/table-pagination";
import { getUserDisplayName } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { PmAccessButton } from "@/features/build/members/pm-access-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { type DisplayProps, loadDisplayProps, saveDisplayProps } from "./display-props";
import { DisplayPropsToggle } from "./members-toolbar";
import { MemberActions } from "./member-row-actions";
import { AddMemberDialog } from "./add-member-dialog";
import { useMembersColumns } from "./use-members-columns";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

const MEMBER_TABLE_HEADERS = ["Name", "Role", "Added", "Actions"] as const;

export function MembersPage() {
  const [displayProps, setDisplayProps] = useState<DisplayProps>(loadDisplayProps);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProjectWorkspaceMember | null>(null);

  const listFilters = useBuildListFilters({ searchParam: "search" });
  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(listFilters.resetKey);

  const canView = useCan("build:members:view");
  const canManage = useCan("build:members:manage");

  const { data, isLoading, isError, error, refetch } = useProjectWorkspaceMembers(
    { cursor, limit: 25, search: listFilters.debouncedSearch.trim() || undefined },
    { placeholderData: keepPreviousData, enabled: canView },
  );

  const members = data?.data ?? [];

  const pageState = usePageState({
    permission: "build:members:view",
    isLoading,
    isError,
    error,
    isEmpty: members.length === 0,
  });

  const removeMember = useRemoveProjectWorkspaceMember();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleDisplayChange = useCallback((next: DisplayProps) => {
    setDisplayProps(next);
    saveDisplayProps(next);
  }, []);

  const handleOpenAddDialog = useCallback(() => setAddDialogOpen(true), []);

  const handleRemoveRequest = useCallback((member: ProjectWorkspaceMember) => {
    setRemoveTarget(member);
  }, []);

  const handleRemoveConfirmOpenChange = useCallback((open: boolean) => {
    if (!open) setRemoveTarget(null);
  }, []);

  const handleRemoveConfirm = useCallback(() => {
    if (!removeTarget) return;
    const targetId = removeTarget.id;
    const targetName = getUserDisplayName(removeTarget);
    removeMember.mutate(targetId, {
      onSuccess: () => {
        toast.success(`${targetName} removed from workspace.`);
        setRemoveTarget(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }, [removeTarget, removeMember]);

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const columns = useMembersColumns({ displayProps, canManage, handleRemoveRequest });

  const renderMobileCard = useCallback(
    (member: ProjectWorkspaceMember) => {
      const displayName = getUserDisplayName(member);
      return (
        <BuildMobileCard
          title={displayName}
          person={{
            user: member,
            avatarUrl: resolveImageUrl(member.image),
            role: "Member",
          }}
          meta={[
            { label: "Role", value: member.role },
            {
              label: "Added",
              value: formatDistanceToNow(new Date(member.addedAt), {
                addSuffix: true,
              }),
            },
          ]}
          actions={
            canManage ? (
              <MemberActions member={member} onRemove={handleRemoveRequest} />
            ) : null
          }
        />
      );
    },
    [canManage, handleRemoveRequest],
  );

  const hasNext = Boolean(data?.pagination.hasMore);
  const removeConfirmOpen = removeTarget !== null;

  return (
    <>
      <PageWrapper
        title="Members"
        subtitle="People who can access Build, and their roles."
        actions={
          canManage ? (
            <BuildHeaderActions
              actions={[
                {
                  id: "add-member",
                  label: "Add member",
                  icon: Plus,
                  primary: true,
                  onSelect: handleOpenAddDialog,
                },
              ]}
            />
          ) : undefined
        }
        filters={
          <BuildListToolbar
            search={{
              value: listFilters.search,
              onValueChange: listFilters.setSearch,
              placeholder: "Search members…",
              label: "Search members",
            }}
            trailing={
              <>
                <DisplayPropsToggle value={displayProps} onChange={handleDisplayChange} />
                {canManage ? <PmAccessButton /> : null}
              </>
            }
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <PageState
              resolution={pageState}
              loading={
                <DataTableSkeleton mobileCards
                  rows={12}
                  headers={MEMBER_TABLE_HEADERS}
                  className="flex-1"
                />
              }
              empty={
                <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="team"
                  title="No members yet"
                  description={
                    listFilters.isFiltered
                      ? undefined
                      : canManage
                        ? "Add the first person who should have access to Build."
                        : "People with access to Build will appear here."
                  }
                  filtersActive={listFilters.isFiltered}
                  onClearFilters={listFilters.clearAll}
                  action={
                    !listFilters.isFiltered && canManage
                      ? { label: "Add member", onClick: handleOpenAddDialog }
                      : undefined
                  }
                />
              }
              onRetry={handleRetry}
              className={PM_FILL_PANEL}
            >
              <DataTable
                className={PM_FILL_PANEL}
                data={members}
                columns={columns}
                getRowKey={(member) => member.id}
                mobileCard={renderMobileCard}
                minWidth="640px"
                pagination={{
                  mode: "cursor",
                  pageSize: 25,
                  hasMore: hasNext,
                  hasPrevious,
                  onNext: handleNextPage,
                  onPrevious: goPrevious,
                }}
              />
            </PageState>
          </PmSection>
        </PmPageShell>
      </PageWrapper>

      <AddMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={handleRemoveConfirmOpenChange}
        title="Remove member?"
        description={
          removeTarget
            ? `${getUserDisplayName(removeTarget)} will lose access to Build. They stay a member of your organization.`
            : "This person will lose access to Build. They stay a member of your organization."
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        isPending={removeMember.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
