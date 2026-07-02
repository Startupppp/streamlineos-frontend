"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUpdateUserStatus, useDeleteUser, useResetUserPassword } from "@/hooks/api/users";
import type { User } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { MoreHorizontal, ShieldCheck, ShieldOff, UserX, KeyRound, Trash2 } from "lucide-react";

interface UserActionsMenuProps {
  user: User;
  onView: () => void;
}

export function UserActionsMenu({ user, onView }: UserActionsMenuProps) {
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: resetPassword, isPending: isResettingPassword } = useResetUserPassword();

  function handleActivate() {
    updateStatus({ userId: user.id, status: "active" }, {
      onSuccess: () => toast.success("User activated"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleSuspend() {
    updateStatus({ userId: user.id, status: "suspended" }, {
      onSuccess: () => toast.success("User suspended"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleArchive() {
    updateStatus({ userId: user.id, status: "archived" }, {
      onSuccess: () => toast.success("User archived"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleDelete() {
    deleteUser(user.id, {
      onSuccess: () => toast.success("User deleted"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleResetPassword() {
    resetPassword(user.id, {
      onSuccess: (r) => toast.success(`Password reset email sent to ${r.email}`),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  const isLoading = isUpdatingStatus || isDeleting || isResettingPassword;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isLoading}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>View details</DropdownMenuItem>
        <DropdownMenuSeparator />
        {!user.isActive && (
          <DropdownMenuItem onClick={handleActivate}>
            <ShieldCheck className="h-3.5 w-3.5 mr-2 text-green-600" />
            Activate
          </DropdownMenuItem>
        )}
        {user.isActive && (
          <DropdownMenuItem onClick={handleSuspend}>
            <ShieldOff className="h-3.5 w-3.5 mr-2 text-yellow-600" />
            Suspend
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleArchive}>
          <UserX className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetPassword}>
          <KeyRound className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
