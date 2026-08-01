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
import {
  ShieldCheck,
  ShieldOff,
  UserX,
  KeyRound,
  Trash2,
  UserMinus,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCan } from "@/hooks/api/access";
import { useRemoveOrgMember } from "@/hooks/api/organization";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type PendingAction = "suspend" | "archive" | "delete" | "remove";

function assertNever(x: never): never {
  throw new Error(`Unhandled pending action: ${String(x)}`);
}

function noOp() {}

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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const canSuspendUser = canManage && !user.isOwner;
  const canArchiveUser = canManage && !user.isOwner;
  const canRemoveUser = canRemoveFromOrg && !user.isOwner;
  const canDeleteUser = canDelete && !user.isOwner;

  const displayName = user.name ?? user.email;

  function handleActivate() {
    updateStatus(
      { userId: user.id, status: "active" },
      {
        onSuccess: () => toast.success("User activated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleConfirmSuspend() {
    updateStatus(
      { userId: user.id, status: "suspended" },
      {
        onSuccess: () => {
          toast.success("User suspended");
          setPendingAction(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleConfirmArchive() {
    updateStatus(
      { userId: user.id, status: "archived" },
      {
        onSuccess: () => {
          toast.success("User archived");
          setPendingAction(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleConfirmDelete() {
    deleteUser(user.id, {
      onSuccess: () => {
        toast.success("User deleted");
        setPendingAction(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleConfirmRemove() {
    removeMember(user.id, {
      onSuccess: () => {
        toast.success("Removed from organization");
        setPendingAction(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleSendSigninLink() {
    sendSigninLink(user.id, {
      onSuccess: (r) => toast.success(`Sign-in link sent to ${r.email}`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleOpenSuspendConfirm() {
    setPendingAction("suspend");
  }

  function handleOpenArchiveConfirm() {
    setPendingAction("archive");
  }

  function handleOpenDeleteConfirm() {
    setPendingAction("delete");
  }

  function handleOpenRemoveConfirm() {
    setPendingAction("remove");
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) setPendingAction(null);
  }

  function resolveDialogConfig(action: PendingAction) {
    switch (action) {
      case "suspend":
        return {
          title: "Suspend user?",
          description: `${displayName} will lose access immediately. Their data and membership are retained and they can be reactivated at any time.`,
          confirmLabel: "Suspend",
          destructive: false,
          isPending: isUpdatingStatus,
          onConfirm: handleConfirmSuspend,
        };
      case "archive":
        return {
          title: "Archive user?",
          description: `${displayName} will be archived and lose access. Their data and membership are retained and they can be restored at any time.`,
          confirmLabel: "Archive",
          destructive: false,
          isPending: isUpdatingStatus,
          onConfirm: handleConfirmArchive,
        };
      case "delete":
        return {
          title: "Delete user?",
          description: `${displayName}'s account will be permanently deleted. This cannot be undone.`,
          confirmLabel: "Delete",
          destructive: true,
          isPending: isDeleting,
          onConfirm: handleConfirmDelete,
        };
      case "remove":
        return {
          title: "Remove from organization?",
          description: `${displayName} will lose access to this organization immediately. Their user account is not deleted.`,
          confirmLabel: "Remove",
          destructive: true,
          isPending: isRemoving,
          onConfirm: handleConfirmRemove,
        };
      default:
        return assertNever(action);
    }
  }

  const isLoading = isUpdatingStatus || isDeleting || isSendingSigninLink;
  const dialogConfig =
    pendingAction !== null ? resolveDialogConfig(pendingAction) : null;

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
          {canSuspendUser && user.isActive && (
            <DropdownMenuItem onClick={handleOpenSuspendConfirm}>
              <ShieldOff className="h-3.5 w-3.5 mr-2 text-yellow-600" />
              Suspend
            </DropdownMenuItem>
          )}
          {canArchiveUser && (
            <DropdownMenuItem onClick={handleOpenArchiveConfirm}>
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
          {canRemoveUser && <DropdownMenuSeparator />}
          {canRemoveUser && (
            <DropdownMenuItem
              variant="destructive"
              onClick={handleOpenRemoveConfirm}
            >
              <UserMinus className="h-3.5 w-3.5 mr-2" />
              Remove from organization
            </DropdownMenuItem>
          )}
          {canDeleteUser && <DropdownMenuSeparator />}
          {canDeleteUser && (
            <DropdownMenuItem
              variant="destructive"
              onClick={handleOpenDeleteConfirm}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete user
            </DropdownMenuItem>
          )}
          {user.isOwner && (canManage || canDelete || canRemoveFromOrg) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                Owner — transfer ownership first
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={handleDialogOpenChange}
        title={dialogConfig?.title ?? ""}
        description={dialogConfig?.description ?? ""}
        confirmLabel={dialogConfig?.confirmLabel}
        destructive={dialogConfig?.destructive}
        isPending={dialogConfig?.isPending}
        onConfirm={dialogConfig?.onConfirm ?? noOp}
      />
    </>
  );
}
