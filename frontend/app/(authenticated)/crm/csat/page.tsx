"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Star,
  Trash2,
  Play,
  Square,
  ClipboardList,
  MessageSquare,
  Radio,
  Eye,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyMailIllustration,
  EmptyLeaderboardIllustration,
} from "@/components/illustrations";
import {
  useCsatSurveys,
  useCsatSurveyResponses,
  useCre
  useUpdateCsatSurvey,
  useDeleteCsatSurvey,
  useClientAccounts,
  type CsatSurvey,
  type CsatResponse,
} from "@/hooks/api/crm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

type CsatStatus = CsatSurvey["status"];

const DEFAULT_QUESTION = "How satisfied are you with our service?";

const STATUS_CONFIG: Record<
  CsatStatus,
  { label: string; variant: "secondary" | "default" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Active", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
};

function scoreColor(scoreOutOf5: number): string {
  if (scoreOutOf5 >= 4) return "text-emerald-600";
  if (scoreOutOf5 >= 3) return "text-amber-600";
  return "text-red-600";
}

function barColor(scoreOutOf5: number): string {
  if (scoreOutOf5 >= 4) return "#10B981";
  if (scoreOutOf5 >= 3) return "#F59E0B";
  return "#EF4444";
}

function normalizeTo5(
  avg: number | null | undefined,
  scaleMax: number,
): number {
  if (avg === null || avg === undefined || scaleMax <= 0) return 0;
  return (avg / scaleMax) * 5;
}

function satisfiedThreshold(scaleMax: number): number {
  return Math.ceil(scaleMax * 0.8);
}

function CreateSurveyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [clientId, setClientId] = useState<string>("none");
  const [scaleMax, setScaleMax] = useState<string>("5");
  const create = useCreateCsatSurvey();
  const { data: clientData } = useClientAccounts({ limit: 100 });

  const handleClose = useCallback(() => {
    setTitle("");
    setQuestion(DEFAULT_QUESTION);
    setClientId("none");
    setScaleMax("5");
    onClose();
  }, [onClose]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose();
    },
    [handleClose],
  );

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleQuestionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setQuestion(e.target.value);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!title.trim() || !question.trim()) return;
    create.mutate(
      {
        title: title.trim(),
        question: question.trim(),
        clientId: clientId !== "none" ? Number(clientId) : undefined,
        scaleMax: Number(scaleMax),
      },
      {
        onSuccess: () => {
          toast.success("CSAT survey created");
          handleClose();
        },
        onError: () => toast.error("Failed to create survey"),
      },
    );
  }, [title, question, clientId, scaleMax, create, handleClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New CSAT Survey</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Post-onboarding satisfaction"
              value={title}
              onChange={handleTitleChange}
            />
          </div>
          <div className="space-y-1">
            <Label>Question *</Label>
            <Textarea
              rows={3}
              value={question}
              onChange={handleQuestionChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Rating scale</Label>
              <Select value={scaleMax} onValueChange={setScaleMax}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">1 – 5</SelectItem>
                  <SelectItem value="10">1 – 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Client (optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clientData?.accounts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={create.isPending || !title.trim() || !question.trim()}
          >
            {create.isPending ? "Creating…" : "Create Survey"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResponseRow({ r, scaleMax }: { r: CsatResponse; scaleMax: number }) {
  const norm = normalizeTo5(r.rating, scaleMax);
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white shrink-0"
            style={{ backgroundColor: barColor(norm) }}
          >
            {r.rating}
          </span>
          <span className="text-sm font-medium truncate">
            {r.respondentName ?? "Anonymous"}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {r.submittedAt ? format(new Date(r.submittedAt), "MMM d, yyyy") : ""}
        </span>
      </div>
      {r.comment && (
        <p className="text-xs text-muted-foreground mt-1.5">{r.comment}</p>
      )}
    </div>
  );
}

function SurveyDetailSheet({
  survey,
  onClose,
  onActivate,
  onCloseSurvey,
  isUpdating,
}: {
  survey: CsatSurvey;
  onClose: () => void;
  onActivate: () => void;
  onCloseSurvey: () => void;
  isUpdating: boolean;
}) {
  const {
    data: responses,
    isLoading,
    isError,
    refetch,
  } = useCsatSurveyResponses(survey.id);
  const scaleMax = survey.scaleMax;

  const stats = useMemo(() => {
    const list = responses ?? [];
    const total = list.length;
    const avg =
      total > 0 ? list.reduce((s, r) => s + r.rating, 0) / total : null;
    const threshold = satisfiedThreshold(scaleMax);
    const satisfied = list.filter((r) => r.rating >= threshold).length;
    const satisfactionRate =
      total > 0 ? Math.round((satisfied / total) * 100) : 0;
    const distribution = Array.from({ length: scaleMax }, (_, i) => {
      const rating = i + 1;
      return { rating, count: list.filter((r) => r.rating === rating).length };
    });
    return { total, avg, satisfactionRate, distribution };
  }, [responses, scaleMax]);

  const normAvg = normalizeTo5(stats.avg, scaleMax);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader className="px-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="truncate">{survey.title}</SheetTitle>
            <Badge
              variant={STATUS_CONFIG[survey.status].variant}
              className="text-[10px] shrink-0"
            >
              {STATUS_CONFIG[survey.status].label}
            </Badge>
          </div>
          <SheetDescription>{survey.question}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <LoadingState variant="list" rows={5} />
        ) : isError ? (
          <ErrorState onRetry={handleRetry} />
        ) : (
          <div className="space-y-5 py-2 flex-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums leading-none",
                    scoreColor(normAvg),
                  )}
                >
                  {stats.avg !== null ? stats.avg.toFixed(1) : "—"}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  Avg / {scaleMax}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums leading-none text-foreground">
                  {stats.satisfactionRate}%
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  Satisfied
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums leading-none text-foreground">
                  {stats.total}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  Responses
                </p>
              </div>
            </div>

            {stats.total > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Rating distribution</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={stats.distribution}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="rating"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={32}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        borderRadius: "0.5rem",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.distribution.map((d) => (
                        <Cell
                          key={d.rating}
                          fill={barColor(normalizeTo5(d.rating, scaleMax))}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                Responses ({stats.total})
              </h3>
              {stats.total === 0 ? (
                <EmptyState
                  illustration={<EmptyMailIllustration />}
                  title="No responses yet"
                  description="Activate the survey and collect customer feedback to see results here."
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {(responses ?? []).map((r) => (
                    <ResponseRow key={r.id} r={r} scaleMax={scaleMax} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <SheetFooter className="gap-2 sm:gap-2">
          {survey.status === "draft" && (
            <Button
              onClick={onActivate}
              disabled={isUpdating}
              className="gap-1.5"
            >
              <Play className="size-4" />
              Activate
            </Button>
          )}
          {survey.status === "sent" && (
            <Button
              variant="outline"
              onClick={onCloseSurvey}
              disabled={isUpdating}
              className="gap-1.5"
            >
              <Square className="size-4" />
              Close survey
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface SurveyTableRowProps {
  survey: CsatSurvey;
  isUpdating: boolean;
  onView: (survey: CsatSurvey) => void;
  onActivate: (survey: CsatSurvey) => void;
  onCloseSurvey: (survey: CsatSurvey) => void;
  onDelete: (survey: CsatSurvey) => void;
}

function SurveyTableRow({
  survey,
  isUpdating,
  onView,
  onActivate,
  onCloseSurvey,
  onDelete,
}: SurveyTableRowProps) {
  const norm = normalizeTo5(survey.avgRating, survey.scaleMax);

  const handleRowClick = useCallback(() => onView(survey), [onView, survey]);
  const handleCellClick = useCallback(
    (e: MouseEvent<HTMLTableCellElement>) => e.stopPropagation(),
    [],
  );
  const handleActivate = useCallback(
    () => onActivate(survey),
    [onActivate, survey],
  );
  const handleCloseSurveyClick = useCallback(
    () => onCloseSurvey(survey),
    [onCloseSurvey, survey],
  );
  const handleDelete = useCallback(() => onDelete(survey), [onDelete, survey]);

  return (
    <TableRow className="cursor-pointer" onClick={handleRowClick}>
      <TableCell className="max-w-[260px]">
        <p className="font-medium text-sm truncate">{survey.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {survey.question}
        </p>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {survey.client?.name ?? "—"}
      </TableCell>
      <TableCell>
        <Badge
          variant={STATUS_CONFIG[survey.status].variant}
          className="text-[10px]"
        >
          {STATUS_CONFIG[survey.status].label}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {survey.responseCount ?? 0}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn("text-sm font-semibold tabular-nums", scoreColor(norm))}
        >
          {survey.avgRating !== null && survey.avgRating !== undefined
            ? `${survey.avgRating.toFixed(1)}/${survey.scaleMax}`
            : "—"}
        </span>
      </TableCell>
      <TableCell className="text-right" onClick={handleCellClick}>
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleRowClick}
            aria-label="View responses"
            title="View responses"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {survey.status === "draft" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-emerald-600 hover:text-emerald-600"
              onClick={handleActivate}
              disabled={isUpdating}
              aria-label="Activate survey"
              title="Activate"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {survey.status === "sent" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleCloseSurveyClick}
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
            onClick={handleDelete}
            aria-label="Delete survey"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CsatPage() {
  const { data: surveys, isLoading, isError, refetch } = useCsatSurveys();
  const updateSurvey = useUpdateCsatSurvey();
  const deleteSurvey = useDeleteCsatSurvey();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<CsatSurvey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CsatSurvey | null>(null);

  const summary = useMemo(() => {
    const list = surveys ?? [];
    const totalResponses = list.reduce((s, x) => s + (x.responseCount ?? 0), 0);
    const active = list.filter((x) => x.status === "sent").length;
    const weighted = list.reduce(
      (acc, x) => {
        const count = x.responseCount ?? 0;
        if (x.avgRating === null || x.avgRating === undefined || count === 0)
          return acc;
        acc.sum += normalizeTo5(x.avgRating, x.scaleMax) * count;
        acc.count += count;
        return acc;
      },
      { sum: 0, count: 0 },
    );
    const avgScore = weighted.count > 0 ? weighted.sum / weighted.count : null;
    return { total: list.length, active, totalResponses, avgScore };
  }, [surveys]);

  const chartData = useMemo(
    () =>
      (surveys ?? [])
        .filter((s) => (s.responseCount ?? 0) > 0)
        .slice(0, 7)
        .map((s) => ({
          name: s.title.length > 16 ? `${s.title.slice(0, 16)}…` : s.title,
          responses: s.responseCount ?? 0,
          norm: normalizeTo5(s.avgRating, s.scaleMax),
        })),
    [surveys],
  );

  const handleToggleStatus = useCallback(
    (survey: CsatSurvey, status: "sent" | "closed") => {
      updateSurvey.mutate(
        { id: survey.id, status },
        {
          onSuccess: () =>
            toast.success(
              status === "sent" ? "Survey activated" : "Survey closed",
            ),
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

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleCloseDetail = useCallback(() => setDetailTarget(null), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleViewSurvey = useCallback(
    (survey: CsatSurvey) => setDetailTarget(survey),
    [],
  );
  const handleActivateSurvey = useCallback(
    (survey: CsatSurvey) => handleToggleStatus(survey, "sent"),
    [handleToggleStatus],
  );
  const handleCloseSurveyTable = useCallback(
    (survey: CsatSurvey) => handleToggleStatus(survey, "closed"),
    [handleToggleStatus],
  );
  const handleDeleteSurvey = useCallback(
    (survey: CsatSurvey) => setDeleteTarget(survey),
    [],
  );

  const handleDetailActivate = useCallback(() => {
    if (detailTarget) handleToggleStatus(detailTarget, "sent");
  }, [detailTarget, handleToggleStatus]);

  const handleDetailCloseSurvey = useCallback(() => {
    if (detailTarget) handleToggleStatus(detailTarget, "closed");
  }, [detailTarget, handleToggleStatus]);

  return (
    <PageWrapper
      title="CSAT Surveys"
      subtitle="Collect and track customer satisfaction across your accounts"
      actions={
        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
          <Plus className="size-4" />
          New Survey
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState variant="page" />
      ) : isError ? (
        <ErrorState
          title="Couldn't load CSAT surveys"
          description="An error occurred while loading surveys. Please try again."
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total Surveys"
              value={summary.total}
              icon={ClipboardList}
              color="blue"
              index={0}
            />
            <StatCard
              label="Active"
              value={summary.active}
              icon={Radio}
              color="green"
              index={1}
            />
            <StatCard
              label="Responses"
              value={summary.totalResponses}
              icon={MessageSquare}
              color="violet"
              index={2}
            />
            <StatCard
              label="Avg Score"
              value={
                summary.avgScore !== null
                  ? `${summary.avgScore.toFixed(1)} / 5`
                  : "—"
              }
              icon={Star}
              color="amber"
              index={3}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Responses by survey</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={32}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        borderRadius: "0.5rem",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="responses" radius={[4, 4, 0, 0]}>
                      {chartData.map((d) => (
                        <Cell key={d.name} fill={barColor(d.norm)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  No responses collected yet
                </div>
              )}
            </CardContent>
          </Card>

          {surveys && surveys.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Survey</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Responses</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.map((survey) => (
                      <SurveyTableRow
                        key={survey.id}
                        survey={survey}
                        isUpdating={updateSurvey.isPending}
                        onView={handleViewSurvey}
                        onActivate={handleActivateSurvey}
                        onCloseSurvey={handleCloseSurveyTable}
                        onDelete={handleDeleteSurvey}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-1 min-h-[40vh] items-center justify-center">
              <EmptyState
                illustration={<EmptyLeaderboardIllustration />}
                title="No CSAT surveys yet"
                description="Create a survey, activate it, and start measuring customer satisfaction."
                action={{ label: "New Survey", onClick: handleOpenCreate }}
              />
            </div>
          )}
        </div>
      )}

      <CreateSurveyDialog open={createOpen} onClose={handleCloseCreate} />

      {detailTarget && (
        <SurveyDetailSheet
          survey={detailTarget}
          isUpdating={updateSurvey.isPending}
          onActivate={handleDetailActivate}
          onCloseSurvey={handleDetailCloseSurvey}
          onClose={handleCloseDetail}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; and all its responses will be
              permanently deleted.
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
