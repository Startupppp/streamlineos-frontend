"use client";

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
    <div className="space-y-1.5">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide block">
        Assignees
      </span>
      {displayedAssignees.length > 0 && (
        <div className="space-y-1">
          {displayedAssignees.map((person) => {
            const displayName = getUserDisplayName(person);
            return (
              <div
                key={person.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-muted/50 group"
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={resolveImageUrl(person.image)} />
                  <AvatarFallback className="text-[8px] bg-brand-core/10 text-primary">
                    {getUserInitials(person)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate flex-1 min-w-0 text-foreground">
                  {displayName}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-destructive transition-colors leading-none opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => onRemoveAssignee(person.id)}
                  aria-label={`Remove ${displayName}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </div>
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
