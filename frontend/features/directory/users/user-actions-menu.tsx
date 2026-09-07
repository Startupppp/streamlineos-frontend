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
  UserCog,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  useCan,
  useCanManageOrganizationMembership,
} from "@/hooks/api/access";
import { useRemoveOrgMember } from "@/hooks/api/organization";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserChangeRoleDialog } from "./user-change-role-dialog";

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
  const canManage = useCan("settings:organization:manage");
  const canChangeRole = useCanManageOrganizationMembership();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);

  const isArchived = user.userStatus === "archived";
  const isActiveUser = user.userStatus ? user.userStatus === "active" : user.isActive;
  const canSuspendUser = canManage && !user.isOwner && isActiveUser;
  const canArchiveUser = canManage && !user.isOwner && !isArchived;
  const canActivateUser = canManage && !isActiveUser;
  const canRemoveUser = canManage && !user.isOwner;
  const canDeleteUser = canManage && !user.isOwner;
  const canSendSigninLink = canManage && isActiveUser;

  const displayName = user.name ?? user.email;

  function handleActivate() {
    updateStatus(
      { userId: user.id, status: "active" },
      {
        onSuccess: () =>
          toast.success(isArchived ? "User restored" : "Access restored", {
            description: `${displayName} can now access this organization. It will appear in their workspace switcher after their session refreshes.`,
          }),
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

  function handleOpenChangeRole() {
    setIsChangeRoleOpen(true);
  }

  function handleChangeRoleOpenChange(open: boolean) {
    setIsChangeRoleOpen(open);
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
          description: `${displayName}'s account will be permanently deleted if they only belong to this organization. If they belong to other organizations, remove them from this organization instead.`,
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
          {(canManage || (canChangeRole && !user.isOwner)) && <DropdownMenuSeparator />}
          {canChangeRole && !user.isOwner && (
            <DropdownMenuItem onClick={handleOpenChangeRole}>
              <UserCog className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Change role
            </DropdownMenuItem>
          )}
          {canActivateUser && (
            <DropdownMenuItem onClick={handleActivate}>
              <ShieldCheck className="h-3.5 w-3.5 mr-2 text-status-success-ink" />
              {isArchived ? "Restore" : "Activate"}
            </DropdownMenuItem>
          )}
          {canSuspendUser && (
            <DropdownMenuItem onClick={handleOpenSuspendConfirm}>
              <ShieldOff className="h-3.5 w-3.5 mr-2 text-status-warning-ink" />
              Suspend
            </DropdownMenuItem>
          )}
          {canArchiveUser && (
            <DropdownMenuItem onClick={handleOpenArchiveConfirm}>
              <UserX className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Archive
            </DropdownMenuItem>
          )}
          {canSendSigninLink && (
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
          {user.isOwner && canManage && (
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
      {canChangeRole ? (
        <UserChangeRoleDialog
          open={isChangeRoleOpen}
          onOpenChange={handleChangeRoleOpenChange}
          user={user}
        />
      ) : null}
    </>
  );
}
