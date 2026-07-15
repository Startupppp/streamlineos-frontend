"use client";

import { useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Combobox } from "@/components/ui/combobox";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import type { ProjectMemberRecord } from "@/types/projects";

interface MeetingAttendeePickerProps {
  projectMembers: ProjectMemberRecord[];
  selectedAttendees: string[];
  comboValue: string;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}

export function MeetingAttendeePicker({
  projectMembers,
  selectedAttendees,
  comboValue,
  onAdd,
  onRemove,
}: MeetingAttendeePickerProps) {
  const availableMembers = useMemo(
    () => projectMembers.filter((m) => !selectedAttendees.includes(m.id)),
    [projectMembers, selectedAttendees],
  );

  const comboboxOptions = useMemo(
    () =>
      availableMembers.map((m) => ({
        value: m.id,
        label: getUserDisplayName(m),
        sublabel: m.email,
      })),
    [availableMembers],
  );

  const handleRemove = useCallback(
    (userId: string) => () => onRemove(userId),
    [onRemove],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Attendees (optional)</p>

      {selectedAttendees.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAttendees.map((userId) => {
            const member = projectMembers.find((m) => m.id === userId);
            return (
              <Badge key={userId} variant="secondary" className="gap-1.5 pl-0.5 pr-1.5 py-0.5">
                <Avatar className="h-4 w-4 shrink-0">
                  <AvatarImage src={resolveImageUrl(member?.image)} />
                  <AvatarFallback className="text-[7px]">
                    {getUserInitials(member)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] truncate max-w-[120px]">
                  {getUserDisplayName(member)}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive ml-0.5"
                  onClick={handleRemove(userId)}
                  aria-label={`Remove ${getUserDisplayName(member)}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {availableMembers.length > 0 && (
        <Combobox
          options={comboboxOptions}
          value={comboValue}
          onChange={onAdd}
          placeholder="+ Add attendee…"
          searchPlaceholder="Search members…"
          emptyText="No members available."
          className="h-8 w-full text-xs bg-card border-border"
        />
      )}
    </div>
  );
}
