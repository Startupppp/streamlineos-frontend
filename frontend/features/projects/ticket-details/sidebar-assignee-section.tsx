"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import type { ProjectMember } from "./types";

export interface DisplayedAssignee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

interface SidebarAssigneeSectionProps {
  members: ProjectMember[];
  displayedAssignees: DisplayedAssignee[];
  currentAssigneeIds: string[];
  onAddAssignee: (v: string) => void;
  onRemoveAssignee: (personId: string) => void;
}

export function SidebarAssigneeSection({
  members,
  displayedAssignees,
  currentAssigneeIds,
  onAddAssignee,
  onRemoveAssignee,
}: SidebarAssigneeSectionProps) {
  return (
    <div className="pt-1">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
        Assignees
      </span>
      {displayedAssignees.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {displayedAssignees.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-1 bg-muted rounded-full pl-0.5 pr-1.5 py-0.5"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={resolveImageUrl(person.image)} />
                <AvatarFallback className="text-[7px]">
                  {person.firstName?.[0]}
                  {person.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px]">{person.firstName}</span>
              <button
                className="text-muted-foreground hover:text-destructive transition-colors leading-none"
                onClick={() => onRemoveAssignee(person.id)}
                aria-label={`Remove ${person.firstName}`}
              >
                <span className="text-xs font-bold">&times;</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <Select value="" onValueChange={onAddAssignee}>
        <SelectTrigger className="h-8 text-xs bg-background w-full">
          <SelectValue placeholder="+ Add assignee" />
        </SelectTrigger>
        <SelectContent>
          {members
            ?.filter((m) => !currentAssigneeIds.includes(m.id))
            .map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={resolveImageUrl(member.image)} />
                    <AvatarFallback className="text-[8px]">
                      {member.firstName?.[0]}
                      {member.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">
                    {member.firstName} {member.lastName}
                  </span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
