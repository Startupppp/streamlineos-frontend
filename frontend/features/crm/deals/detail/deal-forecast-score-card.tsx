"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDealForecastScore } from "@/hooks/api/crm/deal-forecast";
import { formatRelativeTime } from "@/lib/date-utils";


const FACTOR_LABELS: Record<string, string> = {
  stageProbability: "Stage",
  logValue: "Deal size",
  ageDays: "Age",
  currentStageDwellDays: "Time in this stage",
  advanceCount: "Times it advanced",
  regressionCount: "Times it went backwards",
  activityCount: "Activity",
  daysSinceLastActivity: "Time since last activity",
  activitiesPerWeek: "Activity per week",
  daysToExpectedClose: "Days to expected close",
  hasExpectedCloseDate: "Has an expected close date",
  expectedCloseOverdue: "Past its expected close",
  repWinRate: "This rep's record",
  sourceWinRate: "This source's record",
};

export function DealForecastScoreCard({ dealId }: { dealId: number }) {
  const score = useDealForecastScore(dealId);

  if (score.isLoading) return <Skeleton className="h-40 w-full" />;
  if (score.isError || !score.data) return null;

  const { probability, intervalLower, intervalUpper, factors, scoredAt } = score.data;
  const percent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="flex items-center gap-gap-inline text-base">
          <Sparkles className="size-4" />
          Chance of winning
        </CardTitle>
        <CardDescription>
          Learned from this workspace&apos;s own closed deals, {formatRelativeTime(scoredAt)}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-gap-section">
        <div className="flex items-baseline gap-gap-field">
          <span className="text-2xl font-semibold tabular-nums">{percent(probability)}</span>
          <span className="text-label text-muted-foreground tabular-nums">
            somewhere between {percent(intervalLower)} and {percent(intervalUpper)}
          </span>
        </div>

        {factors.length === 0 ? null : (
          <dl className="space-y-1.5">
            {factors.slice(0, 3).map((factor) => (
              <div key={factor.feature} className="flex items-baseline justify-between gap-gap-field">
                <dt className="truncate text-label text-muted-foreground">
                  {FACTOR_LABELS[factor.feature] ?? factor.feature}
                </dt>
                <dd className="shrink-0 text-label font-medium">
                  {factor.direction === "increases" ? "raises it" : "lowers it"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
