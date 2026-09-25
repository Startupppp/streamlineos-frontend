"use client";

import Link from "next/link";
import { Clock, Users, ClipboardList, FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { MeetingTypeBadge, MeetingStatusBadge } from "./meeting-badges";
import { getUserDisplayName } from "@/lib/person-display";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { Meeting, ProjectMemberRecord } from "@/types/projects";

interface Cycle {
  id: number;
  name: string;
}

export const MEETINGS_TABLE_HEADERS = [
  "ID",
  "Title",
  "Type",
  "Status",
  "Date / Duration",
  "Host",
  "Attendees",
  "Actions",
  "Notes",
] as const;

export function buildMeetingsColumns(
  projectId: number,
  memberMap: Map<string, ProjectMemberRecord>,
  cycleMap: Map<number, Cycle>,
): DataTableColumn<Meeting>[] {
  return [
    {
      key: "meetingNumber",
      header: "ID",
      className: "w-20",
      cell: (row) => (
        <Link
          href={`/build/${projectId}/meetings/${row.id}`}
          className="font-mono tabular-nums text-dense text-primary hover:underline"
        >
          MTG-{row.meetingNumber}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
          <Link
            href={`/build/${projectId}/meetings/${row.id}`}
            className="block min-w-0 font-medium text-foreground hover:text-primary"
          >
            <TruncatedText text={row.title} />
          </Link>
          {row.cycleId != null && cycleMap.has(row.cycleId) ? (
            <span className="flex max-w-full min-w-0 items-center gap-1 text-dense text-muted-foreground">
              <Layers className="h-3 w-3 shrink-0" />
              <TruncatedText
                text={cycleMap.get(row.cycleId)?.name ?? ""}
                className="text-dense"
              />
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      className: "w-24",
      cell: (row) => <MeetingTypeBadge type={row.type} />,
    },
    {
      key: "status",
      header: "Status",
      className: "w-28",
      cell: (row) => <MeetingStatusBadge status={row.status} />,
    },
    {
      key: "scheduledAt",
      header: "Date / Duration",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.scheduledAt ? (
            <span className="font-mono tabular-nums text-sm text-foreground">
              {new Date(row.scheduledAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
          {row.durationMinutes != null ? (
            <span className="flex items-center gap-1 text-dense text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {row.durationMinutes}m
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "host",
      header: "Host",
      className: "w-32",
      cell: (row) => {
        const host = row.createdBy ? memberMap.get(row.createdBy) : undefined;
        if (!host) return <span className="text-sm text-muted-foreground">—</span>;
        const label = getUserDisplayName(host);
        return (
          <TruncatedText
            text={label}
            className="max-w-[120px] text-sm text-foreground"
          />
        );
      },
    },
    {
      key: "attendeeCount",
      header: "Attendees",
      className: "w-24",
      cell: (row) => (
        <span className="flex items-center gap-1 font-mono tabular-nums text-sm text-muted-foreground">
          {(row.attendeeCount ?? 0) > 0 ? (
            <>
              <Users className="h-3 w-3 shrink-0" />
              {row.attendeeCount}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "actionItemCount",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-28",
      cell: (row) => (
        <div className="flex items-center gap-1.5 font-mono tabular-nums text-sm text-muted-foreground">
          {(row.actionItemCount ?? 0) > 0 ? (
            <>
              <ClipboardList className="h-3 w-3 shrink-0" />
              {row.actionItemCount}
              {(row.unresolvedActionItemCount ?? 0) > 0 ? (
                <Badge
                  variant="outline"
                  className="ml-0.5 px-1 py-0 text-micro text-status-warning-ink-strong border-status-warning-rule"
                >
                  {row.unresolvedActionItemCount} open
                </Badge>
              ) : null}
            </>
          ) : (
            "—"
          )}
        </div>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      className: "w-16",
      cell: (row) =>
        row.notes ? (
          <FileText className="h-3.5 w-3.5 text-primary" aria-label="Has notes" />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];
}

export function MeetingMobileCard({
  meeting,
  memberMap,
}: {
  meeting: Meeting;
  memberMap: Map<string, ProjectMemberRecord>;
}) {
  const host = meeting.createdBy ? memberMap.get(meeting.createdBy) : undefined;
  const personUser = host ? { name: host.name ?? null, email: host.email } : null;
  const scheduledDate = meeting.scheduledAt
    ? new Date(meeting.scheduledAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  return (
    <BuildMobileCard
      eyebrow={`MTG-${meeting.meetingNumber}`}
      title={meeting.title}
      status={<MeetingStatusBadge status={meeting.status} />}
      person={{ user: personUser, role: "Host" }}
      meta={[
        { label: "Date", value: scheduledDate },
        { label: "Attendees", value: meeting.attendeeCount ?? 0 },
      ]}
    />
  );
}
