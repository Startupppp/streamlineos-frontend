"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useProjectTeam,
  useTeamMembers,
  useUpdateProjectTeam,
  useDeleteProjectTeam,
  useAddProjectTeamMember,
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
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { TeamFormSheet } from "./team-form-sheet";
import { TeamProjectsSection } from "./team-projects-section";
import { MemberPicker } from "@/components/members/member-picker";
import type { UpdateTeamInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";
import {
  TeamActionsButton,
  AddMemberButton,
  RemoveMemberButton,
  MemberRoleSelect,
  TeamDetailSkeleton,
} from "./team-member-controls";

const TEAM_MEMBER_ROLES = ["member", "lead"] as const;

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
  const [addMemberId, setAddMemberId] = useState<string | undefined>(undefined);
  const [addMemberRole, setAddMemberRole] = useState<"member" | "lead">("member");
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS, withSearch: true });
  const memberPager = useBuildCursorPager(listFilters.resetKey);

  function handleAddMemberRoleChange(value: string): void {
    const role = TEAM_MEMBER_ROLES.find((candidate) => candidate === value);
    if (role) setAddMemberRole(role);
  }

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
  const addMember = useAddProjectTeamMember(teamId);
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

  function handleAddMember() {
    if (!addMemberId) return;
    addMember.mutate(
      { userId: addMemberId, role: addMemberRole },
      {
        onSuccess: () => {
          toast.success("Member added");
          setAddMemberId(undefined);
          setAddMemberRole("member");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
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

  function handleOpenEdit() {
    setEditOpen(true);
  }

  function handleOpenDelete() {
    setDeleteOpen(true);
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
              <DropdownMenuItem onClick={handleOpenEdit}>Edit Team</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleOpenDelete}>
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
              <Badge variant="outline" className="text-micro">
                Private
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-micro">
                Public
              </Badge>
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

        <PmSection index={1} className="space-y-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
              Members{pageMembers.length > 0 ? ` (${pageMembers.length}${membersResult.data?.pagination.hasMore ? "+" : ""})` : ""}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SearchInput
                ref={searchRef}
                value={listFilters.search}
                onValueChange={listFilters.setSearch}
                placeholder="Search members…"
                aria-label="Search members"
              />
              {canManage ? (
                <>
                  <MemberPicker
                    value={addMemberId}
                    onChange={(id) => setAddMemberId(id ?? undefined)}
                    excludeUserIds={data.members.map((m) => m.userId)}
                    placeholder="Add a member…"
                    className="h-8 min-w-[180px]"
                  />
                  <Select value={addMemberRole} onValueChange={handleAddMemberRoleChange}>
                    <SelectTrigger className="w-24 border-input bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                  <AddMemberButton
                    disabled={!addMemberId}
                    isPending={addMember.isPending}
                    onClick={handleAddMember}
                  />
                </>
              ) : null}
            </div>
          </div>

          {pageMembers.length === 0 && !membersResult.isLoading ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustrationPreset="projects"
                title={!isOnline && pageMembers.length === 0 ? "You are offline" : "No members yet"}
                description={!isOnline && pageMembers.length === 0 ? "Reconnect to see team members." : "Add members to this team."}
                compact
              />
            </PmPanel>
          ) : (
            <PmPanel role="list" aria-label="Team members" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {pageMembers.map((member) => {
                const displayName = getUserDisplayName({
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.email,
                });
                const initials = getUserInitials({
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.email,
                });
                return (
                  <div key={member.id} role="listitem" className={PM_ROW}>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={resolveImageUrl(member.image)} />
                      <AvatarFallback className="text-micro">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className={cn(TEXT_ONE_LINE, "text-sm font-medium text-foreground")}>
                        {displayName}
                      </span>
                      <span className="text-dense text-muted-foreground">{member.email}</span>
                    </div>
                    {canManage ? (
                      <MemberRoleSelect
                        member={member}
                        isPending={updateMemberRole.isPending}
                        onRoleChange={handleRoleChange}
                      />
                    ) : (
                      <Badge variant="outline" className="shrink-0 px-1.5 py-0.5 text-micro capitalize">
                        {member.role}
                      </Badge>
                    )}
                    {canManage ? (
                      <RemoveMemberButton
                        member={member}
                        isPending={removeMember.isPending}
                        onRemove={handleRemoveMember}
                      />
                    ) : null}
                  </div>
                );
              })}
              </div>
              {(memberPager.hasPrevious || membersResult.data?.pagination.hasMore) ? (
                <TablePagination
                  mode="cursor"
                  rowCount={pageMembers.length}
                  pageNumber={memberPager.pageNumber}
                  hasMore={Boolean(membersResult.data?.pagination.hasMore)}
                  hasPrevious={memberPager.hasPrevious}
                  onNext={handleMembersNext}
                  onPrevious={memberPager.goPrevious}
                />
              ) : null}
            </PmPanel>
          )}
        </PmSection>
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
