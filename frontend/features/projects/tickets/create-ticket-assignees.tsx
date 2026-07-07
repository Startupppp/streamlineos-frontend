"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";

export interface AssigneeMember {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

interface CreateTicketAssigneesProps {
  members: AssigneeMember[];
  selectedAssignees: string[];
  onSelectAssignee: (id: string) => void;
  onRemoveAssignee: (id: string) => void;
}

export function CreateTicketAssignees({
  members,
  selectedAssignees,
  onSelectAssignee,
  onRemoveAssignee,
}: CreateTicketAssigneesProps) {
  return (
    <>
      {selectedAssignees.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedAssignees.map((id) => {
            const member = members?.find((m) => m.id === id);
            if (!member) return null;
            const displayName = getUserDisplayName(member);
            return (
              <Badge
                key={id}
                variant="user"
                className="gap-1.5 pl-0.5 pr-1.5 py-0.5"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={resolveImageUrl(member.image)} />
                  <AvatarFallback className="text-[8px]">
                    {getUserInitials(member)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[100px]">{displayName}</span>
                <button
                  type="button"
                  className="text-accent/70 hover:text-destructive transition-colors"
                  onClick={() => onRemoveAssignee(id)}
                  aria-label={`Remove ${displayName}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <Select value="" onValueChange={onSelectAssignee}>
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              selectedAssignees.length > 0 ? "+ Add another assignee" : "Select assignees"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {members
            ?.filter((m) => !selectedAssignees.includes(m.id))
            .map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={resolveImageUrl(member.image)} />
                    <AvatarFallback className="text-[10px]">
                      {getUserInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {getUserDisplayName(member)}
                  </span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </>
  );
}
