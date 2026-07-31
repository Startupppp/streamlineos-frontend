"use client";

import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useUpdateUserStatus,
  useDeleteUser,
  useSendSigninLink,
} from "@/hooks/api/users";
import type { User } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, UserX, KeyRound, Trash2, UserMinus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCan } from "@/hooks/api/access";
import { useRemoveOrgMember } from "@/hooks/api/organization";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface UserActionsMenuProps {
  user: User;
  onView: () => void;
}

export function UserActionsMenu({ user, onView }: UserActionsMenuProps) {
  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateUserStatus();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: sendSigninLink, isPending: isSendingSigninLink } =
    useSendSigninLink();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveOrgMember();
  const canManage = useCan("hr:employees:manage");
  const canDelete = useCan("hr:employees:delete");
  const canRemoveFromOrg = useCan("settings:manage");
  const [confirmRemove, setConfirmRemove] = useState(false);

  function handleActivate() {
    updateStatus(
      { userId: user.id, status: "active" },
      {
        onSuccess: () => toast.success("User activated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleSuspend() {
    updateStatus(
      { userId: user.id, status: "suspended" },
      {
        onSuccess: () => toast.success("User suspended"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleArchive() {
    updateStatus(
      { userId: user.id, status: "archived" },
      {
        onSuccess: () => toast.success("User archived"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleDelete() {
    deleteUser(user.id, {
      onSuccess: () => toast.success("User deleted"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRemoveFromOrg() {
    removeMember(user.id, {
      onSuccess: () => {
        toast.success("Removed from organization");
        setConfirmRemove(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleOpenRemoveConfirm() {
    setConfirmRemove(true);
  }

  function handleSendSigninLink() {
    sendSigninLink(user.id, {
      onSuccess: (r) =>
        toast.success(`Sign-in link sent to ${r.email}`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const isLoading = isUpdatingStatus || isDeleting || isSendingSigninLink;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton
          icon={EllipsisIcon}
          iconSize={16}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isLoading}
        >
          <span className="sr-only">Actions</span>
        </AnimatedIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>View details</DropdownMenuItem>
        {canManage && <DropdownMenuSeparator />}
        {canManage && !user.isActive && (
          <DropdownMenuItem onClick={handleActivate}>
            <ShieldCheck className="h-3.5 w-3.5 mr-2 text-green-600" />
            Activate
          </DropdownMenuItem>
        )}
        {canManage && user.isActive && (
          <DropdownMenuItem onClick={handleSuspend}>
            <ShieldOff className="h-3.5 w-3.5 mr-2 text-yellow-600" />
            Suspend
          </DropdownMenuItem>
        )}
        {canManage && (
          <DropdownMenuItem onClick={handleArchive}>
            <UserX className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Archive
          </DropdownMenuItem>
        )}
        {canManage && (
          <DropdownMenuItem onClick={handleSendSigninLink}>
            <KeyRound className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Send sign-in link
          </DropdownMenuItem>
        )}
        {canRemoveFromOrg && <DropdownMenuSeparator />}
        {canRemoveFromOrg && (
          <DropdownMenuItem variant="destructive" onClick={handleOpenRemoveConfirm}>
            <UserMinus className="h-3.5 w-3.5 mr-2" />
            Remove from organization
          </DropdownMenuItem>
        )}
        {canDelete && <DropdownMenuSeparator />}
        {canDelete && (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete user
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <ConfirmDialog
      open={confirmRemove}
      onOpenChange={setConfirmRemove}
      title="Remove from organization?"
      description={`${user.name ?? user.email} will lose access to this organization immediately. Their user account is not deleted.`}
      confirmLabel="Remove"
      destructive
      isPending={isRemoving}
      onConfirm={handleRemoveFromOrg}
    />
    </>
  );
}
