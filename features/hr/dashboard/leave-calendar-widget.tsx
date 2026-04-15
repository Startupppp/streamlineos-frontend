"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHrLeaveCalendar } from "@/lib/api/hooks/hr/dashboard";
import Link from "next/link";

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function LeaveCalendarWidget() {
  const now = new Date();
  const { data, isLoading } = useHrLeaveCalendar(now.getMonth() + 1, now.getFullYear());

  const today = now.toISOString().slice(0, 10);
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const thisWeekLeaves = (data ?? []).filter(
    (l) => l.status === "APPROVED" && l.startDate <= next7 && l.endDate >= today,
  );

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">On Leave This Week</CardTitle>
        <Link
          href="/hr/leaves"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : thisWeekLeaves.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No approved leaves this week
          </p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {thisWeekLeaves.map((leave) => (
              <div key={leave.id} className="flex items-center gap-2 py-1">
                <Avatar className="h-7 w-7 shrink-0">
                  {leave.userImage && <AvatarImage src={leave.userImage} alt={leave.userName} />}
                  <AvatarFallback className="text-[10px]">
                    {leave.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{leave.userName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateLabel(leave.startDate)} – {formatDateLabel(leave.endDate)}
                    {" · "}
                    {leave.leaveType}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {leave.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
