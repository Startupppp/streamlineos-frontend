"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAddProjectTeamMember } from "@/hooks/api/build/teams";
import type { TeamMemberPage } from "@/hooks/api/build/teams-schema";
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
import { SearchInput } from "@/components/ui/search-input";
import { MemberPicker } from "@/components/members/member-picker";
import {
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  AddMemberButton,
  RemoveMemberButton,
  MemberRoleSelect,
} from "./team-member-controls";

const TEAM_MEMBER_ROLES = ["member", "lead"] as const;

interface ExistingMember {
  userId: string;
}

interface MemberPagination {
  hasMore: boolean;
  nextCursor?: string | null;
}

interface MembersResult {
  isLoading: boolean;
  data?: { pagination: MemberPagination };
}

interface MemberPager {
  pageNumber: number;
  hasPrevious: boolean;
  goPrevious: () => void;
}

interface ListFilters {
  search: string;
  setSearch: (v: string) => void;
}

interface TeamMembersSectionProps {
  teamId: number;
  members: ExistingMember[];
  isOnline: boolean;
  searchRef: React.RefObject<HTMLInputElement | null>;
  listFilters: ListFilters;
  pageMembers: TeamMemberPage["data"];
  membersResult: MembersResult;
  memberPager: MemberPager;
  onMembersNext: () => void;
  isRoleUpdatePending: boolean;
  onRoleChange: (memberUserId: string, role: "member" | "lead") => void;
  isRemovePending: boolean;
  onRemove: (userId: string) => void;
  canManage: boolean;
}

export function TeamMembersSection({
  teamId,
  members,
  isOnline,
  searchRef,
  listFilters,
  pageMembers,
  membersResult,
  memberPager,
  onMembersNext,
  isRoleUpdatePending,
  onRoleChange,
  isRemovePending,
  onRemove,
  canManage,
}: TeamMembersSectionProps) {
  const [addMemberId, setAddMemberId] = useState<string | undefined>(undefined);
  const [addMemberRole, setAddMemberRole] = useState<"member" | "lead">("member");
  const addMember = useAddProjectTeamMember(teamId);

  function handleAddMemberRoleChange(value: string): void {
    const role = TEAM_MEMBER_ROLES.find((candidate) => candidate === value);
    if (role) setAddMemberRole(role);
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

  return (
    <PmSection index={1} className="space-y-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
          Members
          {pageMembers.length > 0
            ? ` (${pageMembers.length}${membersResult.data?.pagination.hasMore ? "+" : ""})`
            : ""}
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
                excludeUserIds={members.map((m) => m.userId)}
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
            title={!isOnline ? "You are offline" : "No members yet"}
            description={
              !isOnline
                ? "Reconnect to see team members."
                : "Add members to this team."
            }
            compact
          />
        </PmPanel>
      ) : (
        <PmPanel
          role="list"
          aria-label="Team members"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
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
                    <span
                      className={cn(TEXT_ONE_LINE, "text-sm font-medium text-foreground")}
                    >
                      {displayName}
                    </span>
                    <span className="text-dense text-muted-foreground">
                      {member.email}
                    </span>
                  </div>
                  {canManage ? (
                    <MemberRoleSelect
                      member={member}
                      isPending={isRoleUpdatePending}
                      onRoleChange={onRoleChange}
                    />
                  ) : (
                    <Badge
                      variant="outline"
                      className="shrink-0 px-1.5 py-0.5 text-micro capitalize"
                    >
                      {member.role}
                    </Badge>
                  )}
                  {canManage ? (
                    <RemoveMemberButton
                      member={member}
                      isPending={isRemovePending}
                      onRemove={onRemove}
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
              onNext={onMembersNext}
              onPrevious={memberPager.goPrevious}
            />
          ) : null}
        </PmPanel>
      )}
    </PmSection>
  );
}
