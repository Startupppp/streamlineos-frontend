"use client";

import { parseISO } from "date-fns";
import { useState, useCallback, useMemo, memo } from "react";
import {
  useReviewCycles,
  useCreateReviewCycle,
  useUpdateReviewCycle,
  useDeleteReviewCycle,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, MoreHorizontal, Trash2, Pencil, Calendar, CheckCircle, Archive } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReviewCycle } from "@/types/hr";

function getCycleProgress(cycle: ReviewCycle): number {
  if (cycle.status === "COMPLETED") return 100;
  if (cycle.status === "DRAFT" || cycle.status === "CANCELLED") return 0;
  if (!cycle.periodStart || !cycle.periodEnd) return 0;
  const start = new Date(cycle.periodStart).getTime();
  const end = new Date(cycle.periodEnd).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

const CycleHeaderStats = memo(function CycleHeaderStats({
  total,
  active,
  completed,
}: {
  total: number;
  active: number;
  completed: number;
}) {
  return (
    <StatCardGrid cols={3} className="flex-1 min-w-0">
      <StatCard label="Total Cycles" value={total} icon={Calendar} tone="blue" />
      <StatCard label="Active" value={active} icon={CheckCircle} tone="emerald" />
      <StatCard label="Completed" value={completed} icon={Archive} tone="default" />
    </StatCardGrid>
  );
});

export function CyclesTab() {
  const { data: cycles, isLoading } = useReviewCycles();
  const createCycle = useCreateReviewCycle();
  const updateCycle = useUpdateReviewCycle();
  const deleteCycle = useDeleteReviewCycle();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<ReviewCycle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("QUARTERLY");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [deadline, setDeadline] = useState("");

  const openCreate = useCallback(() => {
    setEditCycle(null);
    setName(""); setType("QUARTERLY"); setPeriodStart(""); setPeriodEnd(""); setDeadline("");
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((cycle: ReviewCycle) => {
    setEditCycle(cycle);
    setName(cycle.name ?? "");
    setType(cycle.type ?? "QUARTERLY");
    setPeriodStart(cycle.periodStart ?? "");
    setPeriodEnd(cycle.periodEnd ?? "");
    setDeadline(cycle.deadline ?? "");
    setSheetOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("Cycle name is required"); return; }
    if (trimmedName.length < 3) { toast.error("Cycle name must be at least 3 characters"); return; }
    if (trimmedName.length > 100) { toast.error("Cycle name must be at most 100 characters"); return; }
    if (!/[a-zA-Z0-9]/.test(trimmedName)) { toast.error("Cycle name must contain at least one letter or number"); return; }
    if (/\s{2,}/.test(trimmedName)) { toast.error("Cycle name cannot have consecutive spaces"); return; }
    if (!periodStart) { toast.error("Period start date is required"); return; }
    if (!editCycle) {
      const today = new Date().toISOString().slice(0, 10);
      if (periodStart < today) { toast.error("Period start date cannot be earlier than today"); return; }
    }
    if (!periodEnd) { toast.error("Period end date is required"); return; }
    if (periodEnd <= periodStart) { toast.error("Period end must be after period start"); return; }
    if (periodStart === periodEnd) { toast.error("Period start and end dates cannot be the same"); return; }
    if (!deadline) { toast.error("Submission deadline is required"); return; }
    if (deadline <= periodEnd) { toast.error("Submission deadline must be after period end"); return; }
    if (editCycle) {
      updateCycle.mutate(
        { id: editCycle.id, name: trimmedName, type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => { toast.success("Cycle updated"); setSheetOpen(false); setEditCycle(null); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createCycle.mutate(
        { name: trimmedName, type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => {
            toast.success("Cycle created");
            setSheetOpen(false);
            setName(""); setPeriodStart(""); setPeriodEnd(""); setDeadline("");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [name, type, periodStart, periodEnd, deadline, editCycle, createCycle, updateCycle]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteCycle.mutate(deleteId, {
      onSuccess: () => { toast.success("Cycle deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteCycle]);

  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handlePeriodStartChange = useCallback((value: string) => setPeriodStart(value), []);
  const handlePeriodEndChange = useCallback((value: string) => setPeriodEnd(value), []);
  const handleDeadlineChange = useCallback((value: string) => setDeadline(value), []);

  const cycleStats = useMemo(() => {
    const list = cycles ?? [];
    return {
      total: list.length,
      active: list.filter((c: ReviewCycle) => c.status === "ACTIVE").length,
      completed: list.filter((c: ReviewCycle) => c.status === "COMPLETED").length,
    };
  }, [cycles]);

  if (isLoading) {
    return <LoadingState variant="list" rows={12} />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between shrink-0 gap-3 flex-wrap">
        <CycleHeaderStats
          total={cycleStats.total}
          active={cycleStats.active}
          completed={cycleStats.completed}
        />
        <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />New Cycle
        </Button>
      </div>

      {!cycles?.length ? (
        <EmptyState
          illustrationPreset="calendar"
          title="No review cycles yet"
          description="Create a quarterly or annual cycle to structure your performance reviews."
          action={{ label: "New Cycle", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-2">
          {cycles.map((cycle: ReviewCycle) => {
            const progress = getCycleProgress(cycle);
            const accentClass =
              cycle.status === "ACTIVE"
                ? "border-l-emerald-500"
                : cycle.status === "COMPLETED"
                ? "border-l-blue-500"
                : cycle.status === "CANCELLED"
                ? "border-l-rose-400"
                : "border-l-border";
            const badgeClass =
              cycle.status === "ACTIVE"
                ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                : cycle.status === "COMPLETED"
                ? "border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                : cycle.status === "CANCELLED"
                ? "border-rose-200 bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                : "border-border bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
            const progressBarClass =
              cycle.status === "ACTIVE"
                ? "bg-emerald-500"
                : cycle.status === "COMPLETED"
                ? "bg-blue-500"
                : cycle.status === "CANCELLED"
                ? "bg-rose-400"
                : "bg-muted-foreground/30";

            return (
              <Card
                key={cycle.id}
                className={`rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 transition-shadow duration-200 hover:shadow-md ${accentClass}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{cycle.name}</p>
                        <Badge className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {cycle.status ?? "DRAFT"}
                        </Badge>
                        {cycle.type && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700">
                            {cycle.type.replace("_", " ")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {cycle.periodStart} → {cycle.periodEnd}
                        {cycle.deadline && <> &middot; Deadline: {cycle.deadline}</>}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Completion</span>
                          <span className="text-[10px] font-semibold text-foreground">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${progressBarClass}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-200">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(cycle)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(cycle.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) { setEditCycle(null); setName(""); setType("QUARTERLY"); setPeriodStart(""); setPeriodEnd(""); setDeadline(""); } setSheetOpen(open); }} title={editCycle ? "Edit Review Cycle" : "Create Review Cycle"} onSubmit={handleCreate} submitLabel={editCycle ? "Save Changes" : "Create"} isPending={createCycle.isPending || updateCycle.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cycle Name</label>
          <Input placeholder="e.g., Q2 2026 Review" value={name} onChange={handleNameChange} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              <SelectItem value="QUARTERLY">Quarterly — 3-month cycle</SelectItem>
              <SelectItem value="HALF_YEARLY">Half-Yearly — 6-month cycle</SelectItem>
              <SelectItem value="ANNUAL">Annual — Full-year cycle</SelectItem>
              <SelectItem value="CUSTOM">Custom — Define your own period</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {type === "QUARTERLY" && "3-month performance review. Best for fast-paced teams that need frequent check-ins and course corrections."}
            {type === "HALF_YEARLY" && "6-month review cycle. Provides a balanced mid-year checkpoint for goal progress and development feedback."}
            {type === "ANNUAL" && "Comprehensive year-end evaluation covering overall performance, growth, and compensation decisions."}
            {type === "CUSTOM" && "Flexible review period tailored to your team's schedule. Define any start/end dates and deadline that fits your workflow."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <DatePicker value={periodStart ?? ""} onChange={handlePeriodStartChange} placeholder="Pick a date" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <DatePicker value={periodEnd ?? ""} onChange={handlePeriodEndChange} fromDate={periodStart ? parseISO(periodStart) : undefined} placeholder="Pick a date" className="h-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Submission Deadline</label>
          <DatePicker value={deadline ?? ""} onChange={handleDeadlineChange} fromDate={periodEnd ? parseISO(periodEnd) : undefined} placeholder="Pick a date" className="h-8 text-sm" />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Review Cycle"
        description="Are you sure you want to delete this review cycle? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        isPending={deleteCycle.isPending}
      />
    </div>
  );
}
