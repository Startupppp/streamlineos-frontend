"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
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
  onAddAssignee: (v: string) => void;
  onRemoveAssignee: (personId: string) => void;
}

export function SidebarAssigneeSection({
  projectId,
  displayedAssignees,
  onAddAssignee,
  onRemoveAssignee,
}: SidebarAssigneeSectionProps) {
  function handleAddAssignee(userId: string | null) {
    if (userId) onAddAssignee(userId);
  }

  return (
    <div className="space-y-1.5">
      <span className="text-micro text-muted-foreground font-medium uppercase tracking-wide block">
        Assignees
      </span>
      {displayedAssignees.length > 0 && (
        <div className="space-y-1">
          {displayedAssignees.map((person) => {
            const displayName = getUserDisplayName(person);
            return (
              <div
                key={person.id}
                className="group flex min-h-10 items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={resolveImageUrl(person.image)} />
                  <AvatarFallback className="bg-primary/10 text-micro text-primary">
                    {getUserInitials(person)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                  {displayName}
                </span>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onRemoveAssignee(person.id)}
                  aria-label={`Remove ${displayName}`}
                >
                  <span className="text-sm font-bold leading-none">&times;</span>
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
        className="text-xs w-full"
      />
    </div>
  );
}
