"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useHrPerformanceReviews,
  useReviewCycles,
  useCreatePerformanceReview,
  useUpdatePerformanceReview,
  useDeletePerformanceReview,
  useHrEmployees,
  unwrapEmployees,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { AIGenerateReviewButton } from "@/features/hr/performance/ai-generate-review-button";
import { toast } from "sonner";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { Star, CheckCircle2, ChevronsUpDown, Check, Pencil } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PerformanceReview, ReviewCycle } from "@/types/hr";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { reviewFormSchema } from "./review-schema";
import { zodFieldErrors } from "./zod-field-errors";

export function ReviewsTab() {
  const { data: reviews, isLoading } = useHrPerformanceReviews();
  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const { data: cycles } = useReviewCycles();
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  const deleteReview = useDeletePerformanceReview();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editReview, setEditReview] = useState<PerformanceReview | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState("");
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [cycleId, setCycleId] = useState("none");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const employees = useMemo(
    () => unwrapEmployees(employeesRaw).filter((e) => !!e.id),
    [employeesRaw],
  );

  const handleCycleChange = useCallback((value: string) => {
    setCycleId(value);
    if (value !== "none") {
      const cycle = (Array.isArray(cycles) ? cycles : []).find((c: ReviewCycle) => String(c.id) === value);
      if (cycle) {
        if (cycle.status === "COMPLETED" || cycle.status === "CANCELLED") {
          toast.error(`This cycle is ${cycle.status.toLowerCase()}. New reviews cannot be added to it.`);
          setCycleId("none");
          return;
        }
        setPeriodStart(cycle.periodStart ?? "");
        setPeriodEnd(cycle.periodEnd ?? "");
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.periodStart;
          delete next.periodEnd;
          return next;
        });
      }
    }
  }, [cycles]);

  const resetForm = useCallback(() => {
    setEmployeeId("");
    setCycleId("none");
    setPeriodStart("");
    setPeriodEnd("");
    setEditReview(null);
    setFieldErrors({});
  }, []);

  const handleCreate = useCallback(() => {
    const parsed = reviewFormSchema.safeParse({
      employeeId,
      cycleId,
      periodStart,
      periodEnd,
      isEdit: !!editReview,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    if (cycleId !== "none") {
      const selectedCycle = (Array.isArray(cycles) ? cycles : []).find((c: ReviewCycle) => String(c.id) === cycleId);
      if (selectedCycle) {
        if (periodStart < selectedCycle.periodStart) {
          setFieldErrors({ periodStart: "Period start must be on or after the selected cycle's start date" });
          return;
        }
        if (periodEnd > selectedCycle.periodEnd) {
          setFieldErrors({ periodEnd: "Period end must be on or before the selected cycle's end date" });
          return;
        }
      }
    }

    if (editReview) {
      updateReview.mutate({
        id: editReview.id,
        periodStart,
        periodEnd,
        cycleId: cycleId !== "none" ? Number(cycleId) : undefined,
      }, {
        onSuccess: () => {
          toast.success("Review updated");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
      return;
    }

    const selectedEmployee = employees.find((e) => e.id === employeeId);
    if (selectedEmployee?.joiningDate && periodStart < selectedEmployee.joiningDate.toString().slice(0, 10)) {
      setFieldErrors({ periodStart: "Period start cannot be earlier than the employee's joining date" });
      return;
    }
    createReview.mutate({
      userId: employeeId,
      cycleId: cycleId !== "none" ? Number(cycleId) : undefined,
      periodStart,
      periodEnd,
    }, {
      onSuccess: () => {
        toast.success("Review created");
        setSheetOpen(false);
        resetForm();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [editReview, employeeId, cycleId, periodStart, periodEnd, createReview, updateReview, employees, cycles, resetForm]);

  const handleOpenEdit = useCallback((review: PerformanceReview) => {
    setEditReview(review);
    setCycleId(review.cycleId ? String(review.cycleId) : "none");
    setPeriodStart(review.periodStart ?? "");
    setPeriodEnd(review.periodEnd ?? "");
    setFieldErrors({});
    setSheetOpen(true);
  }, []);

  const handleComplete = useCallback((id: number) => {
    updateReview.mutate({ id, status: "COMPLETED" }, {
      onSuccess: () => toast.success("Review marked as completed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateReview]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteReview.mutate(deleteId, {
      onSuccess: () => { toast.success("Review deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteReview]);

  const handleOpenSheet = useCallback(() => { resetForm(); setSheetOpen(true); }, [resetForm]);

  const periodStartBounds = planningStartPickerProps({
    existingValue: editReview ? periodStart : undefined,
  });
  const periodEndBounds = planningEndPickerProps({
    startDate: periodStart,
    mode: "after",
    existingValue: editReview ? periodEnd : undefined,
  });

  const handlePeriodStartChange = useCallback((value: string) => {
    setPeriodStart(value);
    setPeriodEnd((prev) => clearEndIfInvalid(value, prev, "after"));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.periodStart;
      delete next.periodEnd;
      return next;
    });
  }, []);
  const handlePeriodEndChange = useCallback((value: string) => {
    setPeriodEnd(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.periodEnd;
      return next;
    });
  }, []);

  if (isLoading) {
    return <LoadingState variant="cards" rows={9} />;
  }

  const reviewsList = Array.isArray(reviews) ? reviews : [];
  const filteredReviews = statusFilter === "all"
    ? reviewsList
    : reviewsList.filter((r: PerformanceReview) => (r.status ?? "DRAFT") === statusFilter);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="text-[11px]">All ({reviewsList.length})</TabsTrigger>
            <TabsTrigger value="DRAFT" className="text-[11px]">Draft</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS" className="text-[11px]">In Progress</TabsTrigger>
            <TabsTrigger value="COMPLETED" className="text-[11px]">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <AnimatedIconButton icon={PlusIcon} size="sm" className="gap-1.5" iconSize={14} onClick={handleOpenSheet}>
          New Review
        </AnimatedIconButton>
      </div>

      {filteredReviews.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration className="h-full w-full" />}
          title={statusFilter === "all" ? "No reviews yet" : `No ${statusFilter.toLowerCase().replace("_", " ")} reviews`}
          description={statusFilter === "all" ? "Create your first performance review to start tracking employee growth." : "Try a different filter to see other reviews."}
          action={statusFilter === "all" ? { label: "New Review", onClick: handleOpenSheet } : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReviews.map((review: PerformanceReview) => {
            const accentClass =
              review.status === "COMPLETED"
                ? "border-l-emerald-500"
                : review.status === "IN_PROGRESS"
                ? "border-l-blue-500"
                : review.status === "ARCHIVED"
                ? "border-l-border"
                : "border-l-amber-400";
            const statusBadgeClass =
              review.status === "COMPLETED"
                ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800"
                : review.status === "IN_PROGRESS"
                ? "border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-800"
                : review.status === "ARCHIVED"
                ? "border-border bg-muted text-muted-foreground"
                : "border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800";

            return (
              <Card
                key={review.id}
                className={`rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4 transition-shadow duration-200 hover:shadow-md ${accentClass}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                      {review.status ?? "DRAFT"}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      {review.overallRating && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            {Number(review.overallRating).toFixed(1)}
                          </span>
                        </div>
                      )}
                      {review.status !== "COMPLETED" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors duration-200" onClick={() => handleOpenEdit(review)} aria-label={`Edit review${review.user?.name ? ` for ${review.user.name}` : ""}`}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AnimatedIconButton icon={Trash2Icon} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors duration-200" iconSize={12} onClick={() => setDeleteId(review.id)} aria-label={`Delete review${review.user?.name ? ` for ${review.user.name}` : ""}`} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 shrink-0">
                      <AvatarImage src={resolveImageUrl(review.user?.image ?? null)} />
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                        {review.user?.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <TruncatedText
                        text={review.user?.name ?? "Employee"}
                        className="text-sm font-semibold text-foreground"
                      />
                      {review.reviewer?.name && (
                        <TruncatedText
                          text={`by ${review.reviewer.name}`}
                          className="text-[10px] text-muted-foreground"
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {review.periodStart} → {review.periodEnd}
                  </p>
                  {review.status !== "COMPLETED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs w-full border border-border/60 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 transition-colors duration-200"
                      onClick={() => handleComplete(review.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1.5" />Mark Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(v) => { if (!v) resetForm(); setSheetOpen(v); }}
        title={editReview ? "Edit Review" : "Create Review"}
        onSubmit={handleCreate}
        submitLabel={editReview ? "Save Changes" : "Create"}
        isPending={createReview.isPending || updateReview.isPending}
      >
        {!editReview && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employee</label>
            <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeePickerOpen}
                  className={cn(
                    "w-full justify-between font-normal",
                    fieldErrors.employeeId && "border-destructive",
                  )}
                >
                  <span className="truncate">{employees.find((e) => e.id === employeeId)?.name ?? employees.find((e) => e.id === employeeId)?.email ?? "Select employee"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search employees..." />
                  <CommandList className="max-h-48 overflow-y-auto">
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.name ?? ""} ${e.email}`}
                          onSelect={() => {
                            setEmployeeId(e.id);
                            setEmployeePickerOpen(false);
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.employeeId;
                              return next;
                            });
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", employeeId === e.id ? "opacity-100" : "opacity-0")} />
                          {e.name ?? e.email}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {fieldErrors.employeeId && (
              <p className="text-xs text-destructive">{fieldErrors.employeeId}</p>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Cycle (optional)</label>
          <Select value={cycleId} onValueChange={handleCycleChange}>
            <SelectTrigger><SelectValue placeholder="Ad-hoc review" /></SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="none">Ad-hoc (no cycle)</SelectItem>
              {(Array.isArray(cycles) ? cycles : [])
                .filter((c: ReviewCycle) => c.id != null && String(c.id) !== "" && c.name && c.status !== "COMPLETED" && c.status !== "CANCELLED")
                .map((c: ReviewCycle) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span className="truncate max-w-[200px] block">{c.name}</span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <DatePicker
              value={periodStart ?? ""}
              onChange={handlePeriodStartChange}
              placeholder="Pick a date"
              className="text-sm"
              fromDate={periodStartBounds.fromDate}
              fromYear={periodStartBounds.fromYear}
              toYear={periodStartBounds.toYear}
            />
            {fieldErrors.periodStart && (
              <p className="text-xs text-destructive">{fieldErrors.periodStart}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <DatePicker
              value={periodEnd ?? ""}
              onChange={handlePeriodEndChange}
              placeholder="Pick a date"
              className="text-sm"
              fromDate={periodEndBounds.fromDate}
              fromYear={periodEndBounds.fromYear}
              toYear={periodEndBounds.toYear}
            />
            {fieldErrors.periodEnd && (
              <p className="text-xs text-destructive">{fieldErrors.periodEnd}</p>
            )}
          </div>
        </div>
        {employeeId && periodStart && periodEnd && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">AI Assist</p>
            <AIGenerateReviewButton
              userId={employeeId}
              userName={employees.find((e) => e.id === employeeId)?.name ?? "Employee"}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </div>
        )}
      </HrSheet>

      <ConfirmSheet
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Review"
        description="Are you sure you want to delete this performance review? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        isPending={deleteReview.isPending}
      />
    </div>
  );
}
