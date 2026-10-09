"use client";

import { FolderKanban, LockKeyhole, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectTeamDetail } from "@/types/projects";
import { TeamActionsButton } from "./team-member-controls";

export function TeamActionsMenu({
  onEdit,
  onDelete,
  className,
}: {
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TeamActionsButton className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Edit Team</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete Team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TeamHeaderTitle({ team }: { team: ProjectTeamDetail }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm"
        style={{ backgroundColor: team.color ?? "#64748b" }}
        aria-hidden="true"
      >
        {team.icon ?? team.key.slice(0, 2)}
      </span>
      <span className="truncate">{team.name}</span>
    </span>
  );
}

export function TeamHeaderMeta({
  team,
  memberCount,
  hasMoreMembers,
}: {
  team: ProjectTeamDetail;
  memberCount: number;
  hasMoreMembers: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-mono font-semibold text-foreground">{team.key}</span>
      <Badge variant={team.isPrivate ? "outline" : "secondary"} className="h-5 gap-1 px-1.5 text-micro">
        {team.isPrivate ? <LockKeyhole className="size-3" aria-hidden="true" /> : null}
        {team.isPrivate ? "Private" : "Public"}
      </Badge>
      <span>Shared delivery access</span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5" aria-hidden="true" />
        {memberCount}{hasMoreMembers ? "+" : ""} member{memberCount !== 1 ? "s" : ""}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FolderKanban className="size-3.5" aria-hidden="true" />
        Projects grant shared access
      </span>
      {team.capacity !== null && team.capacity !== undefined ? (
        <span data-testid="team-capacity">Capacity {team.capacity}</span>
      ) : null}
    </div>
  );
}
