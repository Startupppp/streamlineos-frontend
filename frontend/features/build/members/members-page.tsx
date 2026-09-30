"use client";

import { useState, useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { keepPreviousData } from "@tanstack/react-query";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useBuildMembers,
  useRemoveBuildMember,
} from "@/hooks/api/build/build-members";
import type { BuildMember } from "@/hooks/api/build/build-members";
import { useCan } from "@/hooks/api/access";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { getUserDisplayName } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { PmAccessButton } from "@/features/build/members/pm-access-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  type DisplayProps,
  loadDisplayProps,
  saveDisplayProps,
} from "./display-props";
import { DisplayPropsToggle } from "./members-toolbar";
import { MemberActions } from "./member-row-actions";
import { AddMemberDialog } from "./add-member-dialog";
import { useMembersColumns } from "./use-members-columns";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";

const MEMBER_TABLE_HEADERS = ["Name", "Role", "Added", "Actions"] as const;

export function MembersPage() {
  const [displayProps, setDisplayProps] =
    useState<DisplayProps>(loadDisplayProps);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<BuildMember | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isOnline = useOnlineStatus();

  const listFilters = useBuildListFilters({ searchParam: "search" });
  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const canView = useCan("build:members:view");
  const canManage = useCan("build:members:manage");

  const { data, isLoading, isError, error, refetch } =
    useBuildMembers(
      {
        cursor,
        limit: 25,
        search: listFilters.debouncedSearch.trim() || undefined,
      },
      { placeholderData: keepPreviousData, enabled: canView },
    );

  const members = data?.data ?? [];

  const removeMember = useRemoveBuildMember();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDisplayChange = useCallback((next: DisplayProps) => {
    setDisplayProps(next);
    saveDisplayProps(next);
  }, []);

  const handleOpenAddDialog = useCallback(() => setAddDialogOpen(true), []);

  const handleRemoveRequest = useCallback((member: BuildMember) => {
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
      onError: (err: Error) => {
        toast.error(getErrorMessage(err));
      },
    });
  }, [removeTarget, removeMember]);

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const handleKeyboardOpen = useCallback((_index: number) => {}, []);
  const handleKeyboardClearSelection = useCallback(() => setRemoveTarget(null), []);

  useBuildListKeyboard({
    itemCount: members.length,
    onOpen: handleKeyboardOpen,
    onCreate: handleOpenAddDialog,
    onClearSelection: handleKeyboardClearSelection,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: !isLoading,
  });

  const columns = useMembersColumns({
    displayProps,
    canManage,
    handleRemoveRequest,
  });

  const renderMobileCard = useCallback(
    (member: BuildMember) => {
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
                  label: "Add workspace member",
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
              inputRef: searchInputRef,
            }}
            trailing={
              <>
                <DisplayPropsToggle
                  value={displayProps}
                  onChange={handleDisplayChange}
                />
                {canManage ? <PmAccessButton /> : null}
              </>
            }
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <BuildListSurface<BuildMember>
              permission="build:members:view"
              rows={members}
              columns={columns}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isFiltered={listFilters.isFiltered && isOnline}
              getRowKey={(member) => member.id}
              mobileCard={renderMobileCard}
              minWidth="640px"
              pagination={{
                mode: "cursor",
                pageSize: 25,
                pageNumber,
                hasMore: hasNext,
                hasPrevious,
                onNext: handleNextPage,
                onPrevious: goPrevious,
              }}
              loadingRows={12}
              loadingHeaders={MEMBER_TABLE_HEADERS}
              empty={
                isOnline ? (
                  <EmptyState
                    className={CONTENT_FILL_PANEL}
                    illustrationPreset="team"
                    title="No members yet"
                    description={
                      canManage
                        ? "Add the first person who should have access to the Build workspace."
                        : "People with access to Build will appear here."
                    }
                    action={
                      canManage
                        ? { label: "Add workspace member", onClick: handleOpenAddDialog }
                        : undefined
                    }
                  />
                ) : (
                  <EmptyState
                    className={CONTENT_FILL_PANEL}
                    illustrationPreset="team"
                    title="You are offline"
                    description="Reconnect to see the latest member list."
                  />
                )
              }
              filteredEmpty={
                <EmptyState
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="team"
                  title="No members yet"
                  filtersActive
                  onClearFilters={listFilters.clearAll}
                />
              }
              onRetry={handleRetry}
            />
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

      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
      />
    </>
  );
}
