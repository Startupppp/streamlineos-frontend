"use client";

import { useState, useCallback } from "react";
import { BarChart3, TrendingUp, Mail, CheckCircle2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import {
  useNotificationAnalytics,
  useNotificationAnalyticsByCategory,
  useNotificationAnalyticsByPriority,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG,
} from "@/features/notifications/notification-types";
import type { NotificationCategory, NotificationPriority } from "@/types/notifications";

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({
  label,
  count,
  max,
  colorClass,
}: {
  label: string;
  count: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function NotificationAnalyticsPage() {
  const [days, setDays] = useState(30);

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
  } = useNotificationAnalytics(days);

  const {
    data: byCategory,
    isLoading: catLoading,
    isError: catError,
    refetch: refetchCat,
  } = useNotificationAnalyticsByCategory(days);

  const {
    data: byPriority,
    isLoading: prioLoading,
    isError: prioError,
    refetch: refetchPrio,
  } = useNotificationAnalyticsByPriority(days);

  const handleDaysChange = useCallback((value: string) => {
    setDays(Number(value));
  }, []);

  function handleRetry() {
    void refetchOverview();
    void refetchCat();
    void refetchPrio();
  }

  const isLoading = overviewLoading || catLoading || prioLoading;
  const isError = overviewError || catError || prioError;

  const catMax = byCategory?.length ? Math.max(...byCategory.map((c) => c.count)) : 0;
  const prioMax = byPriority?.length ? Math.max(...byPriority.map((p) => p.count)) : 0;

  return (
    <PageWrapper
      title="Notification Analytics"
      subtitle="Monitor delivery performance and engagement trends"
      actions={
        <Select value={String(days)} onValueChange={handleDaysChange}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {isError ? (
        <ErrorState
          title="Failed to load analytics"
          description="Could not load notification analytics."
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoading || !overview ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            ) : (
              <>
                <StatCard
                  title="Total Sent"
                  value={overview.total.toLocaleString()}
                  icon={BarChart3}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Delivered"
                  value={overview.delivered.toLocaleString()}
                  subtitle={`${overview.deliveryRate}% delivery rate`}
                  icon={TrendingUp}
                  color="bg-emerald-500"
                />
                <StatCard
                  title="Read"
                  value={overview.read.toLocaleString()}
                  subtitle={`${overview.readRate}% read rate`}
                  icon={CheckCircle2}
                  color="bg-violet-500"
                />
                <StatCard
                  title="Archived"
                  value={overview.archived.toLocaleString()}
                  icon={Mail}
                  color="bg-amber-500"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">By Category</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {catLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 rounded" />
                    ))}
                  </div>
                ) : !byCategory?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {byCategory.map((item) => {
                      const config = NOTIFICATION_CATEGORY_CONFIG[item.category as NotificationCategory];
                      return (
                        <BarRow
                          key={item.category}
                          label={config?.label ?? item.category}
                          count={item.count}
                          max={catMax}
                          colorClass={cn("bg-blue-500")}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">By Priority</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {prioLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 rounded" />
                    ))}
                  </div>
                ) : !byPriority?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {byPriority.map((item) => {
                      const config = NOTIFICATION_PRIORITY_CONFIG[item.priority as NotificationPriority];
                      const colorMap: Record<string, string> = {
                        CRITICAL: "bg-red-500",
                        HIGH: "bg-amber-500",
                        NORMAL: "bg-blue-500",
                        LOW: "bg-slate-400",
                      };
                      return (
                        <BarRow
                          key={item.priority}
                          label={config?.label ?? item.priority}
                          count={item.count}
                          max={prioMax}
                          colorClass={colorMap[item.priority] ?? "bg-muted-foreground"}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
