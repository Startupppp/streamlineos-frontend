"use client";

import { memo } from "react";
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
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import type { ProjectMemberRecord } from "@/types/projects";
import { resolveImageUrl } from "@/lib/utils";

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
          <SelectTrigger className="w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
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
}

export function ProjectMemberRolesSection({
  projectId,
}: ProjectMemberRolesSectionProps) {
  const canManage = useCan("build:manage");
  const { data: members, isLoading } = useProjectMembers(projectId);

  if (isLoading) {
    return (
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
  }

  if (!members?.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">No members yet.</p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {members.map((member) => (
        <MemberRoleRow
          key={member.id}
          member={member}
          projectId={projectId}
          canManage={canManage}
        />
      ))}
    </div>
  );
}
