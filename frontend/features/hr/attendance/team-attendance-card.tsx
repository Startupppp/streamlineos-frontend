"use client";

import { memo, useState, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Wifi, WifiOff, Coffee, LogOut } from "lucide-react";
import { useHrTeamAttendanceStatus } from "@/hooks/api/hr";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import type { TeamAttendanceEntry } from "@/types/hr";

function StatusBadge({ status }: { status: TeamAttendanceEntry["status"] }) {
  switch (status) {
    case "PRESENT":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800 gap-1 text-xs">
          <Wifi className="h-2.5 w-2.5" /> Present
        </Badge>
      );
    case "ON_BREAK":
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800 gap-1 text-xs">
          <Coffee className="h-2.5 w-2.5" /> On Break
        </Badge>
      );
    case "CHECKED_OUT":
      return (
        <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800 gap-1 text-xs">
          <LogOut className="h-2.5 w-2.5" /> Checked Out
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground gap-1 text-xs">
          <WifiOff className="h-2.5 w-2.5" /> Offline
        </Badge>
      );
  }
}

export const TeamAttendanceCard = memo(function TeamAttendanceCard({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  const { data, isLoading } = useHrTeamAttendanceStatus();
  const [search, setSearch] = useState("");
  const handleSearchChange = useCallback((value: string) => setSearch(value), []);

  const filtered = (data ?? []).filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const counts = (data ?? []).reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<TeamAttendanceEntry["status"], number>,
  );

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            Team Attendance — Today
          </CardTitle>
        </div>

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 mt-2 rounded-xl bg-muted/30">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-bold tabular-nums text-emerald-600">{counts.PRESENT ?? 0}</span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Present</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-bold tabular-nums text-amber-600">{counts.ON_BREAK ?? 0}</span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">On Break</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-bold tabular-nums text-blue-600">{counts.CHECKED_OUT ?? 0}</span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Checked Out</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-bold tabular-nums text-muted-foreground">{counts.OFFLINE ?? 0}</span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Offline</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pb-5">
        <div className="min-w-0">
          <SearchInput placeholder="Search employees or departments…" value={search} onValueChange={handleSearchChange} />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col flex-1 items-center justify-center py-8 gap-2">
            <Users className="w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No employees found.</p>
          </div>
        ) : (
          <div
            className={
              expanded
                ? "space-y-1 pr-1"
                : "max-h-72 space-y-1 overflow-y-auto pr-1"
            }
          >
            {filtered.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-8 shrink-0">
                  {entry.image && (
                    <AvatarImage src={resolveImageUrl(entry.image)} />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(entry.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  {entry.department && (
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.department}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <StatusBadge status={entry.status} />
                  {entry.checkIn && (
                    <span className="text-[10px] text-muted-foreground">
                      In {format(new Date(entry.checkIn), "h:mm a")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
