"use client";

import { useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckIcon } from "@animateicons/react/lucide";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";

interface OrgMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  image: string | null | undefined;
}

function getMemberName(
  member: Pick<OrgMember, "firstName" | "lastName" | "name">,
): string {
  if (member.firstName)
    return `${member.firstName} ${member.lastName ?? ""}`.trim();
  return member.name ?? "Unknown";
}

interface AttendeeRowProps {
  memberId: string;
  name: string;
  image: string | null | undefined;
  selected: boolean;
  onToggle: (id: string) => void;
}

function AttendeeRow({
  memberId,
  name,
  image,
  selected,
  onToggle,
}: AttendeeRowProps) {
  const handleClick = useCallback(() => {
    onToggle(memberId);
  }, [memberId, onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
        selected
          ? "bg-blue-500/10 ring-1 ring-blue-500/30"
          : "hover:bg-muted",
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={resolveImageUrl(image)} />
        <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className={cn("flex-1 truncate text-sm", selected && "font-medium")}>
        {name}
      </span>
      <div
        className={cn(
          "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
          selected
            ? "border-blue-500 bg-blue-500"
            : "border-muted-foreground/30",
        )}
      >
        {selected && <CheckIcon size={10} className="text-white" />}
      </div>
    </button>
  );
}

interface EventAttendeesPickerProps {
  members: OrgMember[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function EventAttendeesPicker({
  members,
  selectedIds,
  onToggle,
}: EventAttendeesPickerProps) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Attendees</Label>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-[11px]">
            {selectedIds.length} selected
          </Badge>
        )}
      </div>
      <div className="rounded-lg border bg-muted/30 p-1 space-y-0.5 max-h-48 overflow-y-auto">
        {members.map((member) => {
          const name = getMemberName(member);
          const selected = selectedIds.includes(member.id);
          return (
            <AttendeeRow
              key={member.id}
              memberId={member.id}
              name={name}
              image={member.image}
              selected={selected}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
