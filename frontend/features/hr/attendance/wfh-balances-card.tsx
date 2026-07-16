"use client";

import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrWfhRequests, useLeavePolicy } from "@/hooks/api/hr";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { Home } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { HouseIcon } from "@animateicons/react/lucide";

export const WfhBalancesCard = memo(function WfhBalancesCard() {
  const { data: requests, isLoading } = useHrWfhRequests();
  const { data: policy } = useLeavePolicy();
  const wfhQuota = policy?.wfhMonthlyQuota ?? 4;

  const stats = useMemo(() => {
    if (!requests)
      return { approved: 0, pending: 0, remaining: wfhQuota };
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthRequests = requests.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const approved = thisMonthRequests.filter(
      (r) => r.status === "APPROVED",
    ).length;
    const pending = thisMonthRequests.filter(
      (r) => r.status === "PENDING",
    ).length;
    return {
      approved,
      pending,
      remaining: Math.max(0, wfhQuota - approved),
    };
  }, [requests, wfhQuota]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border border-l-4 border-l-primary bg-card shadow-sm overflow-hidden">
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

  const usedPercent = (stats.approved / wfhQuota) * 100;

  return (
    <Card className="rounded-2xl border border-border border-l-4 border-l-primary bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Home className="h-4 w-4 text-primary" />
          </div>
          WFH Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <span>Monthly Quota</span>
            <span className="text-foreground normal-case text-sm font-semibold tracking-normal">
              {stats.approved} / {wfhQuota}
            </span>
          </div>
          <Progress
            value={usedPercent}
            className="h-2.5"
            aria-label={`${stats.approved} of ${wfhQuota} WFH days used`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/40 p-3 text-center">
            <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 leading-none mb-1">
              {stats.remaining}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Left
            </p>
          </div>
          <div className="rounded-xl bg-blue-100 dark:bg-blue-500/10 p-3 text-center">
            <p className="text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-400 leading-none mb-1">
              {stats.approved}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Used
            </p>
          </div>
          <div className="rounded-xl bg-amber-100 dark:bg-amber-950/40 p-3 text-center">
            <p className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400 leading-none mb-1">
              {stats.pending}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pending
            </p>
          </div>
        </div>

        <RequestWfhDialog
          trigger={
            <AnimatedIconButton
              className="w-full gap-1.5 h-9 duration-200"
              variant="outline"
              icon={HouseIcon}
              iconSize={16}
              iconClassName="mr-1.5"
            >
              Apply for WFH
            </AnimatedIconButton>
          }
        />
      </CardContent>
    </Card>
  );
});
