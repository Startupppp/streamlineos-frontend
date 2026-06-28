"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useEnpsScores, useSubmitEnpsScore, type EnpsScore } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ThumbsUp, MessageSquare, EyeOff, User, TrendingUp, AlertCircle } from "lucide-react";
import { useAbility } from "@/lib/abilities-context";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function getScoreMeta(score: number): { label: string; badge: string } {
  if (score >= 9) return {
    label: "Promoter",
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
  };
  if (score >= 7) return {
    label: "Passive",
    badge: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
  };
  return {
    label: "Detractor",
    badge: "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
  };
}

function getEnpsColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 50) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 0) return "text-amber-700 dark:text-amber-400";
  return "text-rose-700 dark:text-rose-400";
}

export default function EnpsPage() {
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:performance");

  const { data: scores, isLoading, isError, refetch } = useEnpsScores(isAdmin);
  const submit = useSubmitEnpsScore();
  const handleRefetch = useCallback(() => { void refetch(); }, [refetch]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [npsScore, setNpsScore] = useState("8");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  const resetForm = useCallback(() => { setNpsScore("8"); setComment(""); setIsAnonymous(true); }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleNpsScoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNpsScore(e.target.value), []);
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value), []);

  const handleSubmit = useCallback(() => {
    const numScore = Number(npsScore);
    if (!Number.isInteger(numScore) || numScore < 0 || numScore > 10) {
      toast.error("Score must be a whole number between 0 and 10"); return;
    }
    submit.mutate(
      { score: numScore, comment: comment.trim() || undefined, isAnonymous },
      {
        onSuccess: () => {
          toast.success("eNPS response submitted"); setSheetOpen(false); resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [npsScore, comment, isAnonymous, submit, resetForm]);

  const promoters = (scores ?? []).filter((s) => s.score >= 9).length;
  const passives = (scores ?? []).filter((s) => s.score >= 7 && s.score < 9).length;
  const detractors = (scores ?? []).filter((s) => s.score <= 6).length;
  const total = scores?.length ?? 0;
  const enpsValue = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;

  if (isLoading) {
    return (
      <PageWrapper title="Employee NPS" subtitle="Measure employee loyalty">
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Employee NPS" subtitle="Measure employee loyalty">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load eNPS data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefetch}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee NPS"
      subtitle="Measure and track employee Net Promoter Score"
      badge={enpsValue !== null ? `Score: ${enpsValue > 0 ? "+" : ""}${enpsValue}` : `${total} responses`}
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          Submit Score
        </Button>
      }
    >
      <div className="space-y-4">
        {total > 0 && (
          <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="grid gap-6 sm:grid-cols-[1fr_auto] items-center">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      eNPS Score
                    </p>
                    <div className="flex items-end gap-2">
                      <span className={cn("text-5xl font-bold tabular-nums", getEnpsColor(enpsValue))}>
                        {enpsValue !== null ? (enpsValue > 0 ? `+${enpsValue}` : enpsValue) : "—"}
                      </span>
                      <span className="text-sm text-muted-foreground mb-2">/ 100</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Based on {total} response{total !== 1 ? "s" : ""}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Promoters (9–10)</span>
                        <span className="font-semibold tabular-nums">{promoters}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: total > 0 ? `${(promoters / total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-700 dark:text-amber-400 font-medium">Passives (7–8)</span>
                        <span className="font-semibold tabular-nums">{passives}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-500"
                          style={{ width: total > 0 ? `${(passives / total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-700 dark:text-rose-400 font-medium">Detractors (0–6)</span>
                        <span className="font-semibold tabular-nums">{detractors}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-500"
                          style={{ width: total > 0 ? `${(detractors / total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col gap-3">
                  {[
                    { label: "Promoters", count: promoters, color: "text-emerald-700 dark:text-emerald-400" },
                    { label: "Passives", count: passives, color: "text-amber-700 dark:text-amber-400" },
                    { label: "Detractors", count: detractors, color: "text-rose-700 dark:text-rose-400" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="text-center min-w-[72px]">
                      <p className={cn("text-3xl font-bold tabular-nums", color)}>{count}</p>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!scores?.length ? (
          <EmptyState
            illustration={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
            title="No eNPS responses yet"
            description="Submit your score to start measuring employee sentiment."
            action={{ label: "Submit Score", onClick: handleOpenSheet }}
          />
        ) : isAdmin ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scores.map((s: EnpsScore) => {
              const { label, badge } = getScoreMeta(s.score);
              return (
                <Card
                  key={s.id}
                  className={cn(
                    "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
                    "border-l-4 transition-shadow duration-200 hover:shadow-md",
                    s.score >= 9 ? "border-l-emerald-500" : s.score >= 7 ? "border-l-amber-500" : "border-l-rose-500",
                  )}
                >
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        s.score >= 9 ? "text-emerald-700 dark:text-emerald-400" :
                        s.score >= 7 ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400",
                        "text-3xl font-bold tabular-nums",
                      )}>
                        {s.score}
                        <span className="text-sm font-normal text-muted-foreground">/10</span>
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        badge,
                      )}>
                        {label}
                      </span>
                    </div>

                    {s.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1.5">
                        <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                        {s.comment}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {s.isAnonymous ? <EyeOff className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      <span>{s.isAnonymous ? "Anonymous" : "Named"}</span>
                      <span>·</span>
                      <span>{s.period}</span>
                      {s.createdAt && (
                        <>
                          <span>·</span>
                          <span>{format(new Date(s.createdAt), "MMM d")}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <CardContent className="py-10 text-center">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-3">
                <ThumbsUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Thank you for participating!</p>
              <p className="text-xs text-muted-foreground mt-1">Your responses are submitted anonymously.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Submit eNPS Score"
        onSubmit={handleSubmit}
        submitLabel="Submit"
        isPending={submit.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            How likely are you to recommend this company as a place to work? (0–10) <span className="text-destructive">*</span>
          </label>
          <Input type="number" min={0} max={10} step={1} value={npsScore} onChange={handleNpsScoreChange} />
          <p className="text-xs text-muted-foreground">0 = Not at all likely · 10 = Extremely likely</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">What&apos;s the main reason for your score? (optional)</label>
          <Textarea
            placeholder="Share your thoughts..."
            value={comment}
            onChange={handleCommentChange}
            rows={3}
            maxLength={500}
            className="resize-none w-full"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Submit anonymously</p>
            <p className="text-xs text-muted-foreground">Your name won&apos;t be attached to this response</p>
          </div>
          <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
