"use client";

import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useHrWfhRequests, useLeavePolicy } from "@/hooks/api/hr";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { Home, CalendarCheck, Clock, CheckCircle2 } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { HouseIcon } from "@animateicons/react/lucide";

const ApplyForWfhButton = () => (
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
);

export const WfhBalancesCard = memo(function WfhBalancesCard() {
  const { data: requests, isLoading: isLoadingRequests } = useHrWfhRequests();
  const { data: policy, isLoading: isLoadingPolicy } = useLeavePolicy();
  const wfhQuota = policy?.wfhMonthlyQuota ?? null;
  const isLoading = isLoadingRequests || isLoadingPolicy;

  const stats = useMemo(() => {
    if (!requests) return { approved: 0, pending: 0 };
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
    return { approved, pending };
  }, [requests]);

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

  if (wfhQuota === null) {
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
          <p className="text-sm text-muted-foreground">
            No WFH policy configured yet. Ask HR to set a monthly quota under HR Policies.
          </p>
          <ApplyForWfhButton />
        </CardContent>
      </Card>
    );
  }

  const remaining = Math.max(0, wfhQuota - stats.approved);
  const usedPercent = wfhQuota > 0 ? (stats.approved / wfhQuota) * 100 : 0;

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

        <StatCardGrid cols={3}>
          <StatCard label="Left" value={remaining} icon={CalendarCheck} tone="emerald" />
          <StatCard label="Used" value={stats.approved} icon={CheckCircle2} tone="accent" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} tone="amber" />
        </StatCardGrid>

        <ApplyForWfhButton />
      </CardContent>
    </Card>
  );
});
