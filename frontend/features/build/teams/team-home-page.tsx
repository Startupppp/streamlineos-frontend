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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { TeamFormSheet } from "./team-form-sheet";
import { TeamProjectsSection } from "./team-projects-section";
import type { UpdateTeamInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
} from "@/components/pm-chrome";
import {
  TeamDetailSkeleton,
} from "./team-member-controls";
import { TeamMembersSection } from "./team-members-section";
import { TeamActionsMenu, TeamHeaderMeta, TeamHeaderTitle } from "./team-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, Users } from "lucide-react";

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
      title={<TeamHeaderTitle team={data} />}
      subtitle={
        <TeamHeaderMeta
          team={data}
          memberCount={pageMembers.length}
          hasMoreMembers={Boolean(membersResult.data?.pagination.hasMore)}
        />
      }
      backHref="/build/teams"
      actionsInline
      actions={
        canManage ? (
          <TeamActionsMenu
            className="hidden sm:inline-flex"
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        ) : undefined
      }
    >
      <PmPageShell className="gap-3 pb-6">
        <Tabs
          defaultValue="members"
          className="min-h-0 min-w-0 w-full flex-1 gap-3"
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <TabsList aria-label="Team workspace" className="flex-1 sm:flex-none">
              <TabsTrigger value="members">
                <Users aria-hidden="true" />
                Members
              </TabsTrigger>
              <TabsTrigger value="projects">
                <FolderKanban aria-hidden="true" />
                Projects
              </TabsTrigger>
            </TabsList>
            {canManage ? (
              <TeamActionsMenu
                className="size-9 px-0 sm:hidden"
                onEdit={() => setEditOpen(true)}
                onDelete={() => setDeleteOpen(true)}
              />
            ) : null}
          </div>

          <TabsContent
            value="members"
            className="mt-0 min-h-0 min-w-0 w-full flex-1"
          >
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
          </TabsContent>

          <TabsContent
            value="projects"
            className="mt-0 min-h-0 min-w-0 w-full flex-1"
          >
            <TeamProjectsSection teamId={teamId} />
          </TabsContent>
        </Tabs>
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
