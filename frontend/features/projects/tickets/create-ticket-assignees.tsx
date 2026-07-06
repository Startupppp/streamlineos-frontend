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
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedAssignees.map((id) => {
            const member = members?.find((m) => m.id === id);
            if (!member) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={resolveImageUrl(member.image)} />
                  <AvatarFallback className="text-[8px]">
                    {member.name?.[0] ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate max-w-[100px]">
                  {member.name || `${member.firstName ?? ""} ${member.lastName ?? ""}`}
                </span>
                <button
                  type="button"
                  className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => onRemoveAssignee(id)}
                  aria-label={`Remove ${member.name}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </div>
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
                      {member.name?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {member.name || `${member.firstName ?? ""} ${member.lastName ?? ""}`}
                  </span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </>
  );
}
