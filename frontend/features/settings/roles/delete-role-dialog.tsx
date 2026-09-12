"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import type { RoleListRow } from "@/hooks/api/roles";

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteTarget: RoleListRow | null;
  deleteConfirmation: string;
  deleteEnabled: boolean;
  isPending: boolean;
  onDelete: () => void;
  onConfirmationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  deleteTarget,
  deleteConfirmation,
  deleteEnabled,
  isPending,
  onDelete,
  onConfirmationChange,
}: DeleteRoleDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete role</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting{" "}
            <span className="font-semibold">{deleteTarget?.name}</span>{" "}
            will permanently remove this role.{" "}
            {deleteTarget
              ? deleteTarget.memberCount === 0
                ? "No members currently hold it."
                : `${deleteTarget.memberCount} ${deleteTarget.memberCount === 1 ? "member" : "members"} will lose the permissions it grants.`
              : "Members assigned to it will lose the associated permissions."}{" "}
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-1">
          <Label className="text-sm">
            Type{" "}
            <span className="font-mono font-semibold">{deleteTarget?.name}</span>{" "}
            to confirm
          </Label>
          <Input
            value={deleteConfirmation}
            onChange={onConfirmationChange}
            placeholder={deleteTarget?.name ?? ""}
            className="font-mono"
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoadingButton
              onClick={onDelete}
              isPending={isPending}
              disabled={!deleteEnabled}
              loadingText="Deleting…"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </LoadingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
