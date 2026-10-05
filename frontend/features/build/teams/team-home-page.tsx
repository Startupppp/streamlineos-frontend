"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useProjectTeam,
  useTeamMembers,
  useUpdateProjectTeam,
  useDeleteProjectTeam,
  useRemoveProjectTeamMember,
  useUpdateProjectTeamMemberRole,
} from "@/hooks/api/build/teams";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useBuildListFilters, BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { TeamFormSheet } from "./team-form-sheet";
import { TeamProjectsSection } from "./team-projects-section";
import type { UpdateTeamInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import {
  TeamActionsButton,
  TeamDetailSkeleton,
} from "./team-member-controls";
import { TeamMembersSection } from "./team-members-section";

const FILTER_DEFINITIONS = [{ param: "leadId" }, { param: "memberId" }] as const;

interface Props {
  teamId: number;
}

export function TeamHomePage({ teamId }: Props) {
  const canManage = useCan("build:teams:manage");
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS, withSearch: true });
  const memberPager = useBuildCursorPager(listFilters.resetKey);

  const debouncedSearch = listFilters.debouncedSearch;
  const leadIdFilter = listFilters.value("leadId");
  const memberIdFilter = listFilters.value("memberId");

  const { data, isLoading, isError, error, refetch } = useProjectTeam(teamId);
  const membersResult = useTeamMembers(teamId, memberPager.cursor, 50, {
    q: debouncedSearch || undefined,
    leadId: leadIdFilter !== BUILD_FILTER_ALL ? leadIdFilter : undefined,
    memberId: memberIdFilter !== BUILD_FILTER_ALL ? memberIdFilter : undefined,
  });
  const pageMembers = useMemo(() => membersResult.data?.data ?? [], [membersResult.data]);

  const updateTeam = useUpdateProjectTeam();
  const deleteTeam = useDeleteProjectTeam();
  const removeMember = useRemoveProjectTeamMember(teamId);
  const updateMemberRole = useUpdateProjectTeamMemberRole(teamId);

  const handleMembersNext = useCallback(() => {
    memberPager.goNext(membersResult.data?.pagination.nextCursor);
  }, [memberPager, membersResult.data?.pagination.nextCursor]);

  const handleKeyboardOpen = useCallback(() => undefined, []);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  useBuildListKeyboard({
    itemCount: pageMembers.length,
    onOpen: handleKeyboardOpen,
    onClearSelection: memberPager.reset,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef: searchRef,
    enabled: !isLoading,
  });

  function handleEdit(input: UpdateTeamInput & { teamId: number }) {
    updateTeam.mutate(input, {
      onSuccess: () => {
        toast.success("Team updated");
        setEditOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    deleteTeam.mutate(teamId, {
      onSuccess: () => {
        toast.success("Team deleted");
        router.push("/build/teams");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRemoveMember(userId: string) {
    removeMember.mutate(userId, {
      onSuccess: () => toast.success("Member removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRoleChange(memberUserId: string, role: "member" | "lead") {
    updateMemberRole.mutate(
      { memberUserId, role },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleRetry() {
    void refetch();
  }

  const pageState = usePageState({
    permission: "build:teams:view",
    isLoading,
    isError,
    error,
    isEmpty: !data,
  });

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageWrapper title="Team" backHref="/build/teams">
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <PageState
              resolution={pageState}
              loading={<TeamDetailSkeleton />}
              onRetry={handleRetry}
              className="flex-1"
            >
              {null}
            </PageState>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (!data) {
    return (
      <PageWrapper title="Team" backHref="/build/teams">
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <EmptyState
              className="flex-1"
              illustrationPreset="projects"
              title="Team not found"
              description="This team may have been deleted."
            />
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={data.name}
      subtitle={`Team · ${data.key}`}
      backHref="/build/teams"
      actions={
        canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TeamActionsButton />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Team</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="flex flex-wrap items-center gap-3 p-4">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-medium text-white"
              style={{ backgroundColor: data.color ?? "#64748b" }}
            >
              {data.icon ?? data.key.slice(0, 2)}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{data.key}</span>
            {data.isPrivate ? (
              <Badge variant="outline" className="text-micro">Private</Badge>
            ) : (
              <Badge variant="secondary" className="text-micro">Public</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {pageMembers.length}{membersResult.data?.pagination.hasMore ? "+" : ""} member{pageMembers.length !== 1 ? "s" : ""}
            </span>
            {data.capacity !== null && data.capacity !== undefined ? (
              <span className="text-sm text-muted-foreground" data-testid="team-capacity">
                Capacity {data.capacity}
              </span>
            ) : null}
          </PmPanel>
        </PmSection>

        <TeamMembersSection
          teamId={teamId}
          members={data.members}
          isOnline={isOnline}
          searchRef={searchRef}
          listFilters={listFilters}
          pageMembers={pageMembers}
          membersResult={membersResult}
          memberPager={memberPager}
          onMembersNext={handleMembersNext}
          isRoleUpdatePending={updateMemberRole.isPending}
          onRoleChange={handleRoleChange}
          isRemovePending={removeMember.isPending}
          onRemove={handleRemoveMember}
          canManage={canManage}
        />

        <TeamProjectsSection teamId={teamId} />
      </PmPageShell>

      <TeamFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={data}
        onSubmitCreate={() => undefined}
        onSubmitEdit={handleEdit}
        isPending={updateTeam.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${data.name}"?`}
        description="This action cannot be undone. All team memberships will be removed."
        confirmLabel="Delete"
        destructive
        isPending={deleteTeam.isPending}
        onConfirm={handleDeleteConfirm}
      />
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </PageWrapper>
  );
}
