"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  ChevronsUpDown,
  User,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DeleteProjectDialog } from "@/features/build/sidebar/delete-project-dialog";
import { updateProjectSettingsInputSchema } from "@/lib/validation/projects";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useProjectMembers,
  useUpdateProjectMemberRole,
} from "@/hooks/api/build";
import { useCanManageProject } from "@/hooks/api/build/use-can-manage-project";
import { useOrgMembers } from "@/hooks/api/organization";
import { useProjectWorkspaceMembers } from "@/hooks/api/build/workspace-members";
import { useCan } from "@/hooks/api/access";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/build/shared/resolve-user-name";
import type { ProjectMemberRecord } from "@/types/projects";

type DirectoryPerson = {
  id: string;
  name: string | null;
  email: string;
};

function useWorkspaceDirectoryPeople(enabled = true): DirectoryPerson[] {
  const canViewOrgMembers = useCan("settings:view");
  const canViewProjectWorkspaceMembers = useCan("build:members:view");
  const useOrg = enabled && canViewOrgMembers;
  const useWorkspace = enabled && !canViewOrgMembers && canViewProjectWorkspaceMembers;

  const { data: orgMembersData } = useOrgMembers(1, 200, undefined, {
    enabled: useOrg,
  });
  const { data: workspaceData } = useProjectWorkspaceMembers(
    { limit: 200 },
    { enabled: useWorkspace },
  );

  return useMemo(() => {
    if (useOrg) {
      return (orgMembersData?.data ?? []).map((m) => ({
        id: m.userId,
        name: m.name,
        email: m.email,
      }));
    }
    return (workspaceData?.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
    }));
  }, [useOrg, orgMembersData?.data, workspaceData?.data]);
}

export const formSchema = updateProjectSettingsInputSchema.omit({
  projectId: true,
});

interface MemberItemProps {
  emp: { id: string; name?: string | null; email?: string | null };
  isSelected: boolean;
  isOriginalMember: boolean;
  currentIds: string[];
  onChange: (ids: string[]) => void;
  onMemberRemoved: (id: string, name: string, apply: () => void) => void;
}

const MemberItem = memo(function MemberItem({
  emp,
  isSelected,
  isOriginalMember,
  currentIds,
  onChange,
  onMemberRemoved,
}: MemberItemProps) {
  function handleClick() {
    if (isSelected) {
      const applyRemoval = () =>
        onChange(currentIds.filter((id) => id !== emp.id));
      if (isOriginalMember) {
        onMemberRemoved(emp.id, emp.name ?? emp.email ?? emp.id, applyRemoval);
      } else {
        applyRemoval();
      }
    } else {
      onChange([...currentIds, emp.id]);
    }
  }

  return (
    <button
      type="button"
      className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left"
      onClick={handleClick}
    >
      <Checkbox
        checked={isSelected}
        tabIndex={-1}
        className="pointer-events-none"
        aria-hidden
      />
      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium shrink-0">
        {emp.name?.charAt(0) || <User className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{emp.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {emp.email}
        </p>
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
});

interface MembersSelectorProps {
  memberIds: string[];
  onMemberIdsChange: (ids: string[]) => void;
  originalMemberIds: string[];
  onMemberRemoved: (
    memberId: string,
    memberName: string,
    applyChange: () => void,
  ) => void;
}

export function MembersSelector({
  memberIds,
  onMemberIdsChange,
  originalMemberIds,
  onMemberRemoved,
}: MembersSelectorProps) {
  const employees = useWorkspaceDirectoryPeople();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = useMemo(
    () =>
      employees?.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [employees, searchQuery],
  );

  const handleSearchChange = useCallback(
    (value: string) => setSearchQuery(value),
    [],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
          role="combobox"
        >
          {memberIds.length > 0
            ? `${memberIds.length} member${memberIds.length > 1 ? "s" : ""} selected`
            : "Select members"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-2"
        align="start"
      >
        <SearchInput
          placeholder="Search by name or email..."
          value={searchQuery}
          onValueChange={handleSearchChange}
          className="mb-2"
          aria-label="Search team members"
        />
        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
          {filteredEmployees?.map((emp) => (
            <MemberItem
              key={emp.id}
              emp={emp}
              isSelected={memberIds.includes(emp.id)}
              isOriginalMember={originalMemberIds.includes(emp.id)}
              currentIds={memberIds}
              onChange={onMemberIdsChange}
              onMemberRemoved={onMemberRemoved}
            />
          ))}
          {!filteredEmployees?.length && (
            <p className="text-sm text-center py-4 text-muted-foreground">
              No employees found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ReassignDialogProps {
  open: boolean;
  memberName: string;
  removedMemberId: string;
  currentMemberIds: string[];
  reassignTo: string;
  onReassignToChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ReassignDialog({
  open,
  memberName,
  removedMemberId,
  currentMemberIds,
  reassignTo,
  onReassignToChange,
  onConfirm,
  onCancel,
}: ReassignDialogProps) {
  const employees = useWorkspaceDirectoryPeople(open);

  const remainingMembers = useMemo(
    () =>
      employees.filter(
        (emp) =>
          currentMemberIds.includes(emp.id) && emp.id !== removedMemberId,
      ),
    [employees, currentMemberIds, removedMemberId],
  );

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) onCancel();
    },
    [onCancel],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-amber-500" />
            Reassign open tickets
          </DialogTitle>
          <DialogDescription>
            <strong>{memberName}</strong> has open tickets in this project.
            Choose a team member to reassign them to, or leave them unassigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Reassign to
          </p>
          <Select value={reassignTo} onValueChange={onReassignToChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassign__">
                <span className="text-muted-foreground">Leave unassigned</span>
              </SelectItem>
              {remainingMembers.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name || emp.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel removal
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DangerZoneSectionProps {
  projectId: number;
  projectName: string;
  onDeleted: () => void;
}

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
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-medium shrink-0 select-none">
        {member.image ? (
          <img
            src={member.image}
            alt={displayName}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {member.email}
        </p>
      </div>
      {canManage ? (
        <Select
          value={currentRole}
          onValueChange={handleRoleChange}
          disabled={updateRole.isPending}
        >
          <SelectTrigger className="h-7 w-[100px] text-xs">
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
  const canManage = useCanManageProject(projectId);
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

export const DangerZoneSection = memo(function DangerZoneSection({
  projectId,
  projectName,
  onDeleted,
}: DangerZoneSectionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  return (
    <Card className="border-destructive/30">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">
          Deleting a project is irreversible. It will remove all tickets,
          sprints, and associated data.
        </p>
        <AnimatedIconButton
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          icon={Trash2Icon}
          iconSize={14}
          iconClassName="mr-1.5"
        >
          Delete Project
        </AnimatedIconButton>
        <DeleteProjectDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          projectId={projectId}
          projectName={projectName}
          onDeleted={onDeleted}
        />
      </CardContent>
    </Card>
  );
});
