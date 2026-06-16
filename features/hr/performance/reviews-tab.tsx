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
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { AIGenerateReviewButton } from "@/features/hr/performance/ai-generate-review-button";
import { toast } from "sonner";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, Star, CheckCircle2, ChevronsUpDown, Check } from "lucide-react";
import type { Employee, PerformanceReview, ReviewCycle } from "@/types/hr";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";

export function ReviewsTab() {
  const { data: reviews, isLoading } = useHrPerformanceReviews();
  const { data: employeesRaw } = useHrEmployees();
  const { data: cycles } = useReviewCycles();
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [cycleId, setCycleId] = useState("none");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const employees = useMemo(
    () => ((Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[]).filter((e) => !!e.id),
    [employeesRaw]
  );

  const handleCycleChange = useCallback((value: string) => {
    setCycleId(value);
    if (value !== "none") {
      const cycle = (Array.isArray(cycles) ? cycles : []).find((c: ReviewCycle) => String(c.id) === value);
      if (cycle) {
        setPeriodStart(cycle.periodStart ?? "");
        setPeriodEnd(cycle.periodEnd ?? "");
      }
    }
  }, [cycles]);

  const handleCreate = useCallback(() => {
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!periodStart || !periodEnd) {
      toast.error("Period dates are required");
      return;
    }
    if (periodEnd <= periodStart) {
      toast.error("Period end date must be after period start date");
      return;
    }
    if (cycleId !== "none") {
      const selectedCycle = (Array.isArray(cycles) ? cycles : []).find((c: ReviewCycle) => String(c.id) === cycleId);
      if (selectedCycle) {
        if (periodStart < selectedCycle.periodStart) {
          toast.error("Period start must be on or after the selected cycle's start date");
          return;
        }
        if (periodEnd > selectedCycle.periodEnd) {
          toast.error("Period end must be on or before the selected cycle's end date");
          return;
        }
      }
    }
    const selectedEmployee = employees.find((e) => e.id === employeeId);
    if (selectedEmployee?.joiningDate && periodStart < selectedEmployee.joiningDate.toString().slice(0, 10)) {
      toast.error("Period start date cannot be earlier than the employee's joining date");
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
        setEmployeeId("");
        setCycleId("none");
        setPeriodStart("");
        setPeriodEnd("");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [employeeId, cycleId, periodStart, periodEnd, createReview, employees, cycles]);

  const handleComplete = useCallback((id: number) => {
    updateReview.mutate({ id, status: "COMPLETED" }, {
      onSuccess: () => toast.success("Review marked as completed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateReview]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handlePeriodStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPeriodStart(e.target.value), []);
  const handlePeriodEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPeriodEnd(e.target.value), []);

  if (isLoading) {
    return <LoadingState variant="cards" rows={4} />;
  }

  const reviewsList = Array.isArray(reviews) ? reviews : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{reviewsList.length} reviews</p>
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Review
        </Button>
      </div>

      {reviewsList.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration className="h-32 w-32 opacity-95" />}
          title="No reviews yet"
          description="Create your first one."
          compact
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviewsList.map((review: PerformanceReview) => (
            <Card key={review.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={review.status === "COMPLETED" ? "default" : review.status === "IN_PROGRESS" ? "secondary" : "outline"} className="text-[10px]">
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
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{review.user?.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium truncate">{review.user?.name ?? "Employee"}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  {review.periodStart} → {review.periodEnd}
                  {review.reviewer?.name && <> &middot; by {review.reviewer.name}</>}
                </p>
                {review.status !== "COMPLETED" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => handleComplete(review.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Mark Complete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Review" onSubmit={handleCreate} submitLabel="Create" isPending={createReview.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={employeePickerOpen} className="w-full justify-between font-normal">
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
                      <CommandItem key={e.id} value={`${e.name ?? ""} ${e.email}`} onSelect={() => { setEmployeeId(e.id); setEmployeePickerOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", employeeId === e.id ? "opacity-100" : "opacity-0")} />
                        {e.name ?? e.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Cycle (optional)</label>
          <Select value={cycleId} onValueChange={handleCycleChange}>
            <SelectTrigger><SelectValue placeholder="Ad-hoc review" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ad-hoc (no cycle)</SelectItem>
              {(Array.isArray(cycles) ? cycles : []).filter((c: ReviewCycle) => c.id != null && String(c.id) !== "" && c.name).map((c: ReviewCycle) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
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
    </div>
  );
}
