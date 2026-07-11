"use client";

import { format, isPast } from "date-fns";
import { CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useVestingSchedule } from "@/hooks/api/hr/enterprise-comp";

interface Props {
  grantId: number;
}

export function VestingTimeline({ grantId }: Props) {
  const { data: events, isLoading } = useVestingSchedule(grantId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  if (!events?.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No vesting schedule generated.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((e) => {
        const vested = isPast(new Date(e.vestDate));
        return (
          <div key={e.id} className={`flex items-center justify-between p-3 rounded-lg border ${vested ? "bg-blue-50/60 border-blue-200" : "bg-card"}`}>
            <div className="flex items-center gap-3">
              {vested ? (
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">{format(new Date(e.vestDate), "dd MMM yyyy")}</p>
                <p className="text-xs text-muted-foreground">{e.unitsVested.toLocaleString()} units vest</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-blue-700">{e.cumulativeVested.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">cumulative</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
