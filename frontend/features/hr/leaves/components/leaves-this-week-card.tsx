"use client";

import { format } from "date-fns";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TruncatedText } from "@/components/ui/truncated-text";
import { resolveImageUrl } from "@/lib/utils";
import type { ApprovedLeave } from "./leaves-shared";

interface LeavesThisWeekCardProps {
  leaves: ApprovedLeave[];
}

export function LeavesThisWeekCard({ leaves }: LeavesThisWeekCardProps) {
  if (leaves.length === 0) return null;

  return (
    <Card className="overflow-hidden border-status-warning-rule bg-status-warning-surface">
      <CardHeader className="border-b px-4 pb-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-status-warning-ink">
          <Users className="h-4 w-4" />
          Who&apos;s Out This Week
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warning-surface px-1.5 text-micro font-semibold text-status-warning-ink">
            {leaves.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-3">
        <div className="flex flex-wrap gap-2">
          {leaves.map((leave) => (
            <div
              key={leave.id}
              className="flex items-center gap-2 rounded-lg border border-status-warning-rule bg-card px-3 py-2"
            >
              <Avatar className="w-7">
                <AvatarImage src={resolveImageUrl(leave.user?.image)} />
                <AvatarFallback className="bg-status-warning-surface text-micro text-status-warning-ink">
                  {leave.user?.firstName?.[0]}
                  {leave.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <TruncatedText
                  text={`${leave.user?.firstName ?? ""} ${leave.user?.lastName ?? ""}`.trim()}
                  className="text-xs font-medium text-foreground"
                />
                <p className="text-micro text-muted-foreground">
                  {format(new Date(leave.startDate), "MMM dd")} –{" "}
                  {format(new Date(leave.endDate), "MMM dd")}
                  {leave.leaveType && (
                    <span className="ml-1 text-status-warning-ink">
                      · {leave.leaveType.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
