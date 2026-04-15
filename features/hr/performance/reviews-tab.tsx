"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useHrPerformanceReviews,
  useReviewCycles,
  useCreatePerformanceReview,
  useUpdatePerformanceReview,
  useHrEmployees,
} from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { AIGenerateReviewButton } from "@/features/hr/performance/ai-generate-review-button";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";
import { Plus, Star, CheckCircle2 } from "lucide-react";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Employee, PerformanceReview, ReviewCycle } from "@/types/hr";

export function ReviewsTab() {
  const { data: reviews, isLoading } = useHrPerformanceReviews();
  const { data: employeesRaw } = useHrEmployees();
  const { data: cycles } = useReviewCycles();
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [cycleId, setCycleId] = useState("none");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const handleCreate = useCallback(() => {
    if (!employeeId || !periodStart || !periodEnd) {
      toast.error("Employee and period dates are required");
      return;
    }
    createReview.mutate(
      {
        userId: employeeId,
        cycleId: cycleId !== "none" ? Number(cycleId) : undefined,
        periodStart,
        periodEnd,
      },
      {
        onSuccess: () => {
          toast.success("Review created");
          setSheetOpen(false);
          setEmployeeId("");
          setCycleId("none");
          setPeriodStart("");
          setPeriodEnd("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [employeeId, cycleId, periodStart, periodEnd, createReview]);

  const handleComplete = useCallback(
    (id: number) => {
      updateReview.mutate(
        { id, status: "COMPLETED" },
        {
          onSuccess: () => toast.success("Review marked as completed"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateReview]
  );

  const handleSheetOpen = useCallback(() => setSheetOpen(true), []);

  const handlePeriodStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPeriodStart(e.target.value),
    []
  );
  const handlePeriodEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPeriodEnd(e.target.value),
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const reviewsList = Array.isArray(reviews) ? reviews : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{reviewsList.length} reviews</p>
        <Button size="sm" onClick={handleSheetOpen}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Review
        </Button>
      </div>

      {reviewsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyLeaderboardIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No reviews yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviewsList.map((review: PerformanceReview) => (
            <ReviewCard key={review.id} review={review} onComplete={handleComplete} />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Create Review"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={createReview.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name ?? e.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Cycle (optional)</label>
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger>
              <SelectValue placeholder="Ad-hoc review" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ad-hoc (no cycle)</SelectItem>
              {cycles?.map((c: ReviewCycle) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <Input type="date" value={periodStart} onChange={handlePeriodStartChange} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <Input type="date" value={periodEnd} onChange={handlePeriodEndChange} />
          </div>
        </div>
        {employeeId && periodStart && periodEnd && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              AI Assist
            </p>
            <AIGenerateReviewButton
              userId={employeeId}
              userName={employees.find((e) => e.id === employeeId)?.name ?? "Employee"}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </div>
        )}
      </HrSheet>
    </div>
  );
}

interface ReviewCardProps {
  review: PerformanceReview;
  onComplete: (id: number) => void;
}

function ReviewCard({ review, onComplete }: ReviewCardProps) {
  const handleComplete = useCallback(() => onComplete(review.id), [onComplete, review.id]);

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge
            variant={
              review.status === "COMPLETED"
                ? "default"
                : review.status === "IN_PROGRESS"
                  ? "secondary"
                  : "outline"
            }
            className="text-[10px]"
          >
            {review.status ?? "DRAFT"}
          </Badge>
          {review.overallRating && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs font-bold">{Number(review.overallRating).toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="h-6 w-6">
            <AvatarImage src={resolveImageUrl(review.user?.image ?? null)} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
              {review.user?.name?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium truncate">{review.user?.name ?? "Employee"}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">
          {review.periodStart} → {review.periodEnd}
          {review.reviewer?.name && <> &middot; by {review.reviewer.name}</>}
        </p>
        {review.status !== "COMPLETED" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs w-full"
            onClick={handleComplete}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />Mark Complete
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
