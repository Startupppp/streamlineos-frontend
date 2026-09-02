"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ProjectWorkspaceMember } from "@/hooks/api/build/workspace-members";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { WorkspaceRoleBadge } from "./members-toolbar";
import { MemberActions } from "./member-row-actions";
import type { DisplayProps } from "./display-props";
import { resolveImageUrl } from "@/lib/utils";

interface UseMembersColumnsParams {
  displayProps: DisplayProps;
  canManage: boolean;
  handleRemoveRequest: (member: ProjectWorkspaceMember) => void;
}

export function useMembersColumns({
  displayProps,
  canManage,
  handleRemoveRequest,
}: UseMembersColumnsParams): DataTableColumn<ProjectWorkspaceMember>[] {
  return useMemo<DataTableColumn<ProjectWorkspaceMember>[]>(() => {
    const cols: DataTableColumn<ProjectWorkspaceMember>[] = [
      {
        key: "name",
        header: "Name",
        sortable: true,
        sortValue: (m) => getUserDisplayName(m),
        cell: (member) => {
          const displayName = getUserDisplayName(member);
          const handle = member.email.split("@")[0] ?? member.email;
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={resolveImageUrl(member.image)} alt={displayName} />
                <AvatarFallback className="text-micro font-semibold bg-primary/10 text-foreground">
                  {getUserInitials(member)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <TruncatedText
                  text={displayName}
                  className="text-xs font-medium leading-tight text-foreground"
                />
                <TruncatedText
                  text={`@${handle}`}
                  className="text-micro text-muted-foreground leading-tight"
                />
              </div>
            </div>
          );
        },
      },
    ];

    if (displayProps.showRole) {
      cols.push({
        key: "role",
        header: "Role",
        cell: (member) => <WorkspaceRoleBadge role={member.role} />,
      });
    }

    if (displayProps.showAdded) {
      cols.push({
        key: "addedAt",
        header: "Added",
        sortable: true,
        sortValue: (m) => m.addedAt,
        className: "tabular-nums",
        cell: (member) => (
          <span className="text-dense text-muted-foreground tabular-nums">
            {formatDistanceToNow(new Date(member.addedAt), { addSuffix: true })}
          </span>
        ),
      });
    }

    if (displayProps.showTeams) {
      cols.push({
        key: "teams",
        header: "Teams",
        cell: (member) => {
          if (!member.teams.length) {
            return <span className="text-dense text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {member.teams.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="h-[18px] px-1.5 text-micro font-normal"
                >
                  {t}
                </Badge>
              ))}
            </div>
          );
        },
      });
    }

    if (canManage) {
      cols.push({
        key: "actions",
        header: "",
        className: "w-10 text-right",
        cell: (member) => (
          <MemberActions member={member} onRemove={handleRemoveRequest} />
        ),
      });
    }

    return cols;
  }, [displayProps, canManage, handleRemoveRequest]);
}
