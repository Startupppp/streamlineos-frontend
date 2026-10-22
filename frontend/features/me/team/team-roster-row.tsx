"use client";

import { useCallback } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ManagerHomeReport } from "@/hooks/api/hr/manager-home-schema";

export interface RosterRowLeave {
  startDate: string;
  endDate: string;
}

interface TeamRosterRowProps {
  report: ManagerHomeReport;
  nextLeave: RosterRowLeave | null;
  onOpen: (report: ManagerHomeReport) => void;
}

function PresencePill({ onLeaveToday }: { onLeaveToday: boolean }) {
  if (!onLeaveToday) return null;
  const tone = statusToneClasses("warning");
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-dense font-medium",
        tone.surface,
        tone.ink,
        tone.rule,
      )}
    >
      On leave
    </span>
  );
}

export function TeamRosterRow({ report, nextLeave, onOpen }: TeamRosterRowProps) {
  const handleOpen = useCallback(() => {
    onOpen(report);
  }, [onOpen, report]);

  const displayName = getUserDisplayName({
    name: report.name,
    email: report.email,
  });

  return (
    <div className="flex min-h-11 items-center gap-3 py-2">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-status-info-surface text-status-info-ink text-micro font-bold">
          {getUserInitials({ name: report.name, email: report.email })}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
        <p className="flex flex-wrap items-center gap-1 text-dense text-muted-foreground">
          {report.designation ? <span>{report.designation}</span> : null}
          {report.lifecycleStatus === "PROBATION" && report.probationEndsOn ? (
            <>
              {report.designation ? <span aria-hidden>·</span> : null}
              <span>Ends {format(parseISO(report.probationEndsOn), "MMM d")}</span>
            </>
          ) : null}
          {report.unsettledTimesheets > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{report.unsettledTimesheets} unsettled</span>
            </>
          ) : null}
        </p>
      </div>

      <PresencePill onLeaveToday={report.onLeaveToday} />

      {nextLeave ? (
        <span className="hidden shrink-0 text-dense text-muted-foreground tabular-nums sm:inline">
          Leave from {format(parseISO(nextLeave.startDate), "MMM d")}
        </span>
      ) : null}

      <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={handleOpen}>
        Open
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label={`More actions for ${displayName}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/hr/approvals">Decisions for my team</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/timesheets/overdue">Overdue timesheets</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
