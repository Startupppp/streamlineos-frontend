"use client";

import { useState } from "react";
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
    <PmSection
      index={1}
      className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Members
          {pageMembers.length > 0
            ? ` (${pageMembers.length}${membersResult.data?.pagination.hasMore ? "+" : ""})`
            : ""}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Assign a lead and manage who receives access through this team.
          </p>
        </div>
      </div>

      <PmPanel className="space-y-2 p-2.5 sm:p-3">
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto]">
          <SearchInput
            ref={searchRef}
            value={listFilters.search}
            onValueChange={listFilters.setSearch}
            placeholder="Search members…"
            aria-label="Search members"
            inputClassName="h-9"
          />
          {canManage ? <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.75rem_auto] gap-2">
              <MemberPicker
                directory="build"
                value={addMemberId}
                onChange={(id) => setAddMemberId(id ?? undefined)}
                excludeUserIds={members.map((m) => m.userId)}
                placeholder="Add a member…"
                className="h-9 min-w-0 w-full"
              />
              <Select value={addMemberRole} onValueChange={handleAddMemberRoleChange}>
                <SelectTrigger className="h-9 w-full border-input bg-card">
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
            </div> : null}
        </div>
      </PmPanel>

      {pageMembers.length === 0 && !membersResult.isLoading ? (
        <PmPanel className="flex min-h-0 min-w-0 w-full flex-1 items-center justify-center p-4">
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
                <div key={member.id} role="listitem" className={cn(PM_ROW, "gap-2.5 px-3 py-2.5")}>
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
                  {canManage ? <div className="flex shrink-0 items-center gap-1">
                    <MemberRoleSelect
                      member={member}
                      isPending={isRoleUpdatePending}
                      onRoleChange={onRoleChange}
                    />
                    <RemoveMemberButton
                      member={member}
                      isPending={isRemovePending}
                      onRemove={onRemove}
                    />
                  </div> : (
                    <Badge
                      variant="outline"
                      className="shrink-0 px-1.5 py-0.5 text-micro capitalize"
                    >
                      {member.role}
                    </Badge>
                  )}
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
