"use client";

import { useCallback } from "react";
import { Clock, Lock, MessageSquareQuote, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import {
  useCallAnalysis,
  useReleaseCallAnalysis,
  useRunCallAnalysis,
} from "@/hooks/api/crm/call-intelligence";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  CallAnalysis,
  CallAnalysisVisibility,
  ObjectionHandling,
} from "@/types/crm/call-intelligence";

interface CallAnalysisPanelProps {
  activityId: string;
  /** The org's locale, for the one date this panel renders. */
  locale?: string;
}

const HANDLING_TONE: Record<ObjectionHandling, string> = {
  answered: "bg-status-success-surface text-status-success-ink",
  acknowledged: "bg-status-info-surface text-status-info-ink",
  deflected: "bg-status-warning-surface text-status-warning-ink",
  unaddressed: "bg-status-danger-surface text-status-danger-ink",
};

/**
 * One call's analysis, wherever a call is shown.
 *
 * The panel distinguishes four kinds of nothing, because the product answer
 * differs for each: not analysed (offer to run it), refused by the consent rule
 * (never offer — retrying cannot change it), inside the rep's private window
 * (say when it opens), and somebody else's call. Collapsing them into one empty
 * state would have a team spending AI credits re-running a call that will never
 * become analysable.
 */
export function CallAnalysisPanel({ activityId, locale = "en" }: CallAnalysisPanelProps) {
  const query = useCallAnalysis(activityId);
  const canRun = useCan("crm:call-analysis:run");
  const run = useRunCallAnalysis();
  const release = useReleaseCallAnalysis();

  const handleRun = useCallback(() => {
    run.mutate(activityId, {
      onSuccess: (result) => {
        toast.success(
          result.cached
            ? "This transcript was already analysed — no credit spent"
            : "Call analysed",
        );
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [activityId, run]);

  const handleRelease = useCallback(() => {
    release.mutate(
      { activityId },
      {
        onSuccess: (result) =>
          toast.success(
            result.data.alreadyReleased
              ? "This analysis was already shared"
              : "Analysis shared with your manager",
          ),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [activityId, release]);

  if (query.access.denied)
    return <NoPermissionState permission="crm:call-analysis:view" compact />;

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;

  if (query.error) {
    const status = readStatus(query.error);
    // 422 is the consent rule refusing this call. Nothing about retrying changes
    // it — what would is a compliance record somebody has to enter.
    if (status === 422)
      return (
        <Notice
          icon={Lock}
          title="This call cannot be analysed"
          body={getErrorMessage(query.error)}
        />
      );

    if (status === 404)
      return (
        <Notice
          icon={Sparkles}
          title="Not analysed yet"
          body="Analysing reads the transcript and reports talk ratio, objections, competitors named, and whether a next step was agreed."
          action={
            canRun ? (
              <Button size="sm" onClick={handleRun} disabled={run.isPending}>
                {run.isPending ? "Analysing…" : "Analyse this call"}
              </Button>
            ) : null
          }
        />
      );

    return (
      <Notice
        icon={Sparkles}
        title="Couldn't load the analysis"
        body={getErrorMessage(query.error)}
      />
    );
  }

  const response = query.data;
  if (!response) return null;

  if (!response.data) return <Embargoed visibility={response.visibility} locale={locale} />;

  return (
    <AnalysisBody
      analysis={response.data}
      visibility={response.visibility}
      locale={locale}
      onRelease={handleRelease}
      releasing={release.isPending}
    />
  );
}

function AnalysisBody({
  analysis,
  visibility,
  locale,
  onRelease,
  releasing,
}: {
  analysis: CallAnalysis;
  visibility: CallAnalysisVisibility;
  locale: string;
  onRelease: () => void;
  releasing: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Metric label="Talk ratio" value={formatBpsPercent(analysis.talkRatioBps)} />
        <Metric label="Question rate" value={formatBpsPercent(analysis.questionRateBps)} />
        <Metric
          label="Next step"
          value={analysis.nextStepCommitted ? "Agreed" : "None agreed"}
        />
        {visibility.reason === "own-call" ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={onRelease}
            disabled={releasing}
          >
            {releasing ? "Sharing…" : "Share with manager"}
          </Button>
        ) : null}
      </div>

      {analysis.nextStep ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Committed next step: </span>
          {analysis.nextStep}
        </p>
      ) : null}

      {analysis.objections.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Objections</h4>
          <ul className="flex flex-col gap-3">
            {analysis.objections.map((objection, index) => (
              <li key={`${objection.handling}-${index}`} className="flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <MessageSquareQuote
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-sm italic">{objection.quote}</p>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <Badge variant="secondary" className={HANDLING_TONE[objection.handling]}>
                    {objection.handling}
                  </Badge>
                  {objection.response ? (
                    <p className="text-sm text-muted-foreground">{objection.response}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.competitorMentions.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Competitors named</h4>
          <ul className="flex flex-col gap-2">
            {analysis.competitorMentions.map((mention, index) => (
              <li key={`${mention.name}-${index}`} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{mention.name}</span>
                <span className="text-sm italic text-muted-foreground">{mention.quote}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {`Analysed ${new Date(analysis.analysedAt).toLocaleString(locale)}`}
        {analysis.model ? ` · ${analysis.model}` : ""}
      </p>
    </div>
  );
}

/** Analysed, but not for this viewer yet. `opensAt` is the whole message. */
function Embargoed({
  visibility,
  locale,
}: {
  visibility: CallAnalysisVisibility;
  locale: string;
}) {
  if (visibility.reason === "rep-window")
    return (
      <Notice
        icon={Clock}
        title="Still with the rep"
        body={`This call has been analysed. The rep who made it gets the first ${visibility.privateWindowHours} hours${
          visibility.opensAt
            ? `, so it opens to you at ${new Date(visibility.opensAt).toLocaleString(locale)}`
            : ""
        }. They can share it sooner.`}
      />
    );

  return (
    <Notice
      icon={Lock}
      title="Not your call"
      body="Reading somebody else's call analysis needs the team key, and the rep's private window applies on top of it."
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Notice({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border px-6 py-8 text-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Basis points of 10000 as a percentage. Null means no speaker attribution. */
function formatBpsPercent(bps: number | null): string {
  return bps === null ? "—" : `${(bps / 100).toFixed(0)}%`;
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("status" in error && typeof error.status === "number") return error.status;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  return undefined;
}
