"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
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
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Check, ChevronsUpDown, User, UserX } from "lucide-react";
import { useOrgMembers } from "@/hooks/api/organization";
import { useProjectWorkspaceMembers } from "@/hooks/api/build/workspace-members";
import { useCan } from "@/hooks/api/access";

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
      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-micro font-medium shrink-0">
        {emp.name?.charAt(0) || <User className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{emp.name}</p>
        <p className="text-dense text-muted-foreground truncate">
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
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
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
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Select members"
        className="min-w-[var(--radix-popover-trigger-width)] p-2"
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
      </ResponsivePopoverContent>
    </ResponsivePopover>
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
