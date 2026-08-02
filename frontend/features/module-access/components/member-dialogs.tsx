"use client";

import { useState, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import {
  useAddModuleMember,
  useUpdateModuleMember,
  useRemoveModuleMember,
  useModuleMemberCandidates,
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
  existingMemberIds: Set<string>;
  allGroups: ModuleMemberGroup[];
  defaultUserId?: string;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  moduleKey,
  existingMemberIds,
  allGroups,
  defaultUserId,
}: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId ?? "");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
  const candidatesQuery = useModuleMemberCandidates(moduleKey);
  const addMember = useAddModuleMember(moduleKey);

  const candidates = (candidatesQuery.data ?? []).filter(
    (c) => !existingMemberIds.has(c.userId),
  );

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

  const handleUserChange = useCallback((val: string) => setSelectedUserId(val), []);

  const handleGroupToggle = useCallback((groupId: number, checked: boolean) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    if (!selectedUserId) return;
    const groupIds = selectedGroupIds.size > 0 ? Array.from(selectedGroupIds) : undefined;
    addMember.mutate(
      { userId: selectedUserId, groupIds },
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>Grant a user access to this module.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">User</p>
            <Select value={selectedUserId} onValueChange={handleUserChange}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="Select a user…" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {candidatesQuery.isLoading ? (
                  <div className="py-3 px-3 text-xs text-muted-foreground">Loading…</div>
                ) : candidates.length === 0 ? (
                  <div className="py-3 px-3 text-xs text-muted-foreground">
                    All org members already have access
                  </div>
                ) : (
                  candidates.map((c) => (
                    <SelectItem key={c.userId} value={c.userId}>
                      {c.displayName || c.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {allGroups.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Assign to groups (optional)</p>
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
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            isPending={addMember.isPending}
            loadingText="Adding…"
            onClick={handleAdd}
            disabled={!selectedUserId}
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
    if (!member) return;
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit groups</DialogTitle>
          <DialogDescription>
            Update group assignments for{" "}
            <span className="font-medium">{displayName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-1 max-h-52 overflow-y-auto">
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            isPending={updateMember.isPending}
            loadingText="Saving…"
            onClick={handleSave}
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
      <DialogContent className="sm:max-w-sm">
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
            onClick={() => handleClose(false)}
            disabled={removeMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
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
