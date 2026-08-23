"use client";

import { useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import type { User } from "@/hooks/api/users";
import { resolveOrgUnitName } from "./resolve-org-unit-name";
import { UserActionsMenu } from "./user-actions-menu";
import { formatRoleLabel } from "./user-invite-roles";
import { UserStatusBadge } from "./user-status-badge";

interface UserActionCellProps {
  user: User;
  onView: (userId: string) => void;
}

function UserActionCell({ user, onView }: UserActionCellProps) {
  const handleContainerClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);
  const handleView = useCallback(() => onView(user.id), [onView, user.id]);
  return (
    <div onClick={handleContainerClick}>
      <UserActionsMenu user={user} onView={handleView} />
    </div>
  );
}

export function getUserTableColumns(
  branchNames: ReadonlyMap<string, string>,
  departmentNames: ReadonlyMap<string, string>,
  onView: (userId: string) => void,
): DataTableColumn<User>[] {
  function renderUser(user: User) {
    const displayName = getUserDisplayName(user);
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={user.image ?? undefined} alt={displayName} />
          <AvatarFallback className="text-[10px] font-semibold">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <TruncatedText
            text={displayName}
            className="text-[11px] font-medium leading-tight"
          />
          {user.designation && (
            <TruncatedText
              text={user.designation}
              className="text-[10px] text-muted-foreground"
            />
          )}
        </div>
      </div>
    );
  }

  function renderEmail(user: User) {
    return <TruncatedText text={user.email} className="text-muted-foreground" />;
  }

  function renderRole(user: User) {
    return (
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
        {formatRoleLabel(user.role)}
      </Badge>
    );
  }

  function renderStatus(user: User) {
    return (
      <UserStatusBadge
        isActive={user.userStatus ? user.userStatus === "active" : user.isActive}
        isDeleted={user.userStatus === "archived"}
      />
    );
  }

  function renderBranch(user: User) {
    return (
      <span className="text-muted-foreground">
        {resolveOrgUnitName(
          branchNames,
          user.branchId === null ? null : String(user.branchId),
          "Unknown branch",
        )}
      </span>
    );
  }

  function renderDepartment(user: User) {
    return (
      <span className="text-muted-foreground">
        {resolveOrgUnitName(
          departmentNames,
          user.departmentId === null ? null : String(user.departmentId),
          "Unknown department",
        )}
      </span>
    );
  }

  function renderJoinedAt(user: User) {
    return (
      <span className="text-muted-foreground">
        {formatDistanceToNow(new Date(user.joinedAt ?? user.createdAt), {
          addSuffix: true,
        })}
      </span>
    );
  }

  function renderActions(user: User) {
    return <UserActionCell user={user} onView={onView} />;
  }

  return [
    { key: "name", header: "User", sortable: true, cell: renderUser },
    { key: "email", header: "Email", cell: renderEmail },
    { key: "role", header: "Role", cell: renderRole },
    { key: "status", header: "Status", sortable: true, cell: renderStatus },
    { key: "branch", header: "Branch", cell: renderBranch },
    { key: "dept", header: "Dept", cell: renderDepartment },
    {
      key: "joinedAt",
      header: "Joined",
      sortable: true,
      className: "tabular-nums font-mono",
      cell: renderJoinedAt,
    },
    { key: "actions", header: "", className: "w-8", cell: renderActions },
  ];
}
