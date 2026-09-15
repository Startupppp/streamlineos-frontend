"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { MemberPicker } from "@/components/members/member-picker";
import { useAddProjectWorkspaceMember } from "@/hooks/api/build/workspace-members";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"member" | "admin">("member");

  const addMember = useAddProjectWorkspaceMember();

  function handleUserChange(userId: string | null) {
    setSelectedUserId(userId);
  }

  function handleRoleChange(value: string) {
    setSelectedRole(value as "member" | "admin");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedUserId(null);
      setSelectedRole("member");
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (!selectedUserId) return;
    addMember.mutate(
      { userId: selectedUserId, role: selectedRole },
      {
        onSuccess: () => {
          toast.success("Member added to workspace.");
          handleOpenChange(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Pick someone from your organization to give access to Build.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="add-member-picker"
            >
              Member
            </label>
            <MemberPicker
              mode="single"
              moduleKey="build"
              excludeAssigned={false}
              enabled={open}
              value={selectedUserId ?? undefined}
              onChange={handleUserChange}
              placeholder="Select a member…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="add-member-role"
            >
              Role
            </label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger id="add-member-role" className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-dense leading-relaxed text-muted-foreground">
              {selectedRole === "admin"
                ? "Admins can manage Build settings, projects and who has access."
                : "Members can work on projects and issues they are given access to."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            isPending={addMember.isPending}
            loadingText="Adding…"
            disabled={!selectedUserId}
            onClick={handleSubmit}
          >
            Add member
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
