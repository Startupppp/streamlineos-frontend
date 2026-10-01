"use client";

import { memo, useCallback } from "react";
import { TablePagination } from "@/components/ui/table-pagination";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useProjectMembers,
  useUpdateProjectMemberRole,
} from "@/hooks/api/build/project-members";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import type { ProjectMemberRecord } from "@/types/projects";
import { resolveImageUrl } from "@/lib/utils";
import { matchesAccessSearch } from "./access-search";

type ProjectMemberRole = "ADMIN" | "MEMBER" | "VIEWER";

const ROLE_OPTIONS: { value: ProjectMemberRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "VIEWER", label: "Viewer" },
];

function normalizeRole(role: string | null | undefined): ProjectMemberRole {
  if (role === "ADMIN" || role === "MEMBER" || role === "VIEWER") return role;
  return "MEMBER";
}

interface MemberRoleRowProps {
  member: ProjectMemberRecord;
  projectId: number;
  canManage: boolean;
}

const MemberRoleRow = memo(function MemberRoleRow({
  member,
  projectId,
  canManage,
}: MemberRoleRowProps) {
  const updateRole = useUpdateProjectMemberRole();
  const displayName = getUserDisplayName(member);
  const initials = getUserInitials(member);
  const currentRole = normalizeRole(member.role);

  function handleRoleChange(value: string) {
    if (value !== "ADMIN" && value !== "MEMBER" && value !== "VIEWER") return;
    updateRole.mutate(
      { projectId, memberUserId: member.id, role: value },
      {
        onSuccess: () =>
          toast.success(`${displayName}'s role updated to ${value}`),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-dense font-medium shrink-0 select-none">
        {member.image ? (
          <img
            src={resolveImageUrl(member.image)}
            alt={displayName}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-dense text-muted-foreground truncate">
          {member.email}
        </p>
      </div>
      {canManage ? (
        <Select
          value={currentRole}
          onValueChange={handleRoleChange}
          disabled={updateRole.isPending}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="secondary" className="text-xs font-normal">
          {currentRole}
        </Badge>
      )}
    </div>
  );
});

interface ProjectMemberRolesSectionProps {
  projectId: number;
  search?: string;
}

export function ProjectMemberRolesSection({
  projectId,
  search = "",
}: ProjectMemberRolesSectionProps) {
  const canManage = useCan("build:manage");
  const pager = useBuildCursorPager();
  const {
    data: page,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectMembers(projectId, {
    cursor: pager.cursor,
    search: search || undefined,
  });

  const resolution = usePageState({ permission: "build:view", isLoading, isError, error });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const loadingSkeleton = (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
          <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-2.5 w-32 rounded bg-muted" />
          </div>
          <div className="h-7 w-[100px] rounded bg-muted" />
        </div>
      ))}
    </div>
  );

  const members = page?.data ?? [];
  const filteredMembers = members.filter((member) =>
    matchesAccessSearch(search, [
      getUserDisplayName(member),
      member.email,
      member.role,
    ]),
  );
  const pagination = page?.pagination;

  return (
    <PageState resolution={resolution} loading={loadingSkeleton} onRetry={handleRetry} compact>
      {!filteredMembers.length ? (
        <p className="text-sm text-muted-foreground py-2">
          {search.trim() ? "No direct members match your search." : "No members yet."}
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {filteredMembers.map((member) => (
              <MemberRoleRow
                key={member.id}
                member={member}
                projectId={projectId}
                canManage={canManage}
              />
            ))}
          </div>
          {(pagination?.hasMore || pager.hasPrevious) ? (
            <TablePagination
              mode="cursor"
              rowCount={filteredMembers.length}
              pageNumber={pager.pageNumber}
              hasMore={pagination?.hasMore ?? false}
              hasPrevious={pager.hasPrevious}
              onNext={() => pager.goNext(pagination?.nextCursor)}
              onPrevious={pager.goPrevious}
            />
          ) : null}
        </div>
      )}
    </PageState>
  );
}
