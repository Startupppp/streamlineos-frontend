"use client";

import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Check, Users } from "lucide-react";
import { useAddAttendee, useRemoveAttendee } from "@/hooks/api/build";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Combobox } from "@/components/ui/combobox";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { MeetingAttendee, ProjectMemberRecord } from "@/types/projects";

const FIELD_CLASS = "w-full text-xs bg-card border-border shadow-xs";

interface AttendeesSectionProps {
  projectId: number;
  meetingId: number;
  attendees: MeetingAttendee[];
  projectMembers: ProjectMemberRecord[];
  canManage: boolean;
}

function findMember(members: ProjectMemberRecord[], userId: string): ProjectMemberRecord | undefined {
  return members.find((m) => m.id === userId);
}

export function AttendeesSection({
  projectId, meetingId, attendees, projectMembers, canManage,
}: AttendeesSectionProps) {
  const [selectedUserId, setSelectedUserId] = useState("");

  const addAttendee = useAddAttendee(projectId, meetingId);
  const removeAttendee = useRemoveAttendee(projectId, meetingId);

  const attendeeIds = useMemo(() => new Set(attendees.map((a) => a.userId)), [attendees]);

  const availableMembers = useMemo(
    () => projectMembers.filter((m) => !attendeeIds.has(m.id)),
    [projectMembers, attendeeIds],
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

  const handleSelectMember = useCallback(
    (userId: string) => {
      if (!userId) {
        setSelectedUserId("");
        return;
      }
      setSelectedUserId(userId);
      addAttendee.mutate(
        { userId },
        {
          onSuccess: () => {
            toast.success("Attendee added");
            setSelectedUserId("");
          },
          onError: (e) => {
            toast.error(getErrorMessage(e));
            setSelectedUserId("");
          },
        },
      );
    },
    [addAttendee],
  );

  const handleRemoveAttendee = useCallback(
    (userId: string) => {
      removeAttendee.mutate(userId, {
        onSuccess: () => toast.success("Attendee removed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [removeAttendee],
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Attendees
        </span>
        {attendees.length > 0 && (
          <Badge variant="secondary" className="text-micro h-4 px-1.5">
            {attendees.length}
          </Badge>
        )}
      </div>

      {attendees.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {attendees.map((attendee) => {
            const member = findMember(projectMembers, attendee.userId);
            const displayName = getUserDisplayName(member);
            return (
              <Badge
                key={attendee.userId}
                variant="user"
                className="gap-1.5 pl-0.5 pr-1.5 py-0.5"
              >
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={resolveImageUrl(member?.image)} />
                  <AvatarFallback className="text-micro">
                    {getUserInitials(member)}
                  </AvatarFallback>
                </Avatar>
                <TruncatedText text={displayName} className="max-w-[140px] text-dense" />
                {attendee.attended ? (
                  <Check className="h-3 w-3 shrink-0 text-status-success-ink" aria-hidden />
                ) : null}
                {canManage && (
                  <button
                    type="button"
                    className="text-accent/70 hover:text-destructive transition-colors leading-none"
                    onClick={() => handleRemoveAttendee(attendee.userId)}
                    aria-label={`Remove ${displayName}`}
                    disabled={removeAttendee.isPending}
                  >
                    <span className="text-xs font-bold">&times;</span>
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No attendees yet. Add project members below.
        </p>
      )}

      {canManage && availableMembers.length > 0 && (
        <Combobox
          options={comboboxOptions}
          value={selectedUserId}
          onChange={handleSelectMember}
          placeholder="+ Add attendee…"
          searchPlaceholder="Search project members…"
          emptyText="No members available."
          disabled={addAttendee.isPending}
          className={FIELD_CLASS}
        />
      )}

      {canManage && availableMembers.length === 0 && attendees.length > 0 && (
        <p className="text-dense text-muted-foreground">All project members are attending.</p>
      )}
    </div>
  );
}
