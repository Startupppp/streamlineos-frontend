"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Wifi, CircleDashed, Coffee, LogOut } from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import type { TeamAttendanceEntry } from "@/types/hr";
import { TruncatedText } from "@/components/ui/truncated-text";

export const STATUS_META: Record<
  TeamAttendanceEntry["status"],
  { label: string; tone: string; Icon: typeof Wifi }
> = {
  PRESENT: {
    label: "Present",
    tone: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    Icon: Wifi,
  },
  ON_BREAK: {
    label: "On Break",
    tone: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    Icon: Coffee,
  },
  CHECKED_OUT: {
    label: "Checked Out",
    tone: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    Icon: LogOut,
  },
  OFFLINE: {
    label: "Not checked in",
    tone: "bg-muted text-muted-foreground border-transparent",
    Icon: CircleDashed,
  },
};

export const SUMMARY_TONES: Record<TeamAttendanceEntry["status"], string> = {
  PRESENT: "text-status-success-ink",
  ON_BREAK: "text-status-warning-ink",
  CHECKED_OUT: "text-status-info-ink",
  OFFLINE: "text-muted-foreground",
};

export function StatusBadge({ status }: { status: TeamAttendanceEntry["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <Badge className={cn("gap-1 text-micro font-medium", meta.tone)}>
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </Badge>
  );
}

export function MemberRow({ entry }: { entry: TeamAttendanceEntry }) {
  return (
    <Link
      href={`/hr/employees/${entry.userId}`}
      className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar className="h-9 w-9 shrink-0">
        {entry.image && <AvatarImage src={resolveImageUrl(entry.image)} alt="" />}
        <AvatarFallback className="text-xs">{getInitials(entry.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TruncatedText
          text={entry.name}
          className="text-sm font-medium hover:underline"
        />
        <div className="flex min-w-0 items-center gap-1.5 text-dense text-muted-foreground">
          {entry.department ? (
            <TruncatedText text={entry.department} className="text-dense text-muted-foreground" />
          ) : (
            <span>No department</span>
          )}
          {entry.workHours && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums shrink-0">{entry.workHours}h</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <StatusBadge status={entry.status} />
        {entry.checkIn && (
          <span className="text-micro tabular-nums text-muted-foreground">
            In {format(new Date(entry.checkIn), "h:mm a")}
            {entry.checkOut
              ? ` · Out ${format(new Date(entry.checkOut), "h:mm a")}`
              : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
