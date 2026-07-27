"use client";

import Link from "next/link";
import { CalendarClock, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/build/shared/text-overflow";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { MeetingTypeBadge } from "./meeting-badges";
import type { Meeting, ProjectMemberRecord } from "@/types/projects";

interface NextMeetingStripProps {
  meeting: Meeting;
  projectId: number;
  members: ProjectMemberRecord[];
}

export function NextMeetingStrip({ meeting, projectId, members }: NextMeetingStripProps) {
  const host = members.find((m) => m.id === meeting.createdBy);
  const hostLabel = host ? getUserDisplayName(host) : null;
  const scheduledDate = meeting.scheduledAt ? new Date(meeting.scheduledAt) : null;

  return (
    <div
      className={cn(
        PM_PANEL,
        "mb-0 flex flex-wrap items-center gap-3 border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm",
      )}
    >
      <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
        <span className="shrink-0 text-xs font-normal text-muted-foreground">Next meeting</span>
        <Link
          href={`/build/${projectId}/meetings/${meeting.id}`}
          className={cn(TEXT_ONE_LINE, "max-w-[min(100%,20rem)] font-semibold text-foreground hover:underline")}
          title={meeting.title}
        >
          {meeting.title}
        </Link>
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {scheduledDate ? (
          <span className="tabular-nums">
            {scheduledDate.toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
        {meeting.durationMinutes != null ? (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {meeting.durationMinutes}m
          </span>
        ) : null}
        {hostLabel ? (
          <span className="flex max-w-[8rem] items-center gap-1">
            <Users className="h-3 w-3 shrink-0" />
            <span className={TEXT_ONE_LINE}>{hostLabel}</span>
          </span>
        ) : null}
        {(meeting.attendeeCount ?? 0) > 0 ? (
          <span>{meeting.attendeeCount} attendee{meeting.attendeeCount !== 1 ? "s" : ""}</span>
        ) : null}
        <MeetingTypeBadge type={meeting.type} />
      </div>
    </div>
  );
}
