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
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { Star, CheckCircle2, Pencil } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PerformanceReviewListItem, ReviewCycle, ReviewStatus } from "@/types/hr";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { reviewFormSchema } from "./review-schema";
import { zodFieldErrors } from "./zod-field-errors";
import { ReviewFormFields } from "./review-form-fields";

type StatusTab = "all" | ReviewStatus;

function isStatusTab(v: string): v is StatusTab {
  return (
    v === "all" ||
    v === "DRAFT" ||
    v === "IN_PROGRESS" ||
    v === "COMPLETED" ||
    v === "ARCHIVED"
  );
}

export function ReviewsTab() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editReview, setEditReview] = useState<PerformanceReviewListItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const [employeeId, setEmployeeId] = useState("");
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [cycleId, setCycleId] = useState("none");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const cursor = cursorHistory.at(-1);
  const page = cursorHistory.length;
  const statusParam: ReviewStatus | undefined = statusFilter === "all" ? undefined : statusFilter;

  const { data, isLoading, isFetching } = useHrPerformanceReviews({ status: statusParam, cursor });
  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const { data: cycles } = useReviewCycles();
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  const deleteReview = useDeletePerformanceReview();

  const employees = useMemo(
    () => unwrapEmployees(employeesRaw).filter((e) => !!e.id),
    [employeesRaw],
  );

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(isStatusTab(value) ? value : "all");
    setCursorHistory([undefined]);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((h) => [...h, nextCursor]);
  }, [data?.pagination.nextCursor]);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

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
      updateReview.mutate(
        { id: editReview.id, periodStart, periodEnd, cycleId: cycleId !== "none" ? Number(cycleId) : undefined },
        {
          onSuccess: () => { toast.success("Review updated"); setSheetOpen(false); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      return;
    }

    const selectedEmployee = employees.find((e) => e.id === employeeId);
    if (selectedEmployee?.joiningDate && periodStart < selectedEmployee.joiningDate.toString().slice(0, 10)) {
      setFieldErrors({ periodStart: "Period start cannot be earlier than the employee's joining date" });
      return;
    }
    createReview.mutate(
      { userId: employeeId, cycleId: cycleId !== "none" ? Number(cycleId) : undefined, periodStart, periodEnd },
      {
        onSuccess: () => { toast.success("Review created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editReview, employeeId, cycleId, periodStart, periodEnd, createReview, updateReview, employees, cycles, resetForm]);

  const handleOpenEdit = useCallback((review: PerformanceReviewListItem) => {
    setEditReview(review);
    setCycleId(review.cycleId ? String(review.cycleId) : "none");
    setPeriodStart(review.periodStart);
    setPeriodEnd(review.periodEnd);
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

  const periodStartBounds = planningStartPickerProps({ existingValue: editReview ? periodStart : undefined });
  const periodEndBounds = planningEndPickerProps({ startDate: periodStart, mode: "after", existingValue: editReview ? periodEnd : undefined });

  const handlePeriodStartChange = useCallback((value: string) => {
    setPeriodStart(value);
    setPeriodEnd((prev) => clearEndIfInvalid(value, prev, "after"));
    setFieldErrors((prev) => { const next = { ...prev }; delete next.periodStart; delete next.periodEnd; return next; });
  }, []);

  const handlePeriodEndChange = useCallback((value: string) => {
    setPeriodEnd(value);
    setFieldErrors((prev) => { const next = { ...prev }; delete next.periodEnd; return next; });
  }, []);

  if (isLoading) return <LoadingState variant="cards" rows={9} />;

  const reviewsList = data?.data ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
        <Tabs value={statusFilter} onValueChange={handleStatusChange}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="text-dense">All</TabsTrigger>
            <TabsTrigger value="DRAFT" className="text-dense">Draft</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS" className="text-dense">In Progress</TabsTrigger>
            <TabsTrigger value="COMPLETED" className="text-dense">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <AnimatedIconButton icon={PlusIcon} size="sm" className="gap-1.5" iconSize={14} onClick={handleOpenSheet}>
          New Review
        </AnimatedIconButton>
      </div>

      {reviewsList.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration className="h-full w-full" />}
          title={statusFilter === "all" ? "No reviews yet" : `No ${statusFilter.toLowerCase().replace("_", " ")} reviews`}
          description={statusFilter === "all" ? "Create your first performance review to start tracking employee growth." : "Try a different filter to see other reviews."}
          action={statusFilter === "all" ? { label: "New Review", onClick: handleOpenSheet } : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviewsList.map((review: PerformanceReviewListItem) => {
            const accentClass =
              review.status === "COMPLETED" ? "border-l-emerald-500"
              : review.status === "IN_PROGRESS" ? "border-l-blue-500"
              : review.status === "ARCHIVED" ? "border-l-border"
              : "border-l-amber-400";
            const statusBadgeClass =
              review.status === "COMPLETED" ? "border-status-success-rule bg-status-success-surface text-status-success-ink"
              : review.status === "IN_PROGRESS" ? "border-status-info-rule bg-status-info-surface text-status-info-ink"
              : review.status === "ARCHIVED" ? "border-border bg-muted text-muted-foreground"
              : "border-status-warning-rule bg-status-warning-surface text-status-warning-ink";

            return (
              <Card key={review.id} className={`rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden border-l-4 transition-shadow duration-200 hover:shadow-md ${accentClass}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={`inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                      {review.status ?? "DRAFT"}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      {review.overallRating && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-warning-surface border border-status-warning-rule">
                          <Star className="h-3 w-3 fill-amber-500 text-status-warning-ink" />
                          <span className="text-micro font-bold text-status-warning-ink">{Number(review.overallRating).toFixed(1)}</span>
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
                      <AvatarFallback className="text-micro font-semibold bg-primary/10 text-primary">{review.user?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <TruncatedText text={review.user?.name ?? "Employee"} className="text-sm font-semibold text-foreground" />
                      {review.reviewer?.name && (
                        <TruncatedText text={`by ${review.reviewer.name}`} className="text-micro text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <p className="text-micro text-muted-foreground font-medium">{review.periodStart} → {review.periodEnd}</p>
                  {review.status !== "COMPLETED" && (
                    <Button variant="ghost" size="sm" className="text-xs w-full border border-border/60 hover:bg-status-success-surface hover:text-status-success-ink hover:border-status-success-rule transition-colors duration-200" onClick={() => handleComplete(review.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1.5" />Mark Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CursorPageControls
        page={page}
        hasNext={data?.pagination.hasMore ?? false}
        disabled={isFetching}
        onPrevious={handlePreviousPage}
        onNext={handleNextPage}
      />

      <HrSheet
        open={sheetOpen}
        onOpenChange={(v) => { if (!v) resetForm(); setSheetOpen(v); }}
        title={editReview ? "Edit Review" : "Create Review"}
        onSubmit={handleCreate}
        submitLabel={editReview ? "Save Changes" : "Create"}
        isPending={createReview.isPending || updateReview.isPending}
      >
        <ReviewFormFields
          editReview={editReview}
          employees={employees}
          cycles={Array.isArray(cycles) ? cycles : []}
          employeeId={employeeId}
          onEmployeeChange={(id) => {
            setEmployeeId(id);
            setFieldErrors((prev) => { const next = { ...prev }; delete next.employeeId; return next; });
          }}
          employeePickerOpen={employeePickerOpen}
          onEmployeePickerOpenChange={setEmployeePickerOpen}
          cycleId={cycleId}
          onCycleChange={handleCycleChange}
          periodStart={periodStart}
          onPeriodStartChange={handlePeriodStartChange}
          periodEnd={periodEnd}
          onPeriodEndChange={handlePeriodEndChange}
          fieldErrors={fieldErrors}
          periodStartBounds={periodStartBounds}
          periodEndBounds={periodEndBounds}
        />
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
