"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { WidgetCard } from "@/components/ui/widget-card";
import { useManagerDashboard } from "@/lib/api/hooks/dashboard";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

const statusDot: Record<string, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  leave: "bg-amber-500",
};

export function TeamAttendanceWidget() {
  const { data, isLoading, error } = useManagerDashboard();
  const members = data?.teamAttendanceToday ?? [];

  const presentCount = members.filter((m) => m.status === "present").length;
  const absentCount = members.filter((m) => m.status === "absent").length;

  return (
    <WidgetCard
      icon={Users}
      title="Team Attendance"
      link={{ href: "/hr/attendance", label: "View all", ariaLabel: "View full attendance" }}
      isLoading={isLoading}
      error={error}
      isEmpty={!members.length}
      empty={
        <EmptyState
          illustration={<EmptyTeamIllustration className="h-20 w-20" />}
          title="No team members"
          compact
        />
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            {presentCount} present
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full bg-red-500"
              aria-hidden="true"
            />
            {absentCount} absent
          </span>
        </div>
        <ul className="space-y-2 overflow-y-auto max-h-52">
          {members.slice(0, 15).map((m) => (
            <li key={m.userId} className="flex items-center gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {m.name[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate flex-1">{m.name}</span>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  statusDot[m.status] ?? "bg-muted",
                )}
                aria-label={m.status}
              />
            </li>
          ))}
        </ul>
      </div>
    </WidgetCard>
  );
}
