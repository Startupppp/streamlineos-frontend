"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PartyPopper } from "lucide-react";
import { useAnniversaryFeed } from "@/lib/api/hooks/hr";

export function AnniversaryFeedWidget() {
  const { data: items, isLoading } = useAnniversaryFeed();

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <PartyPopper className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Upcoming Anniversaries</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-7 rounded" />)}
          </div>
        ) : !items || items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No upcoming in 30 days
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.slice(0, 6).map((item) => (
              <div key={`${item.userId}-${item.type}`} className="flex items-center gap-2 text-sm">
                <span className="text-base">{item.type === "BIRTHDAY" ? "🎂" : "🏆"}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate">{item.name}</span>
                  {item.type === "WORK_ANNIVERSARY" && item.yearsCount && (
                    <span className="text-xs text-muted-foreground ml-1">{item.yearsCount}yr</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {item.daysAway === 0 ? "Today" : `${item.dateStr}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
