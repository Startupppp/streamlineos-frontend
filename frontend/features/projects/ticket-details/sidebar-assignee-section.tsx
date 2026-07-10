"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { ProjectMemberSelect } from "@/components/members/project-member-select";

export interface DisplayedAssignee {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
}

interface SidebarAssigneeSectionProps {
  projectId: number;
  displayedAssignees: DisplayedAssignee[];
  currentAssigneeIds: string[];
  onAddAssignee: (v: string) => void;
  onRemoveAssignee: (personId: string) => void;
}

export function SidebarAssigneeSection({
  projectId,
  displayedAssignees,
  currentAssigneeIds,
  onAddAssignee,
  onRemoveAssignee,
}: SidebarAssigneeSectionProps) {
  function handleAddAssignee(userId: string | null) {
    if (userId) onAddAssignee(userId);
  }

  return (
    <div>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
        Assignees
      </span>
      {displayedAssignees.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {displayedAssignees.map((person) => {
            const displayName = getUserDisplayName(person);
            return (
              <Badge
                key={person.id}
                variant="user"
                className="gap-1.5 pl-0.5 pr-1.5 py-0.5"
              >
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={resolveImageUrl(person.image)} />
                  <AvatarFallback className="text-[7px]">
                    {getUserInitials(person)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[140px] text-[11px]">{displayName}</span>
                <button
                  type="button"
                  className="text-accent/70 hover:text-destructive transition-colors leading-none"
                  onClick={() => onRemoveAssignee(person.id)}
                  aria-label={`Remove ${displayName}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <ProjectMemberSelect
        projectId={projectId}
        mode="single"
        value=""
        onChange={handleAddAssignee}
        placeholder="+ Add assignee"
        className="h-8 text-xs w-full"
      />
    </div>
  );
}
