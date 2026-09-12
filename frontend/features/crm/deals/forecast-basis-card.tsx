"use client";

import { useCallback } from "react";
import { Brain, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Progress } from "@/components/ui/progress";
import { useCan } from "@/hooks/api/access";
import { useTrainForecast } from "@/hooks/api/crm/deal-forecast";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import type {
  ForecastBasis,
  ForecastNaiveReason,
  LearnedForecastBasis,
  NaiveForecastBasis,
} from "@/types/crm/forecast";

/**
 * CRM-P2-04. What the forecast on this page actually is.
 *
 * The backend has reported a `basis` on every forecast read for a while and
 * nothing rendered it, so the page presented a weighted sum of the tenant's own
 * stage percentages with the same confidence it would present a model — and,
 * until this ticket, presented a weighted sum of a hardcoded six-stage table
 * that was not even the tenant's.
 *
 * The union is rendered as a union. There is no shared "accuracy" block that
 * quietly shows zeros on the naive arm, because a zero there would read as a
 * measured result rather than an absent one.
 */

/**
 * Why the tenant is on the weighted arithmetic, in their words rather than ours.
 *
 * The six reasons are genuinely six different situations and the copy says so.
 * Collapsing them into "not enough data" would tell a tenant who has plenty of
 * history and was refused a model that the fault is theirs.
 */
const NAIVE_EXPLANATION: Record<ForecastNaiveReason, string> = {
  "insufficient-history":
    "There are not yet enough closed deals to learn from. Until there are, this is arithmetic rather than a prediction.",
  "not-trained-yet":
    "There is enough closed history to learn from and no model has been fitted yet. That is our gap, not yours.",
  "no-holdout":
    "A model was fitted, but too few deals closed after it to test it on. An untested model is not worth showing you.",
  "cannot-discriminate":
    "A model was fitted and could not tell winning deals from losing ones well enough to be worth trusting.",
  "no-better-than-naive":
    "A model was fitted and it was not closer to the outcomes than the arithmetic below. It was discarded rather than shown to you.",
  "did-not-converge":
    "A model was fitted and the numbers did not settle, so nothing was kept.",
};

function RefitButton() {
  const train = useTrainForecast();

  const handleTrain = useCallback(() => {
    train.mutate(undefined, {
      onSuccess: (attempt) => {
        /**
         * A refusal is a successful request. Reporting it through `toast.error`
         * would say the system broke, when what happened is that it declined to
         * replace a number the tenant understands with one that was not better.
         */
        if (attempt.trained)
          toast.success(
            `Fitted on ${attempt.trainingDeals} closed deals and scored ${attempt.scored} open ones.`,
          );
        else toast.info(NAIVE_EXPLANATION[attempt.reason]);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [train]);

  return (
    <LoadingButton variant="outline" size="sm" isPending={train.isPending} onClick={handleTrain}>
      Fit a model now
    </LoadingButton>
  );
}

function LearnedBasis({ basis }: { basis: LearnedForecastBasis }) {
  /**
   * Both numbers, always. The model's Brier alone is unreadable — 0.18 is
   * meaningless without knowing what the arithmetic it replaced scored on the
   * same deals — and the whole acceptance rule is that it had to be lower.
   */
  const beatBy = basis.naiveHoldout.brier - basis.holdout.brier;

  return (
    <>
      <dl className="grid grid-cols-2 gap-gap-field sm:grid-cols-4">
        <div>
          <dt className="text-micro text-muted-foreground">Learned from</dt>
          <dd className="text-sm font-medium tabular-nums">{basis.trainingDeals} closed deals</dd>
        </div>
        <div>
          <dt className="text-micro text-muted-foreground">Tested on</dt>
          <dd className="text-sm font-medium tabular-nums">
            {basis.holdoutDeals} it never saw
          </dd>
        </div>
        <div>
          {/* Ranking ability. 0.5 is a coin, and the acceptance floor is 0.6. */}
          <dt className="text-micro text-muted-foreground">Tells deals apart</dt>
          <dd className="text-sm font-medium tabular-nums">
            {basis.holdout.auc.toFixed(2)}{" "}
            <span className="font-normal text-muted-foreground">of 1.00</span>
          </dd>
        </div>
        <div>
          <dt className="text-micro text-muted-foreground">Closer to outcomes than arithmetic</dt>
          <dd className="text-sm font-medium tabular-nums">
            {beatBy > 0 ? `by ${beatBy.toFixed(3)}` : "no better"}
          </dd>
        </div>
      </dl>

      <p className="text-label text-muted-foreground">
        Fitted {formatShortDate(basis.trainedAt)} on deals as they stood a month before they
        closed, and tested only on deals that closed after everything it was shown. Learned
        forecasting has been on for this workspace since {formatShortDate(basis.becameAvailableAt)}.
      </p>
    </>
  );
}

function NaiveBasis({ basis }: { basis: NaiveForecastBasis }) {
  const { readiness } = basis;
  const progress = Math.min(
    100,
    Math.round((readiness.closedDeals / Math.max(1, readiness.minimumClosedDeals)) * 100),
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">{NAIVE_EXPLANATION[basis.reason]}</p>

      <div className="space-y-gap-field">
        <div className="flex items-baseline justify-between gap-gap-field">
          <span className="text-micro text-muted-foreground">Closed deals</span>
          <span className="text-sm font-medium tabular-nums">
            {readiness.closedDeals} of {readiness.minimumClosedDeals}
          </span>
        </div>
        <Progress value={progress} />
        {/*
          The headline count is not the whole bar. A workspace on sixty closed
          deals of which ten were won still needs five more, and they have to be
          wins — saying "none" would be a promise the next screen breaks.
        */}
        {readiness.wonDealsNeeded > 0 || readiness.lostDealsNeeded > 0 ? (
          <p className="text-label text-muted-foreground">
            At least {readiness.minimumPerOutcome} of each outcome are needed:{" "}
            {readiness.wonDealsNeeded > 0 ? `${readiness.wonDealsNeeded} more won` : "won is met"}
            {", "}
            {readiness.lostDealsNeeded > 0
              ? `${readiness.lostDealsNeeded} more lost`
              : "lost is met"}
            .
          </p>
        ) : null}
      </div>

      <p className="text-label text-muted-foreground">
        Until then the total is each deal&apos;s value times its probability, using the deal&apos;s
        own figure where somebody set one and its stage&apos;s configured figure otherwise.
      </p>
    </>
  );
}

export function ForecastBasisCard({ basis }: { basis: ForecastBasis }) {
  const canRefit = useCan("crm:deals:manage");
  const learned = basis.kind === "learned";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-gap-field">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-gap-inline">
              {learned ? <Brain className="size-4" /> : <Ruler className="size-4" />}
              {learned ? "Learned from your own closed deals" : "Weighted pipeline, not a prediction"}
              <Badge variant="outline">{learned ? "model" : "arithmetic"}</Badge>
            </CardTitle>
            <CardDescription>
              {learned
                ? "Each open deal carries a probability this workspace's own history implies."
                : "Nothing has been learned from this workspace's history yet."}
            </CardDescription>
          </div>
          {canRefit ? <RefitButton /> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-gap-section">
        {basis.kind === "learned" ? (
          <LearnedBasis basis={basis} />
        ) : (
          <NaiveBasis basis={basis} />
        )}
      </CardContent>
    </Card>
  );
}
