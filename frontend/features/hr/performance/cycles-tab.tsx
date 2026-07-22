"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { Plus, Trash2, Pencil, Calendar, CheckCircle, Archive } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReviewCycle } from "@/types/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cycleSchema, type CycleFormValues } from "./cycle-schema";

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

  const cycleForm = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: { name: "", type: "QUARTERLY", periodStart: "", periodEnd: "", deadline: "" },
  });

  const openCreate = useCallback(() => {
    setEditCycle(null);
    cycleForm.reset({ name: "", type: "QUARTERLY", periodStart: "", periodEnd: "", deadline: "" });
    setSheetOpen(true);
  }, [cycleForm]);

  const openEdit = useCallback((cycle: ReviewCycle) => {
    setEditCycle(cycle);
    cycleForm.reset({
      name: cycle.name ?? "",
      type: (cycle.type as CycleFormValues["type"]) ?? "QUARTERLY",
      periodStart: cycle.periodStart ?? "",
      periodEnd: cycle.periodEnd ?? "",
      deadline: cycle.deadline ?? "",
    });
    setSheetOpen(true);
  }, [cycleForm]);

  const handleCreate = useCallback((data: CycleFormValues) => {
    if (!editCycle) {
      const today = new Date().toISOString().slice(0, 10);
      if (data.periodStart < today) {
        toast.error("Period start date cannot be earlier than today");
        return;
      }
    }
    if (editCycle) {
      updateCycle.mutate(
        { id: editCycle.id, name: data.name, type: data.type, periodStart: data.periodStart, periodEnd: data.periodEnd, deadline: data.deadline },
        {
          onSuccess: () => { toast.success("Cycle updated"); setSheetOpen(false); setEditCycle(null); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createCycle.mutate(
        { name: data.name, type: data.type, periodStart: data.periodStart, periodEnd: data.periodEnd, deadline: data.deadline },
        {
          onSuccess: () => { toast.success("Cycle created"); setSheetOpen(false); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [editCycle, createCycle, updateCycle]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteCycle.mutate(deleteId, {
      onSuccess: () => { toast.success("Cycle deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteCycle]);

  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditCycle(null);
      cycleForm.reset({ name: "", type: "QUARTERLY", periodStart: "", periodEnd: "", deadline: "" });
    }
    setSheetOpen(open);
  }, [cycleForm]);

  const cycleStats = useMemo(() => {
    const list = cycles ?? [];
    return {
      total: list.length,
      active: list.filter((c: ReviewCycle) => c.status === "ACTIVE").length,
      completed: list.filter((c: ReviewCycle) => c.status === "COMPLETED").length,
    };
  }, [cycles]);

  const watchedType = cycleForm.watch("type");
  const watchedPeriodStart = cycleForm.watch("periodStart");
  const watchedPeriodEnd = cycleForm.watch("periodEnd");
  const periodStartBounds = planningStartPickerProps({
    existingValue: editCycle ? watchedPeriodStart : undefined,
  });
  const periodEndBounds = planningEndPickerProps({
    startDate: watchedPeriodStart,
    mode: "after",
    existingValue: editCycle ? watchedPeriodEnd : undefined,
  });
  const deadlineBounds = planningEndPickerProps({
    startDate: watchedPeriodEnd,
    mode: "after",
    existingValue: editCycle ? cycleForm.watch("deadline") : undefined,
  });

  function handlePeriodStartChange(value: string) {
    cycleForm.setValue("periodStart", value, { shouldValidate: true });
    const currentEnd = cycleForm.getValues("periodEnd") ?? "";
    const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
    if (nextEnd !== currentEnd) {
      cycleForm.setValue("periodEnd", nextEnd, { shouldValidate: true });
    }
    const currentDeadline = cycleForm.getValues("deadline") ?? "";
    const nextDeadline = clearEndIfInvalid(
      nextEnd || value,
      currentDeadline,
      "after",
    );
    if (nextDeadline !== currentDeadline) {
      cycleForm.setValue("deadline", nextDeadline, { shouldValidate: true });
    }
  }

  function handlePeriodEndChange(value: string) {
    cycleForm.setValue("periodEnd", value, { shouldValidate: true });
    const currentDeadline = cycleForm.getValues("deadline") ?? "";
    const nextDeadline = clearEndIfInvalid(value, currentDeadline, "after");
    if (nextDeadline !== currentDeadline) {
      cycleForm.setValue("deadline", nextDeadline, { shouldValidate: true });
    }
  }

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
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
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
                ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800"
                : cycle.status === "COMPLETED"
                ? "border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-800"
                : cycle.status === "CANCELLED"
                ? "border-rose-200 bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800"
                : "border-border bg-muted text-muted-foreground";
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
                className={`rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4 transition-shadow duration-200 hover:shadow-md ${accentClass}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TruncatedText text={cycle.name ?? ""} className="text-sm font-semibold text-foreground" />
                        <Badge className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {cycle.status ?? "DRAFT"}
                        </Badge>
                        {cycle.type && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
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
                        <AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="icon" className="w-7 shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-200" aria-label="Cycle actions" />
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

      <HrSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} title={editCycle ? "Edit Review Cycle" : "Create Review Cycle"} onSubmit={cycleForm.handleSubmit(handleCreate)} submitLabel={editCycle ? "Save Changes" : "Create"} isPending={createCycle.isPending || updateCycle.isPending}>
        <Form {...cycleForm}>
          <FormField
            control={cycleForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cycle Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Q2 2026 Review" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={cycleForm.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="QUARTERLY">Quarterly — 3-month cycle</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half-Yearly — 6-month cycle</SelectItem>
                      <SelectItem value="ANNUAL">Annual — Full-year cycle</SelectItem>
                      <SelectItem value="CUSTOM">Custom — Define your own period</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <p className="text-[11px] text-muted-foreground">
                  {watchedType === "QUARTERLY" && "3-month performance review. Best for fast-paced teams that need frequent check-ins and course corrections."}
                  {watchedType === "HALF_YEARLY" && "6-month review cycle. Provides a balanced mid-year checkpoint for goal progress and development feedback."}
                  {watchedType === "ANNUAL" && "Comprehensive year-end evaluation covering overall performance, growth, and compensation decisions."}
                  {watchedType === "CUSTOM" && "Flexible review period tailored to your team's schedule. Define any start/end dates and deadline that fits your workflow."}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={cycleForm.control}
              name="periodStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Start</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={handlePeriodStartChange}
                      placeholder="Pick a date"
                      className="text-sm"
                      fromDate={periodStartBounds.fromDate}
                      fromYear={periodStartBounds.fromYear}
                      toYear={periodStartBounds.toYear}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={cycleForm.control}
              name="periodEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period End</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={handlePeriodEndChange}
                      placeholder="Pick a date"
                      className="text-sm"
                      fromDate={periodEndBounds.fromDate}
                      fromYear={periodEndBounds.fromYear}
                      toYear={periodEndBounds.toYear}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={cycleForm.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Submission Deadline</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                    className="text-sm"
                    fromDate={deadlineBounds.fromDate}
                    fromYear={deadlineBounds.fromYear}
                    toYear={deadlineBounds.toYear}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </HrSheet>

      <ConfirmSheet
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
