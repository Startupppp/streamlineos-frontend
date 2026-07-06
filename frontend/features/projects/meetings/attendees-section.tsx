"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, UserPlus, Check } from "lucide-react";
import { useAddAttendee, useRemoveAttendee } from "@/hooks/api/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import type { MeetingAttendee, ProjectMember } from "@/types/projects";

const NONE_SENTINEL = "__none__";

interface AttendeesSectionProps {
  projectId: number;
  meetingId: number;
  attendees: MeetingAttendee[];
  projectMembers: ProjectMember[];
  canManage: boolean;
}

export function AttendeesSection({
  projectId, meetingId, attendees, projectMembers, canManage,
}: AttendeesSectionProps) {
  const [selectedUserId, setSelectedUserId] = useState(NONE_SENTINEL);

  const addAttendee = useAddAttendee(projectId, meetingId);
  const removeAttendee = useRemoveAttendee(projectId, meetingId);

  const attendeeIds = new Set(attendees.map((a) => a.userId));
  const available = projectMembers.filter((m) => !attendeeIds.has(m.userId));

  function memberName(userId: string): string {
    const m = projectMembers.find((p) => p.userId === userId);
    return m?.user?.name ?? m?.user?.email ?? userId;
  }

  function handleAddAttendee() {
    if (selectedUserId === NONE_SENTINEL) return;
    addAttendee.mutate(
      { userId: selectedUserId },
      {
        onSuccess: () => {
          toast.success("Attendee added");
          setSelectedUserId(NONE_SENTINEL);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleRemoveAttendee(userId: string) {
    removeAttendee.mutate(userId, {
      onSuccess: () => toast.success("Attendee removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Attendees</h3>

      {attendees.length === 0 ? (
        <EmptyState
          compact
          title="No attendees"
          description="Add project members as attendees."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {attendees.map((attendee) => (
            <div
              key={attendee.userId}
              className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-sm"
            >
              {attendee.attended && <Check className="h-3 w-3 text-emerald-600 shrink-0" />}
              <span className="text-foreground">{memberName(attendee.userId)}</span>
              {attendee.attended && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-200 ml-0.5">
                  Attended
                </Badge>
              )}
              {canManage && (
                <button
                  onClick={() => handleRemoveAttendee(attendee.userId)}
                  className="ml-0.5 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${memberName(attendee.userId)}`}
                  disabled={removeAttendee.isPending}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && available.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="h-8 text-xs w-52">
              <SelectValue placeholder="Add attendee…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_SENTINEL}>Select member…</SelectItem>
              {available.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.user?.name ?? m.user?.email ?? m.userId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleAddAttendee}
            disabled={selectedUserId === NONE_SENTINEL || addAttendee.isPending}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
