"use client";

import { useState, useCallback } from "react";
import { BarChart3, TrendingUp, BookOpen, AlertCircle, Activity, Layers } from "lucide-react";
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
  useNotificationAnalyticsByChannel,
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

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "In-App",
  EMAIL: "Email",
  PUSH: "Push",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  SLACK: "Slack",
  TEAMS: "Teams",
  WEBHOOK: "Webhook",
};

function MetricItem({
  label,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 bg-card">
      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", accent ?? "bg-muted")}>
        <Icon className={cn("h-4 w-4", accent ? "text-white" : "text-muted-foreground")} />
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
  subtitle,
}: {
  label: string;
  count: number;
  max: number;
  colorClass: string;
  subtitle?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="px-3 py-2.5 space-y-1 bg-card">
      <div className="flex items-center justify-between text-xs">
        <div className="min-w-0">
          <span className="font-medium text-foreground">{label}</span>
          {subtitle && <span className="ml-1.5 text-[11px] text-muted-foreground/70">{subtitle}</span>}
        </div>
        <span className="text-muted-foreground tabular-nums ml-2 shrink-0">{count.toLocaleString()}</span>
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

function ChartCard({
  title,
  isLoading,
  children,
}: {
  title: string;
  isLoading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-2.5 border-b border-border">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-3 py-2.5 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-1.5 rounded-full" />
              </div>
            ))}
          </div>
        ) : children}
      </CardContent>
    </Card>
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

  const {
    data: byChannel,
    isLoading: chanLoading,
    isError: chanError,
    refetch: refetchChan,
  } = useNotificationAnalyticsByChannel(days);

  const handleDaysChange = useCallback((value: string) => {
    setDays(Number(value));
  }, []);

  function handleRetry() {
    void refetchOverview();
    void refetchCat();
    void refetchPrio();
    void refetchChan();
  }

  const isError = overviewError || catError || prioError || chanError;

  const catMax = byCategory?.length ? Math.max(...byCategory.map((c) => c.total)) : 0;
  const prioMax = byPriority?.length ? Math.max(...byPriority.map((p) => p.total)) : 0;
  const chanMax = byChannel?.length ? Math.max(...byChannel.map((c) => c.total)) : 0;

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
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border">
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
                    subtitle={`Last ${days} days`}
                    icon={BarChart3}
                    accent="bg-blue-500"
                  />
                  <MetricItem
                    label="Delivered"
                    value={overview.delivered.toLocaleString()}
                    subtitle={`${overview.deliveryRate}% delivery rate`}
                    icon={TrendingUp}
                    accent="bg-emerald-500"
                  />
                  <MetricItem
                    label="Read"
                    value={overview.read.toLocaleString()}
                    subtitle={`${overview.readRate}% read rate`}
                    icon={BookOpen}
                    accent="bg-indigo-500"
                  />
                  <MetricItem
                    label="Archived"
                    value={overview.archived.toLocaleString()}
                    subtitle="by users"
                    icon={AlertCircle}
                  />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="By Category" isLoading={catLoading}>
              {!byCategory?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data</p>
              ) : (
                <div className="divide-y divide-border">
                  {byCategory.map((item) => {
                    const config = NOTIFICATION_CATEGORY_CONFIG[item.category as NotificationCategory];
                    return (
                      <BarRow
                        key={item.category}
                        label={config?.label ?? item.category}
                        count={item.total}
                        max={catMax}
                        colorClass="bg-blue-500"
                        subtitle={`${item.readRate}% read`}
                      />
                    );
                  })}
                </div>
              )}
            </ChartCard>

            <ChartCard title="By Priority" isLoading={prioLoading}>
              {!byPriority?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data</p>
              ) : (
                <div className="divide-y divide-border">
                  {byPriority.map((item) => {
                    const config = NOTIFICATION_PRIORITY_CONFIG[item.priority as NotificationPriority];
                    return (
                      <BarRow
                        key={item.priority}
                        label={config?.label ?? item.priority}
                        count={item.total}
                        max={prioMax}
                        colorClass={PRIORITY_COLORS[item.priority] ?? "bg-muted-foreground"}
                        subtitle={`${item.readRate}% read`}
                      />
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Channel Usage" isLoading={chanLoading}>
            {!byChannel?.length ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Layers className="h-5 w-5 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No channel data yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {byChannel.map((item) => (
                  <div key={item.channel} className="px-3 py-2.5 space-y-1 bg-card">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {CHANNEL_LABELS[item.channel] ?? item.channel}
                        </span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">{item.total.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: chanMax > 0 ? `${Math.round((item.total / chanMax) * 100)}%` : "0%" }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">{item.readRate}% read</p>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      )}
    </PageWrapper>
  );
}
