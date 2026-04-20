"use client";

import { useState, useCallback } from "react";
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  Trophy,
  Pencil,
  Trash2,
  Loader2,
  Users,
  BarChart2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useAbTests,
  useCreateAbTest,
  useUpdateAbTest,
  useDeleteAbTest,
} from "@/lib/api/hooks/marketing";
import type { AbTest } from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";


function calcOpenRate(opens: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.round((opens / sent) * 100 * 10) / 10;
}

function calcClickRate(clicks: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.round((clicks / sent) * 100 * 10) / 10;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "\u2014";
  }
}


const STATUS_BADGE: Record<
  AbTest["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  running: { label: "Running", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  paused: { label: "Paused", variant: "secondary" },
};


function ComparisonBar({
  label,
  rate,
  maxRate,
  isWinner,
}: {
  label: string;
  rate: number;
  maxRate: number;
  isWinner: boolean;
}) {
  const pct = maxRate > 0 ? (rate / maxRate) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-medium",
            isWinner ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "tabular-nums font-semibold",
            isWinner ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          )}
        >
          {rate}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isWinner ? "bg-amber-500" : "bg-primary/50"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}


interface TestCardProps {
  test: AbTest;
  onEdit: (test: AbTest) => void;
  onStart: (test: AbTest) => void;
  onStop: (test: AbTest) => void;
  onDeclareWinner: (test: AbTest) => void;
  onDelete: (id: number) => void;
}

function TestCard({ test, onEdit, onStart, onStop, onDeclareWinner, onDelete }: TestCardProps) {
  const badge = STATUS_BADGE[test.status] ?? STATUS_BADGE.draft;
  const openRateA = calcOpenRate(test.variantAOpens, test.variantASent);
  const openRateB = calcOpenRate(test.variantBOpens, test.variantBSent);
  const clickRateA = calcClickRate(test.variantAClicks, test.variantASent);
  const clickRateB = calcClickRate(test.variantBClicks, test.variantBSent);
  const maxOpenRate = Math.max(openRateA, openRateB, 0.1);
  const maxClickRate = Math.max(clickRateA, clickRateB, 0.1);
  const showMetrics =
    test.status === "running" || test.status === "completed" || test.status === "paused";

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">{test.name}</p>
            {test.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{test.description}</p>
            )}
          </div>
          <Badge variant={badge.variant} className="shrink-0 text-[10px]">
            {badge.label}
          </Badge>
        </div>
      </div>

      <div className="px-4 py-3 space-y-1 border-b border-border/60">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 shrink-0 w-4">
            A:
          </span>
          <p className="text-xs text-foreground truncate">{test.variantASubject}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-blue shrink-0 w-4">
            B:
          </span>
          <p className="text-xs text-foreground truncate">{test.variantBSubject}</p>
        </div>
      </div>

      {showMetrics && (
        <div className="px-4 py-3 space-y-3 border-b border-border/60">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Open Rate
            </p>
            <ComparisonBar
              label="A"
              rate={openRateA}
              maxRate={maxOpenRate}
              isWinner={test.winnerVariant === "A"}
            />
            <ComparisonBar
              label="B"
              rate={openRateB}
              maxRate={maxOpenRate}
              isWinner={test.winnerVariant === "B"}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Click Rate
            </p>
            <ComparisonBar
              label="A"
              rate={clickRateA}
              maxRate={maxClickRate}
              isWinner={test.winnerVariant === "A"}
            />
            <ComparisonBar
              label="B"
              rate={clickRateB}
              maxRate={maxClickRate}
              isWinner={test.winnerVariant === "B"}
            />
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground border-b border-border/60">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {test.audienceSize.toLocaleString()} recipients
        </span>
        <span className="flex items-center gap-1">
          <BarChart2 className="h-3 w-3" />
          {test.splitPercent}/{100 - test.splitPercent} split
        </span>
        {test.startedAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Started {formatDate(test.startedAt)}
          </span>
        )}
        {test.endedAt && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ended {formatDate(test.endedAt)}
          </span>
        )}
        {test.winnerVariant && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
            <Trophy className="h-3 w-3" />
            Variant {test.winnerVariant} wins
          </span>
        )}
      </div>

      <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => onEdit(test)}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        {test.status === "draft" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-emerald-600"
            onClick={() => onStart(test)}
          >
            <Play className="h-3 w-3" />
            Start
          </Button>
        )}
        {test.status === "running" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-amber-600"
              onClick={() => onStop(test)}
            >
              <Pause className="h-3 w-3" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-blue"
              onClick={() => onDeclareWinner(test)}
            >
              <Trophy className="h-3 w-3" />
              Declare Winner
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-destructive ml-auto"
          onClick={() => onDelete(test.id)}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}


const EMPTY_FORM = {
  name: "",
  description: "",
  variantASubject: "",
  variantBSubject: "",
  variantABody: "",
  variantBBody: "",
  splitPercent: 50,
  audienceSize: 0,
};


export default function AbTestingPage() {
  const { data, isLoading } = useAbTests();
  const createTest = useCreateAbTest();
  const updateTest = useUpdateAbTest();
  const deleteTest = useDeleteAbTest();

  const tests: AbTest[] = data?.tests ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<AbTest | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [winnerTestId, setWinnerTestId] = useState<number | null>(null);

  const totalTests = tests.length;
  const runningTests = tests.filter((t) => t.status === "running").length;
  const completedTests = tests.filter((t) => t.status === "completed").length;
  const avgOpenRate = (() => {
    const withData = tests.filter((t) => t.audienceSize > 0);
    if (withData.length === 0) return 0;
    const total = withData.reduce((sum, t) => {
      const rateA = calcOpenRate(t.variantAOpens, t.variantASent);
      const rateB = calcOpenRate(t.variantBOpens, t.variantBSent);
      return sum + Math.max(rateA, rateB);
    }, 0);
    return Math.round((total / withData.length) * 10) / 10;
  })();

  const openCreateSheet = useCallback(() => {
    setEditingTest(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }, []);

  const openEditSheet = useCallback((test: AbTest) => {
    setEditingTest(test);
    setForm({
      name: test.name,
      description: test.description ?? "",
      variantASubject: test.variantASubject,
      variantBSubject: test.variantBSubject,
      variantABody: test.variantABody ?? "",
      variantBBody: test.variantBBody ?? "",
      splitPercent: test.splitPercent,
      audienceSize: test.audienceSize,
    });
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.variantASubject.trim()) { toast.error("Variant A subject is required"); return; }
    if (!form.variantBSubject.trim()) { toast.error("Variant B subject is required"); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      variantASubject: form.variantASubject.trim(),
      variantBSubject: form.variantBSubject.trim(),
      variantABody: form.variantABody.trim() || undefined,
      variantBBody: form.variantBBody.trim() || undefined,
      splitPercent: form.splitPercent,
      audienceSize: form.audienceSize,
    };

    if (editingTest) {
      updateTest.mutate(
        { id: editingTest.id, ...payload },
        {
          onSuccess: () => { toast.success("A/B test updated"); setSheetOpen(false); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createTest.mutate(payload, {
        onSuccess: () => { toast.success("A/B test created"); setSheetOpen(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [form, editingTest, createTest, updateTest]);

  const handleStart = useCallback(
    (test: AbTest) => {
      updateTest.mutate(
        { id: test.id, status: "running" },
        {
          onSuccess: () => toast.success("Test started"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateTest]
  );

  const handleStop = useCallback(
    (test: AbTest) => {
      updateTest.mutate(
        { id: test.id, status: "paused" },
        {
          onSuccess: () => toast.success("Test paused"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateTest]
  );

  const handleDeclareWinner = useCallback((test: AbTest) => {
    setWinnerTestId(test.id);
  }, []);

  const confirmWinner = useCallback(
    (variant: "A" | "B") => {
      if (!winnerTestId) return;
      updateTest.mutate(
        { id: winnerTestId, winnerVariant: variant, status: "completed" },
        {
          onSuccess: () => {
            toast.success(`Variant ${variant} declared winner`);
            setWinnerTestId(null);
          },
          onError: (e) => {
            toast.error(getErrorMessage(e));
            setWinnerTestId(null);
          },
        }
      );
    },
    [winnerTestId, updateTest]
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteTest.mutate(deleteId, {
      onSuccess: () => { toast.success("A/B test deleted"); setDeleteId(null); },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteId(null); },
    });
  }, [deleteId, deleteTest]);

  const isPending = createTest.isPending || updateTest.isPending;

  return (
    <PageWrapper
      title="A/B Testing"
      subtitle="Compare email subject lines and content variants to find what resonates"
      actions={
        <Button size="sm" className="gap-1.5" onClick={openCreateSheet}>
          <Plus className="h-4 w-4" />
          New A/B Test
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Tests" value={totalTests} icon={FlaskConical} color="gold" index={0} />
          <StatCard label="Running Tests" value={runningTests} icon={Play} color="green" index={1} />
          <StatCard label="Completed Tests" value={completedTests} icon={CheckCircle2} color="blue" index={2} />
          <StatCard label="Avg Open Rate" value={`${avgOpenRate}%`} icon={BarChart2} color="purple" index={3} />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 h-48 animate-pulse" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            illustration={<EmptyTargetIllustration className="h-40 w-40" />}
            title="No A/B Tests Yet"
            description="Create your first A/B test to start comparing email variants and optimizing open rates."
            action={{ label: "New A/B Test", onClick: openCreateSheet }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onEdit={openEditSheet}
                onStart={handleStart}
                onStop={handleStop}
                onDeclareWinner={handleDeclareWinner}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        )}
      </div>

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingTest ? "Edit A/B Test" : "New A/B Test"}
        description={
          editingTest
            ? "Update test details and variants."
            : "Set up two variants to compare and find the best performer."
        }
        onSubmit={handleSubmit}
        submitLabel={editingTest ? "Save Changes" : "Create Test"}
        isPending={isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ab-name">Test Name</Label>
            <Input
              id="ab-name"
              placeholder="e.g. Welcome email subject test"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ab-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="ab-description"
              placeholder="What are you testing and why?"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ab-subject-a">Variant A &mdash; Subject Line</Label>
            <Input
              id="ab-subject-a"
              placeholder="Subject line for variant A"
              value={form.variantASubject}
              onChange={(e) => setForm((f) => ({ ...f, variantASubject: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ab-subject-b">Variant B &mdash; Subject Line</Label>
            <Input
              id="ab-subject-b"
              placeholder="Subject line for variant B"
              value={form.variantBSubject}
              onChange={(e) => setForm((f) => ({ ...f, variantBSubject: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ab-body-a">
              Variant A &mdash; Body <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="ab-body-a"
              placeholder="Email body for variant A"
              rows={3}
              value={form.variantABody}
              onChange={(e) => setForm((f) => ({ ...f, variantABody: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ab-body-b">
              Variant B &mdash; Body <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="ab-body-b"
              placeholder="Email body for variant B"
              rows={3}
              value={form.variantBBody}
              onChange={(e) => setForm((f) => ({ ...f, variantBBody: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ab-split">Variant A Split %</Label>
              <Input
                id="ab-split"
                type="number"
                min={1}
                max={99}
                placeholder="50"
                value={form.splitPercent}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    splitPercent: Math.max(1, Math.min(99, Number(e.target.value) || 50)),
                  }))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Variant B gets {100 - form.splitPercent}%
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ab-audience">Audience Size</Label>
              <Input
                id="ab-audience"
                type="number"
                min={0}
                placeholder="0"
                value={form.audienceSize}
                onChange={(e) =>
                  setForm((f) => ({ ...f, audienceSize: Math.max(0, Number(e.target.value) || 0) }))
                }
              />
            </div>
          </div>
        </div>
      </HrSheet>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete A/B Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteTest.isPending}
            >
              {deleteTest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={winnerTestId !== null}
        onOpenChange={(open) => { if (!open) setWinnerTestId(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Declare Winner</DialogTitle>
            <DialogDescription>
              Which variant performed better? This will mark the test as completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 pt-2">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => confirmWinner("A")}
              disabled={updateTest.isPending}
            >
              {updateTest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-1.5" />
                  A Wins
                </>
              )}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => confirmWinner("B")}
              disabled={updateTest.isPending}
            >
              {updateTest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-1.5" />
                  B Wins
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
