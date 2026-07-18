"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicNpsSurvey, useSubmitNpsResponse } from "@/hooks/api/crm";
import { getApiError } from "@/lib/api-client";

const SCORES = Array.from({ length: 11 }, (_, i) => i);

function scoreClasses(score: number, selected: boolean): string {
  const base =
    score >= 9
      ? "border-emerald-300 hover:border-emerald-500"
      : score >= 7
        ? "border-amber-300 hover:border-amber-500"
        : "border-red-300 hover:border-red-500";
  const active =
    score >= 9
      ? "border-emerald-500 bg-emerald-500 text-white"
      : score >= 7
        ? "border-amber-500 bg-amber-500 text-white"
        : "border-red-500 bg-red-500 text-white";
  return selected ? active : cn(base, "bg-white text-slate-700");
}

export default function PublicNpsPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const surveyQuery = usePublicNpsSurvey(token);
  const submitMutation = useSubmitNpsResponse(token);

  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const survey = surveyQuery.data;
  const isSuccess = submitMutation.isSuccess;

  const handleSubmit = useCallback(() => {
    if (score === null) return;
    submitMutation.mutate({
      score,
      comment: comment.trim() || undefined,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
    });
  }, [score, comment, name, email, submitMutation]);

  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-8 text-center shadow-noir">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSuccess ? "Thank you!" : "Share your feedback"}
          </h1>
          {survey && !isSuccess && <p className="text-white/80 text-sm mt-1">{survey.title}</p>}
        </div>

        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir">
          {surveyQuery.isLoading && (
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded animate-pulse w-2/3" />
              <div className="h-10 bg-slate-200 rounded animate-pulse" />
              <div className="h-24 bg-slate-200 rounded animate-pulse" />
            </div>
          )}

          {surveyQuery.isError && (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-slate-700">Survey unavailable</p>
              <p className="text-sm text-slate-500 mt-2">
                This survey is not currently active or the link is invalid. Please contact the team for an
                up-to-date link.
              </p>
            </div>
          )}

          {surveyQuery.isSuccess && survey && !isSuccess && (
            <div className="space-y-5">
              <p className="text-sm text-slate-700 font-medium">{survey.question}</p>

              <div>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                  {SCORES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScore(s)}
                      className={cn(
                        "h-10 rounded-lg border-2 text-sm font-semibold transition-all press-scale",
                        scoreClasses(s, score === s),
                      )}
                      aria-pressed={score === s}
                      aria-label={`Score ${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">What is the main reason for your score?</Label>
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {submitMutation.isError && (
                <p className="text-sm text-destructive" role="alert">
                  {getApiError(submitMutation.error) || "Failed to submit. Please try again."}
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
                  <>
                    <ThumbsUp className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          )}

          {isSuccess && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">Feedback received</p>
              <p className="text-sm text-slate-500">
                Thank you for taking the time to share your thoughts. We truly appreciate it.
              </p>
              {score !== null && score >= 9 && (
                <p className="text-sm text-slate-500 pt-1">
                  Loving the product? Pass it on — share your experience with a colleague.
                </p>
              )}
              {score !== null && score < 7 && (
                <p className="text-sm text-slate-500 pt-1">
                  We&rsquo;d love to make things better. Our team reviews every response and follows up on
                  what we can improve.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
