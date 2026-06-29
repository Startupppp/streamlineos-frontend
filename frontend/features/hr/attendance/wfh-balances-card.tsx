"use client";

import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrWfhRequests } from "@/hooks/api/hr";
import { WFH_MONTHLY_QUOTA } from "@/lib/leave-policy";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { Home } from "lucide-react";

export const WfhBalancesCard = memo(function WfhBalancesCard() {
  const { data: requests, isLoading } = useHrWfhRequests();

  const stats = useMemo(() => {
    if (!requests) return { approved: 0, pending: 0, remaining: WFH_MONTHLY_QUOTA };
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthRequests = requests.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const approved = thisMonthRequests.filter((r) => r.status === "APPROVED").length;
    const pending = thisMonthRequests.filter((r) => r.status === "PENDING").length;
    return { approved, pending, remaining: Math.max(0, WFH_MONTHLY_QUOTA - approved) };
  }, [requests]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border border-l-4 border-l-violet-500 bg-card shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const usedPercent = (stats.approved / WFH_MONTHLY_QUOTA) * 100;

  return (
    <Card className="rounded-2xl border border-border border-l-4 border-l-violet-500 bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
            <Home className="h-4 w-4 text-violet-600" />
          </div>
          WFH Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <span>Monthly Quota</span>
            <span className="text-foreground normal-case text-sm font-semibold tracking-normal">
              {stats.approved} / {WFH_MONTHLY_QUOTA}
            </span>
          </div>
          <Progress
            value={usedPercent}
            className="h-2.5"
            aria-label={`${stats.approved} of ${WFH_MONTHLY_QUOTA} WFH days used`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/40 p-3 text-center">
            <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 leading-none mb-1">
              {stats.remaining}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Left</p>
          </div>
          <div className="rounded-xl bg-violet-100 dark:bg-violet-950/40 p-3 text-center">
            <p className="text-3xl font-bold tabular-nums text-violet-700 dark:text-violet-400 leading-none mb-1">
              {stats.approved}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Used</p>
          </div>
          <div className="rounded-xl bg-amber-100 dark:bg-amber-950/40 p-3 text-center">
            <p className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400 leading-none mb-1">
              {stats.pending}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
          </div>
        </div>

        <RequestWfhDialog
          trigger={
            <Button className="w-full gap-1.5 h-9 duration-200" variant="outline">
              <Home className="h-4 w-4" />
              Apply for WFH
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
});
