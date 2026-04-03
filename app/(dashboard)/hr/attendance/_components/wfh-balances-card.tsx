"use client";

import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { WFH_MONTHLY_QUOTA } from "@/lib/leave-policy";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { Home } from "lucide-react";

export const WfhBalancesCard = memo(function WfhBalancesCard() {
  const { data: requests, isLoading } = api.hr.getWfhRequests.useQuery();

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
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const usedPercent = (stats.approved / WFH_MONTHLY_QUOTA) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-5 w-5 text-[#bd882c]" />
          WFH Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar with fraction */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Monthly Quota</span>
            <span className="font-semibold">{stats.approved} / {WFH_MONTHLY_QUOTA}</span>
          </div>
          <Progress
            value={usedPercent}
            className="h-2.5"
            aria-label={`${stats.approved} of ${WFH_MONTHLY_QUOTA} WFH days used`}
          />
        </div>

        {/* Remaining line */}
        <p className="text-sm text-muted-foreground text-center">
          Remaining Balance:{" "}
          <span className="font-semibold text-foreground">{stats.remaining} Days</span>
          {" "}/ Year
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.remaining}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3 text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Apply for WFH button */}
        <RequestWfhDialog
          trigger={
            <Button className="w-full" variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Apply for WFH
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
});
