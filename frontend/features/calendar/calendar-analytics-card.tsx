"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, DatabaseZap, ShieldCheck } from "lucide-react";
import { useCalendarAnalytics } from "@/hooks/api/calendar-admin";
import { formatNumber, formatPercent } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { analyticsMonthWindow, availableAnalyticsMonths, currentAnalyticsMonth } from "./calendar-analytics-month";

export function CalendarAnalyticsCard({ timeZone, retentionDays }: { timeZone: string; retentionDays: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMonth = currentAnalyticsMonth(timeZone);
  const options = availableAnalyticsMonths(currentMonth, retentionDays);
  const requestedMonth = searchParams.get("analyticsMonth");
  const month = requestedMonth && options.some((option) => option.value === requestedMonth) ? requestedMonth : currentMonth;
  const period = analyticsMonthWindow(month);
  const analytics = useCalendarAnalytics(period.from, period.to);

  function handleMonthChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("analyticsMonth", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking analytics</CardTitle>
        <CardDescription>Lifecycle event metrics with visible denominators, correction handling, privacy suppression, and source coverage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48 space-y-1.5"><Label htmlFor="calendar-analytics-month">Month</Label><Select value={month} onValueChange={handleMonthChange}><SelectTrigger id="calendar-analytics-month"><SelectValue placeholder="Select month" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
          <Button variant="outline" disabled={analytics.isFetching} onClick={() => void analytics.refetch()}>Refresh</Button>
        </div>
        {analytics.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div> : null}
        {analytics.isError ? <Alert variant="destructive"><DatabaseZap /><AlertTitle>Analytics unavailable</AlertTitle><AlertDescription><div className="flex flex-wrap items-center justify-between gap-2"><span>{getErrorMessage(analytics.error)}</span><Button variant="outline" size="sm" onClick={() => void analytics.refetch()}>Retry</Button></div></AlertDescription></Alert> : null}
        {analytics.data ? (
          <>
            {analytics.data.period.retentionApplied ? <Alert><DatabaseZap /><AlertTitle>Month withheld by retention</AlertTitle><AlertDescription>This month is not reported because its earliest events are outside the retained analytics window. Choose a newer month for a complete cohort.</AlertDescription></Alert> : (
              <>
            <div className="flex flex-wrap items-center gap-2 text-sm"><Badge variant="outline">{analytics.data.period.timeZone}</Badge><Badge variant={analytics.data.coverage.state === "complete" ? "default" : "secondary"}>{analytics.data.coverage.state} source coverage</Badge><span className="text-muted-foreground">Cohort threshold {analytics.data.privacy.minimumCohort}</span></div>
            {analytics.data.privacy.suppressed ? <Alert><ShieldCheck /><AlertTitle>Small cohort protected</AlertTitle><AlertDescription>Numeric values are hidden because this cohort is below the organization privacy threshold.</AlertDescription></Alert> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.data.metrics.map((metric) => (
                <div key={metric.key} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{metric.label}</p><BarChart3 className="size-4 text-muted-foreground" /></div>
                  <p className="mt-2 text-2xl font-semibold">{metric.value === null ? "Suppressed" : metric.unit === "percent" ? formatPercent(metric.value, "en-IN") : formatNumber(metric.value, "en-IN")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.numerator !== null && metric.denominator !== null ? `${formatNumber(metric.numerator, "en-IN")} of ${formatNumber(metric.denominator, "en-IN")}` : metric.numerator !== null ? `${formatNumber(metric.numerator, "en-IN")} lifecycle subjects` : "Private cohort"}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.definition}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4"><p className="font-medium">Source coverage</p><p className="mt-1 text-sm text-muted-foreground">Observed {analytics.data.coverage.observedSources.length} of {analytics.data.coverage.expectedSources.length} enabled sources.</p>{analytics.data.coverage.missingSources.length > 0 ? <p className="mt-2 text-xs text-muted-foreground">Missing: {analytics.data.coverage.missingSources.join(", ")}</p> : null}{analytics.data.coverage.partialSources.length > 0 ? <p className="mt-1 text-xs text-muted-foreground">Partial: {analytics.data.coverage.partialSources.join(", ")}</p> : null}{analytics.data.coverage.failedSources.length > 0 ? <p className="mt-1 text-xs text-destructive">Failed: {analytics.data.coverage.failedSources.join(", ")}</p> : null}</div>
              <div className="rounded-lg border p-4"><p className="font-medium">Event freshness</p><p className="mt-1 text-sm text-muted-foreground">Latest event {analytics.data.freshness.latestEventAt ? new Date(analytics.data.freshness.latestEventAt).toLocaleString() : "not available"}</p><p className="mt-2 text-xs text-muted-foreground">Corrections: {analytics.data.freshness.correctionEvents ?? "suppressed"} · Late events: {analytics.data.freshness.lateEvents ?? "suppressed"}</p></div>
            </div>
            <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Metric methodology</summary><div className="mt-3 space-y-2 text-sm text-muted-foreground"><p>{analytics.data.methodology.basis}</p><p>{analytics.data.methodology.denominator}</p><p>{analytics.data.methodology.deduplication}</p><p>{analytics.data.methodology.corrections}</p><p>{analytics.data.methodology.deletedRecords}</p><p>{analytics.data.methodology.lateEventDefinition}</p></div></details>
              </>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
