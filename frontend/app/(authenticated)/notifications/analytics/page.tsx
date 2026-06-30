"use client";

import { useState, useCallback } from "react";
import { BarChart3, TrendingUp, Mail, BookOpen } from "lucide-react";
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

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  NORMAL: "bg-blue-500",
  LOW: "bg-slate-400",
};

function MetricItem({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 bg-card">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
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
    <div className="px-3 py-2.5 space-y-1 bg-card">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{count.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorClass)}
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
        <div className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
              {overviewLoading || !overview ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))
              ) : (
                <>
                  <MetricItem
                    label="Total Sent"
                    value={overview.total.toLocaleString()}
                    icon={BarChart3}
                  />
                  <MetricItem
                    label="Delivered"
                    value={overview.delivered.toLocaleString()}
                    subtitle={`${overview.deliveryRate}% delivery rate`}
                    icon={TrendingUp}
                  />
                  <MetricItem
                    label="Read"
                    value={overview.read.toLocaleString()}
                    subtitle={`${overview.readRate}% read rate`}
                    icon={BookOpen}
                  />
                  <MetricItem
                    label="Archived"
                    value={overview.archived.toLocaleString()}
                    icon={Mail}
                  />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="px-3 py-2.5 border-b border-border">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By Category</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {catLoading ? (
                  <div className="divide-y divide-border">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="px-3 py-2.5 space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-1.5 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : !byCategory?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                ) : (
                  <div className="divide-y divide-border">
                    {byCategory.map((item) => {
                      const config = NOTIFICATION_CATEGORY_CONFIG[item.category as NotificationCategory];
                      return (
                        <BarRow
                          key={item.category}
                          label={config?.label ?? item.category}
                          count={item.count}
                          max={catMax}
                          colorClass="bg-blue-500"
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 py-2.5 border-b border-border">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By Priority</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {prioLoading ? (
                  <div className="divide-y divide-border">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-3 py-2.5 space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-1.5 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : !byPriority?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                ) : (
                  <div className="divide-y divide-border">
                    {byPriority.map((item) => {
                      const config = NOTIFICATION_PRIORITY_CONFIG[item.priority as NotificationPriority];
                      return (
                        <BarRow
                          key={item.priority}
                          label={config?.label ?? item.priority}
                          count={item.count}
                          max={prioMax}
                          colorClass={PRIORITY_COLORS[item.priority] ?? "bg-muted-foreground"}
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
