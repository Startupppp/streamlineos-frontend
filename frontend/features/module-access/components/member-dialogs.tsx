"use client";

import { useState, useCallback, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { MemberPicker } from "@/components/members/member-picker";
import {
  useAddModuleMember,
  useUpdateModuleMember,
  useRemoveModuleMember,
  type ModuleMember,
  type ModuleMemberGroup,
} from "@/hooks/api/module-access";

function resolveDisplayName(member: { displayName: string; email: string }): string {
  return member.displayName || member.email || "Unknown user";
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: string;
  allGroups: ModuleMemberGroup[];
  defaultUserId?: string;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  moduleKey,
  allGroups,
  defaultUserId,
}: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId ?? "");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
  const addMember = useAddModuleMember(moduleKey);

  useEffect(() => {
    if (!open) return;
    setSelectedUserId(defaultUserId ?? "");
    setSelectedGroupIds(new Set());
  }, [defaultUserId, open]);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelectedUserId("");
        setSelectedGroupIds(new Set());
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleUserChange = useCallback(
    (val: string | null) => setSelectedUserId(val ?? ""),
    [],
  );

  const handleGroupToggle = useCallback((groupId: number, checked: boolean) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    if (!selectedUserId || selectedGroupIds.size === 0) return;
    addMember.mutate(
      { userId: selectedUserId, groupIds: Array.from(selectedGroupIds) },
      {
        onSuccess: () => {
          toast.success("Member added");
          setSelectedUserId("");
          setSelectedGroupIds(new Set());
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [selectedUserId, selectedGroupIds, addMember, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>Grant a user access to this module.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">User</p>
            <MemberPicker
              moduleKey={moduleKey}
              value={selectedUserId}
              onChange={handleUserChange}
              enabled={open}
              placeholder="Select a user…"
            />
          </div>

          {allGroups.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Assign to groups</p>
              <p className="text-[11px] text-muted-foreground">
                A member gets module access through its groups — pick at least one.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {allGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGroupIds.has(group.id)}
                      onCheckedChange={(checked) =>
                        handleGroupToggle(group.id, !!checked)
                      }
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This module has no role groups yet. Create one on the Roles tab
                first — a member can only get access through a group.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            isPending={addMember.isPending}
            loadingText="Adding…"
            onClick={handleAdd}
            disabled={!selectedUserId || selectedGroupIds.size === 0}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add member
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: string;
  member: ModuleMember | null;
  allGroups: ModuleMemberGroup[];
}

export function EditGroupsDialog({
  open,
  onOpenChange,
  moduleKey,
  member,
  allGroups,
}: EditGroupsDialogProps) {
  const initialGroupIds = new Set(member?.groups.map((g) => g.id) ?? []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(initialGroupIds);
  const updateMember = useUpdateModuleMember(moduleKey);

  useEffect(() => {
    if (!open) return;
    setSelectedGroupIds(new Set(member?.groups.map((group) => group.id) ?? []));
  }, [member, open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelectedGroupIds(new Set(member?.groups.map((g) => g.id) ?? []));
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, member],
  );

  const handleGroupToggle = useCallback((groupId: number, checked: boolean) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!member || selectedGroupIds.size === 0) return;
    updateMember.mutate(
      { userId: member.userId, groupIds: Array.from(selectedGroupIds) },
      {
        onSuccess: () => {
          toast.success("Group assignments updated");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [member, selectedGroupIds, updateMember, onOpenChange]);

  const displayName = member ? resolveDisplayName(member) : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit groups</DialogTitle>
          <DialogDescription>
            Update group assignments for{" "}
            <span className="font-medium">{displayName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-52 overflow-y-auto">
          {allGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No groups defined for this module.
            </p>
          ) : (
            allGroups.map((group) => (
              <label
                key={group.id}
                className="flex items-center gap-2 py-1 cursor-pointer"
              >
                <Checkbox
                  checked={selectedGroupIds.has(group.id)}
                  onCheckedChange={(checked) =>
                    handleGroupToggle(group.id, !!checked)
                  }
                />
                <span className="text-sm">{group.name}</span>
              </label>
            ))
          )}
        </div>

        {allGroups.length > 0 && selectedGroupIds.size === 0 && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            A member keeps module access through their groups. To take access
            away entirely, close this and use Remove.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={updateMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            isPending={updateMember.isPending}
            loadingText="Saving…"
            onClick={handleSave}
            disabled={selectedGroupIds.size === 0}
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: string;
  member: ModuleMember | null;
}

export function ConfirmRemoveDialog({
  open,
  onOpenChange,
  moduleKey,
  member,
}: ConfirmRemoveDialogProps) {
  const [ownershipError, setOwnershipError] = useState(false);
  const removeMember = useRemoveModuleMember(moduleKey);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setOwnershipError(false);
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleConfirm = useCallback(() => {
    if (!member) return;
    setOwnershipError(false);
    removeMember.mutate(
      { userId: member.userId },
      {
        onSuccess: () => {
          toast.success("Member removed");
          onOpenChange(false);
        },
        onError: (err) => {
          if (isApiError(err) && err.status === 403) {
            setOwnershipError(true);
          } else {
            toast.error(getErrorMessage(err));
            onOpenChange(false);
          }
        },
      },
    );
  }, [member, removeMember, onOpenChange]);

  const displayName = member ? resolveDisplayName(member) : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove member</DialogTitle>
          <DialogDescription>
            Remove <span className="font-medium">{displayName}</span> from this
            module?
          </DialogDescription>
        </DialogHeader>

        {ownershipError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300">
            This user is the module owner and cannot be removed. Transfer module
            ownership to another member first, then retry.
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={removeMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            variant="destructive"
            isPending={removeMember.isPending}
            loadingText="Removing…"
            onClick={handleConfirm}
            disabled={ownershipError}
          >
            Remove
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
