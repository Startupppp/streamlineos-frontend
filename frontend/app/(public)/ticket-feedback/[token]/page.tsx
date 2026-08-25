"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicCsatSurvey, useSubmitCsatResponse } from "@/hooks/api/support/csat";
import { getErrorMessage } from "@/lib/get-error-message";

const SCORES = [1, 2, 3, 4, 5] as const;

export default function TicketFeedbackPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const surveyQuery = usePublicCsatSurvey(token);
  const submitMutation = useSubmitCsatResponse(token);

  const [score, setScore] = useState<number | null>(null);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const survey = surveyQuery.data;
  const alreadyResponded = Boolean(survey?.respondedAt);
  const isSuccess = submitMutation.isSuccess;
  const showThankYou = isSuccess || alreadyResponded;
  const displayScore = isSuccess
    ? submitMutation.data?.score ?? score
    : survey?.score ?? null;

  const handleSubmit = useCallback(() => {
    if (score === null) return;
    submitMutation.mutate({ score, comment: comment.trim() || undefined });
  }, [score, comment, submitMutation]);

  function handleCommentChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setComment(e.target.value);
  }

  function handleStarsLeave() {
    setHoverScore(null);
  }

  function makeScoreHandler(value: number) {
    return () => setScore(value);
  }

  function makeHoverHandler(value: number) {
    return () => setHoverScore(value);
  }

  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">
            {showThankYou ? "Thank you!" : "Rate your support experience"}
          </h1>
          {survey && !showThankYou && (
            <p className="text-white/80 text-sm mt-1">Ticket #{survey.ticketId}</p>
          )}
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {surveyQuery.isLoading && (
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded animate-pulse" />
            </div>
          )}

          {surveyQuery.isError && (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-foreground">Survey unavailable</p>
              <p className="text-sm text-muted-foreground mt-2">
                This feedback link is invalid or has expired. Please contact the team for an
                up-to-date link.
              </p>
            </div>
          )}

          {surveyQuery.isSuccess && survey && !showThankYou && (
            <div className="space-y-5">
              <p className="text-sm text-foreground font-medium text-center">
                How satisfied were you with the resolution of your ticket?
              </p>

              <div className="flex items-center justify-center gap-2" onMouseLeave={handleStarsLeave}>
                {SCORES.map((s) => {
                  const filled = (hoverScore ?? score ?? 0) >= s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={makeScoreHandler(s)}
                      onMouseEnter={makeHoverHandler(s)}
                      className="press-scale transition-transform"
                      aria-pressed={score === s}
                      aria-label={`Score ${s} out of 5`}
                    >
                      <Star
                        className={cn(
                          "h-9 w-9 transition-colors",
                          filled ? "fill-amber-400 text-status-warning-ink" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Anything you&rsquo;d like to add?</Label>
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={handleCommentChange}
                  placeholder="Optional"
                />
              </div>

              {submitMutation.isError && (
                <p className="text-sm text-destructive" role="alert">
                  {getErrorMessage(submitMutation.error) || "Failed to submit. Please try again."}
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={score === null || submitMutation.isPending}
                className="w-full h-11"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          )}

          {showThankYou && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-status-success-surface mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-status-success-ink" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                {alreadyResponded && !isSuccess ? "You already responded" : "Feedback received"}
              </p>
              {displayScore !== null && (
                <div className="flex items-center justify-center gap-1">
                  {SCORES.map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-5 w-5",
                        displayScore >= s ? "fill-amber-400 text-status-warning-ink" : "text-muted-foreground",
                      )}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Thank you for taking the time to share your feedback. We truly appreciate it.
              </p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
