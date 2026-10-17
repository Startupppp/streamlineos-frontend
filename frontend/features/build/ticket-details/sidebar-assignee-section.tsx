"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { MemberPicker } from "@/components/members/member-picker";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, X } from "lucide-react";

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
  disabled?: boolean;
}

export function SidebarAssigneeSection({
  projectId,
  displayedAssignees,
  onAddAssignee,
  onRemoveAssignee,
  disabled = false,
}: SidebarAssigneeSectionProps) {
  function handleAddAssignee(userId: string | null) {
    if (userId) onAddAssignee(userId);
  }

  return (
    <div className="space-y-1.5">
      <span className="text-micro text-muted-foreground font-medium uppercase tracking-wide block">
        Assignees
      </span>
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-1.5">
          {displayedAssignees.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {displayedAssignees.map((person) => {
                const displayName = getUserDisplayName(person);
                return (
                  <div key={person.id} className="group relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar
                          className="h-7 w-7 shrink-0 cursor-default ring-2 ring-background"
                          aria-label={displayName}
                        >
                          <AvatarImage src={resolveImageUrl(person.image)} />
                          <AvatarFallback className="bg-primary/10 text-micro text-primary">
                            {getUserInitials(person)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>{displayName}</TooltipContent>
                    </Tooltip>
                    {!disabled ? (
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-opacity hover:text-destructive focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => onRemoveAssignee(person.id)}
                        aria-label={`Remove ${displayName}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {!disabled ? (
            <MemberPicker
              projectId={projectId}
              value=""
              onChange={handleAddAssignee}
              placeholder="Add assignee"
              triggerTooltip="Add assignee"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add assignee"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              }
            />
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  );
}
