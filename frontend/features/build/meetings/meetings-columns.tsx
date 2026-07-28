"use client";

import Link from "next/link";
import { Clock, Users, ClipboardList, FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { MeetingTypeBadge, MeetingStatusBadge } from "./meeting-badges";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Meeting, ProjectMemberRecord } from "@/types/projects";

interface Sprint {
  id: number;
  name: string;
}

export function buildMeetingsColumns(
  projectId: number,
  memberMap: Map<string, ProjectMemberRecord>,
  sprintMap: Map<number, Sprint>,
): DataTableColumn<Meeting>[] {
  return [
    {
      key: "meetingNumber",
      header: "ID",
      className: "w-20",
      cell: (row) => (
        <Link
          href={`/build/${projectId}/meetings/${row.id}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          MTG-{row.meetingNumber}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (row) => row.title,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
          <Link
            href={`/build/${projectId}/meetings/${row.id}`}
            className="font-medium text-foreground hover:text-primary min-w-0 block"
          >
            <TruncatedText text={row.title} />
          </Link>
          {row.sprintId != null && sprintMap.has(row.sprintId) ? (
            <span className="flex max-w-full min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              <Layers className="h-3 w-3 shrink-0" />
              <TruncatedText text={sprintMap.get(row.sprintId)?.name ?? ""} className="text-[11px]" />
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
      sortable: true,
      sortValue: (row) => row.scheduledAt ?? "",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.scheduledAt ? (
            <span className="tabular-nums text-sm text-foreground">
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
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
          <TruncatedText text={label} className="max-w-[120px] text-sm text-foreground" />
        );
      },
    },
    {
      key: "attendeeCount",
      header: "Attendees",
      className: "w-24",
      cell: (row) => (
        <span className="flex items-center gap-1 tabular-nums text-sm text-muted-foreground">
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
      className: "w-28",
      cell: (row) => (
        <div className="flex items-center gap-1.5 tabular-nums text-sm text-muted-foreground">
          {(row.actionItemCount ?? 0) > 0 ? (
            <>
              <ClipboardList className="h-3 w-3 shrink-0" />
              {row.actionItemCount}
              {(row.unresolvedActionItemCount ?? 0) > 0 ? (
                <Badge
                  variant="outline"
                  className="ml-0.5 px-1 py-0 text-[10px] text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30"
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
