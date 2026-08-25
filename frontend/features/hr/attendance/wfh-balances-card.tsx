"use client";

import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrWfhRequests, useLeavePolicy } from "@/hooks/api/hr";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { Home } from "lucide-react";
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
      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-4">
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
      <Card className="overflow-hidden">
        <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Home className="h-4 w-4 text-muted-foreground" />
            WFH Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-4">
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
    <Card className="overflow-hidden">
      <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Home className="h-4 w-4 text-muted-foreground" />
          WFH Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-4">
        <div>
          <div className="mb-2 flex justify-between text-dense font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Monthly Quota</span>
            <span className="text-sm font-semibold normal-case tracking-normal text-foreground">
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
          <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
            <p className="text-micro text-muted-foreground">Left</p>
            <p className="text-sm font-semibold tabular-nums">{remaining}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
            <p className="text-micro text-muted-foreground">Used</p>
            <p className="text-sm font-semibold tabular-nums">{stats.approved}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
            <p className="text-micro text-muted-foreground">Pending</p>
            <p className="text-sm font-semibold tabular-nums">{stats.pending}</p>
          </div>
        </div>

        <ApplyForWfhButton />
      </CardContent>
    </Card>
  );
});
