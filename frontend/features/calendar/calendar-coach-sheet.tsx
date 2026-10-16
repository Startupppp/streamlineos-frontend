"use client";

import { Info } from "lucide-react";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared/app-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  useCalendarCoach,
  useUpdateCalendarCoachConsent,
} from "@/hooks/api/calendar-coach";
import type { CalendarCoachInsight } from "@/hooks/api/calendar-coach-schema";

const INSIGHT_CARD = "rounded-xl border border-border bg-card text-card-foreground";

const COVERAGE: Record<
  CalendarCoachInsight["coverage"],
  { label: string; tone: StatusTone }
> = {
  complete: { label: "Sources complete", tone: "success" },
  partial: { label: "Partial coverage", tone: "warning" },
  unavailable: { label: "Coverage unavailable", tone: "neutral" },
  disabled: { label: "Insights off", tone: "neutral" },
};

function hoursLabel(minutes: number | null, complete: boolean): string {
  if (minutes === null) return "Unavailable";
  const hours = Math.round(minutes / 60);
  return complete ? `${hours} h` : `At least ${hours} h`;
}

function countLabel(value: number | null): string {
  return value === null ? "Unavailable" : String(value);
}

function metricTiles(insight: CalendarCoachInsight) {
  const complete = insight.coverage === "complete";
  return [
    { label: "Scheduled meeting time", value: hoursLabel(insight.meetingMinutes, complete) },
    { label: "Protected work time", value: hoursLabel(insight.protectedWorkMinutes, complete) },
    { label: "Calendar no-shows", value: countLabel(insight.missedCommitments) },
    { label: "Repeated reschedules", value: countLabel(insight.repeatedReschedules) },
    { label: "Currently overdue Tasks", value: countLabel(insight.overdueTasks) },
    { label: "Currently overdue Build tickets", value: countLabel(insight.overdueBuildTickets) },
  ];
}

function CountingNotes({ definitions }: { definitions: string[] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          aria-label="How these totals are counted"
        >
          <Info />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className="max-w-sm space-y-2 whitespace-normal px-3 py-2 text-left leading-5"
      >
        {definitions.map((definition) => (
          <p key={definition}>{definition}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  const unavailable = value === "Unavailable";
  return (
    <div className={cn(INSIGHT_CARD, "p-4")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 font-semibold tracking-tight text-card-foreground",
          unavailable ? "text-sm font-medium text-muted-foreground" : "text-lg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function CalendarCoachSheet({ onClose }: { onClose: () => void }) {
  const coach = useCalendarCoach();
  const update = useUpdateCalendarCoachConsent();
  const insight = coach.data;
  const changeConsent = async (enabled: boolean) => {
    if (!insight) return;
    try {
      await update.mutateAsync({
        enabled,
        expectedVersion: insight.consent.version,
      });
      toast.success(
        enabled ? "Personal insights enabled" : "Personal insights disabled",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <AppSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="My time insights"
      description="Private, optional schedule guidance for you. These totals are not an employee score."
      className="w-full overflow-hidden sm:max-w-lg"
      footer={insight ? (
        <InsightConsent
          enabled={insight.consent.enabled}
          pending={update.isPending}
          onConsentChange={(checked) => {
            void changeConsent(checked);
          }}
        />
      ) : undefined}
    >
      <div className="space-y-4 bg-background">
        {coach.isLoading ? (
          <div role="status" aria-label="Loading your preference" className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : null}
        {coach.isError ? (
          <div className={cn(INSIGHT_CARD, "space-y-3 p-4")}>
            <p className="text-sm text-destructive">{getErrorMessage(coach.error)}</p>
            <Button
              variant="outline"
              onClick={() => {
                void coach.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {insight ? <InsightBody insight={insight} /> : null}
      </div>
    </AppSheet>
  );
}

function InsightConsent({
  enabled,
  pending,
  onConsentChange,
}: {
  enabled: boolean;
  pending: boolean;
  onConsentChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">Personal insights</p>
        <p className="text-xs text-muted-foreground">Only you can open this view.</p>
      </div>
      <Switch
        checked={enabled}
        disabled={pending}
        aria-label={enabled ? "Turn off personal insights" : "Turn on personal insights"}
        onCheckedChange={onConsentChange}
      />
    </div>
  );
}

function InsightBody({ insight }: { insight: CalendarCoachInsight }) {
  const coverage = COVERAGE[insight.coverage];
  const tone = statusToneClasses(coverage.tone);
  const definitions = [
    insight.definitions.meetingMinutes,
    insight.definitions.protectedWorkMinutes,
    insight.definitions.missedCommitments,
    insight.definitions.repeatedReschedules,
    insight.definitions.overdueTasks,
    insight.definitions.overdueBuildTickets,
  ];

  if (!insight.consent.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Personal insights are off. Turn them on at the bottom of this sheet to see these totals.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Last 28 days</p>
              <CountingNotes definitions={definitions} />
            </div>
            <Badge variant="outline" className={cn(tone.surface, tone.ink, tone.rule)}>
              {coverage.label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metricTiles(insight).map((metric) => (
              <InsightMetric key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Suggestions to consider</h3>
            {insight.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No suggestions from the available data.
              </p>
            ) : (
              insight.recommendations.map((item) => (
                <div key={item.code} className={cn(INSIGHT_CARD, "space-y-1 p-4")}>
                  <p className="text-sm font-medium">{item.proposal}</p>
                  <p className="text-xs text-muted-foreground">{item.evidence}</p>
                </div>
              ))
            )}
          </section>
    </>
  );
}
