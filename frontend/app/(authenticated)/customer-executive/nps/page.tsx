"use client";

import { useCallback, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Plus,
  Gauge,
  Trash2,
  Link2,
  Check,
  Play,
  Square,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyMailIllustration,
  EmptyLeaderboardIllustration,
} from "@/components/illustrations";
import {
  useNpsSurveys,
  useNpsStats,
  useNpsSurvey,
  useCreateNpsSurvey,
  useUpdateNpsSurvey,
  useDeleteNpsSurvey,
  type NpsSurvey,
  type NpsSurveyStatus,
} from "@/lib/api/hooks/crm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_CONFIG: Record<NpsSurveyStatus, { label: string; variant: "secondary" | "default" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
};

const CATEGORY_COLORS = {
  promoter: "#10B981",
  passive: "#F59E0B",
  detractor: "#EF4444",
} as const;

const CATEGORY_LABELS = {
  promoter: "Promoters",
  passive: "Passives",
  detractor: "Detractors",
} as const;

function npsColor(score: number): string {
  if (score >= 50) return "text-emerald-600";
  if (score >= 0) return "text-amber-600";
  return "text-red-600";
}

function CreateSurveyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("How likely are you to recommend us to a friend or colleague?");
  const create = useCreateNpsSurvey();

  const handleClose = useCallback(() => {
    setTitle("");
    setQuestion("How likely are you to recommend us to a friend or colleague?");
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (!title.trim() || !question.trim()) return;
    create.mutate(
      { title: title.trim(), question: question.trim() },
      {
        onSuccess: () => {
          toast.success("NPS survey created");
          handleClose();
        },
        onError: () => toast.error("Failed to create survey"),
      },
    );
  }, [title, question, create, handleClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New NPS Survey</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Q3 Customer NPS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Question *</Label>
            <Textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={create.isPending || !title.trim() || !question.trim()}>
            {create.isPending ? "Creating…" : "Create Survey"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SurveyDetailSheet({ surveyId, onClose }: { surveyId: number; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useNpsSurvey(surveyId);

  const chartData = useMemo(() => {
    if (!data) return [];
    return (
      [
        { key: "promoter" as const, value: data.breakdown.promoters },
        { key: "passive" as const, value: data.breakdown.passives },
        { key: "detractor" as const, value: data.breakdown.detractors },
      ] as const
    ).filter((d) => d.value > 0);
  }, [data]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-0">
          <SheetTitle>{data?.survey.title ?? "Survey"}</SheetTitle>
          <SheetDescription>{data?.survey.question}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <LoadingState variant="list" rows={5} />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className={cn("text-3xl font-bold tabular-nums", npsColor(data.nps))}>{data.nps}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">NPS</p>
              </div>
              {chartData.length > 0 && (
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2} dataKey="value">
                      {chartData.map((d) => (
                        <Cell key={d.key} fill={CATEGORY_COLORS[d.key]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", fontSize: "0.75rem" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="space-y-1 text-xs">
                {(["promoter", "passive", "detractor"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
                    <span className="text-muted-foreground">{CATEGORY_LABELS[key]}</span>
                    <span className="font-medium tabular-nums">
                      {key === "promoter" ? data.breakdown.promoters : key === "passive" ? data.breakdown.passives : data.breakdown.detractors}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Responses ({data.responses.length})</h3>
              {data.responses.length === 0 ? (
                <EmptyState
                  illustration={<EmptyMailIllustration />}
                  title="No responses yet"
                  description="Share the public link to start collecting feedback."
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {data.responses.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[r.category] }}
                          >
                            {r.score}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {r.respondentName ?? "Anonymous"}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : ""}
                        </span>
                      </div>
                      {r.comment && <p className="text-xs text-muted-foreground mt-1.5">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SurveyRow({
  survey,
  onCopyLink,
  copied,
  onToggleStatus,
  onView,
  onDelete,
  isUpdating,
}: {
  survey: NpsSurvey;
  onCopyLink: (survey: NpsSurvey) => void;
  copied: boolean;
  onToggleStatus: (survey: NpsSurvey, status: NpsSurveyStatus) => void;
  onView: (survey: NpsSurvey) => void;
  onDelete: (survey: NpsSurvey) => void;
  isUpdating: boolean;
}) {
  const cfg = STATUS_CONFIG[survey.status];
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={() => onView(survey)} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{survey.title}</p>
              <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{survey.question}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="h-3 w-3 text-emerald-600" />
                {survey.promoters}
              </span>
              <span className="inline-flex items-center gap-1">
                <Minus className="h-3 w-3 text-amber-600" />
                {survey.passives}
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsDown className="h-3 w-3 text-red-600" />
                {survey.detractors}
              </span>
              <span>{survey.responseCount} responses</span>
            </div>
          </button>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={cn("text-xl font-bold tabular-nums", npsColor(survey.nps))}>
              {survey.responseCount > 0 ? survey.nps : "—"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onCopyLink(survey)}
                aria-label="Copy public link"
                title="Copy public link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
              </Button>
              {survey.status !== "active" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-600"
                  onClick={() => onToggleStatus(survey, "active")}
                  disabled={isUpdating}
                  aria-label="Activate survey"
                  title="Activate"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onToggleStatus(survey, "closed")}
                  disabled={isUpdating}
                  aria-label="Close survey"
                  title="Close"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(survey)}
                aria-label="Delete survey"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NpsPage() {
  const { data: surveys, isLoading, isError, refetch } = useNpsSurveys();
  const { data: stats } = useNpsStats();
  const updateSurvey = useUpdateNpsSurvey();
  const deleteSurvey = useDeleteNpsSurvey();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<NpsSurvey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NpsSurvey | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const overall = stats?.breakdown ?? { promoters: 0, passives: 0, detractors: 0, total: 0 };
  const overallNps = stats?.nps ?? 0;

  const overallChart = useMemo(
    () =>
      (
        [
          { key: "promoter" as const, value: overall.promoters },
          { key: "passive" as const, value: overall.passives },
          { key: "detractor" as const, value: overall.detractors },
        ] as const
      ).filter((d) => d.value > 0),
    [overall.promoters, overall.passives, overall.detractors],
  );

  const handleCopyLink = useCallback((survey: NpsSurvey) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/nps/${survey.publicToken}`).then(() => {
      setCopiedId(survey.id);
      toast.success("Public link copied");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const handleToggleStatus = useCallback(
    (survey: NpsSurvey, status: NpsSurveyStatus) => {
      updateSurvey.mutate(
        { id: survey.id, status },
        {
          onSuccess: () => toast.success(status === "active" ? "Survey activated" : "Survey closed"),
          onError: () => toast.error("Failed to update survey"),
        },
      );
    },
    [updateSurvey],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteSurvey.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Survey deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete survey"),
    });
  }, [deleteTarget, deleteSurvey]);

  return (
    <PageWrapper
      title="NPS Surveys"
      subtitle="Measure customer loyalty and close the loop on detractor feedback"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          New Survey
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState variant="page" />
      ) : isError ? (
        <ErrorState
          title="Couldn't load NPS surveys"
          description="An error occurred while loading surveys. Please try again."
          onRetry={() => refetch()}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Overall NPS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <div className="text-center shrink-0">
                    <p className={cn("text-5xl font-bold tabular-nums leading-none", npsColor(overallNps))}>
                      {overall.total > 0 ? overallNps : "—"}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">
                      {stats?.activeSurveys ?? 0} active {(stats?.activeSurveys ?? 0) === 1 ? "survey" : "surveys"}
                    </p>
                  </div>
                  {overallChart.length > 0 ? (
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie data={overallChart} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value">
                          {overallChart.map((d) => (
                            <Cell key={d.key} fill={CATEGORY_COLORS[d.key]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", fontSize: "0.75rem" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[130px] flex-1 items-center justify-center text-xs text-muted-foreground">
                      No responses on active surveys yet
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {(["promoter", "passive", "detractor"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
                      <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[key]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-7 grid grid-cols-2 gap-3 sm:grid-cols-3 content-start">
              <StatCard label="Promoters" value={overall.promoters} icon={ThumbsUp} color="green" index={0} />
              <StatCard label="Passives" value={overall.passives} icon={Minus} color="amber" index={1} />
              <StatCard label="Detractors" value={overall.detractors} icon={ThumbsDown} color="red" index={2} />
            </div>
          </div>

          {surveys && surveys.length > 0 ? (
            <div className="space-y-3">
              {surveys.map((survey) => (
                <SurveyRow
                  key={survey.id}
                  survey={survey}
                  copied={copiedId === survey.id}
                  onCopyLink={handleCopyLink}
                  onToggleStatus={handleToggleStatus}
                  onView={setDetailTarget}
                  onDelete={setDeleteTarget}
                  isUpdating={updateSurvey.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 min-h-[40vh] items-center justify-center">
              <EmptyState
                illustration={<EmptyLeaderboardIllustration />}
                title="No NPS surveys yet"
                description="Create a survey, activate it, and share the public link to start measuring loyalty."
                action={{ label: "New Survey", onClick: () => setCreateOpen(true) }}
              />
            </div>
          )}
        </div>
      )}

      <CreateSurveyDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {detailTarget && (
        <SurveyDetailSheet surveyId={detailTarget.id} onClose={() => setDetailTarget(null)} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; and all its responses will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteSurvey.isPending}
            >
              {deleteSurvey.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
