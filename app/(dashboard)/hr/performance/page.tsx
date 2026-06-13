"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useHrPerformanceReviews,
  useHrGoals,
  useReviewCycles,
  useCreateReviewCycle,
  useUpdateReviewCycle,
  useDeleteReviewCycle,
  useCreatePerformanceReview,
  useUpdatePerformanceReview,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useOneOnOneMeetings,
  useCreateOneOnOne,
  useUpdateOneOnOne,
  useDeleteOneOnOne,
  useHrEmployees,
  usePIPs,
  useCreatePIP,
  useUpdatePIP,
  type PIP,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { AIGenerateReviewButton } from "@/features/hr/performance/ai-generate-review-button";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  Plus, Star, Target, Users, Calendar, Clock, MoreHorizontal,
  CheckCircle2, Trash2, Pencil, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee, PerformanceReview, Goal, ReviewCycle, OneOnOneMeeting, MeetingStatus } from "@/types/hr";
import { Separator } from "@/components/ui/separator";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";

export default function PerformancePage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <PerformanceContent />
    </DashboardGate>
  );
}

function PerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "reviews";

  const handleTabChange = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "reviews") params.delete("tab");
    else params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <PageWrapper title="Performance" subtitle="Reviews, goals, and team development">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-9">
          <TabsTrigger value="reviews" className="text-xs gap-1.5 px-3">
            <Star className="h-3.5 w-3.5" />Reviews
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs gap-1.5 px-3">
            <Target className="h-3.5 w-3.5" />Goals
          </TabsTrigger>
          <TabsTrigger value="one-on-ones" className="text-xs gap-1.5 px-3">
            <Users className="h-3.5 w-3.5" />1-on-1s
          </TabsTrigger>
          <TabsTrigger value="cycles" className="text-xs gap-1.5 px-3">
            <Calendar className="h-3.5 w-3.5" />Cycles
          </TabsTrigger>
          <TabsTrigger value="pip" className="text-xs gap-1.5 px-3">
            <AlertTriangle className="h-3.5 w-3.5" />PIP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-3"><ReviewsTab /></TabsContent>
        <TabsContent value="goals" className="mt-3"><GoalsTab /></TabsContent>
        <TabsContent value="one-on-ones" className="mt-3"><OneOnOnesTab /></TabsContent>
        <TabsContent value="cycles" className="mt-3"><CyclesTab /></TabsContent>
        <TabsContent value="pip" className="mt-3"><PIPTab /></TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

function ReviewsTab() {
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
    () => ((Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[]).filter((e) => !!e.id),
    [employeesRaw]
  );

  const handleCreate = useCallback(() => {
    if (!employeeId || !periodStart || !periodEnd) {
      toast.error("Employee and period dates are required");
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
  }, [employeeId, cycleId, periodStart, periodEnd, createReview]);

  const handleComplete = useCallback((id: number) => {
    updateReview.mutate({ id, status: "COMPLETED" }, {
      onSuccess: () => toast.success("Review marked as completed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateReview]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  const reviewsList = Array.isArray(reviews) ? reviews : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{reviewsList.length} reviews</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
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
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Cycle (optional)</label>
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger><SelectValue placeholder="Ad-hoc review" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ad-hoc (no cycle)</SelectItem>
              {cycles?.map((c: ReviewCycle) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
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

function GoalsTab() {
  const { data: goals, isLoading } = useHrGoals();
  const { data: employeesRaw } = useHrEmployees();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const employees = useMemo(
    () => ((Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[]).filter((e) => !!e.id),
    [employeesRaw]
  );

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!userId) { toast.error("Please select an employee"); return; }
    if (!trimmedTitle) { toast.error("Goal title is required"); return; }
    if (trimmedTitle.length < 3) { toast.error("Goal title must be at least 3 characters"); return; }
    if (trimmedTitle.length > 200) { toast.error("Goal title must be at most 200 characters"); return; }
    if (/\s{2,}/.test(trimmedTitle)) { toast.error("Goal title cannot have consecutive spaces"); return; }
    if (trimmedDesc && trimmedDesc.length > 1000) { toast.error("Description must be at most 1000 characters"); return; }
    if (targetValue !== "") {
      const tv = Number(targetValue);
      if (isNaN(tv) || tv <= 0) { toast.error("Target value must be a positive number"); return; }
      if (tv > 9_999_999_999) { toast.error("Target value is too large (max 10 digits)"); return; }
    }
    if (!startDate) { toast.error("Start date is required"); return; }
    if (!endDate) { toast.error("End date is required"); return; }
    if (endDate < startDate) { toast.error("End date must be after start date"); return; }
    createGoal.mutate({
      userId,
      title: trimmedTitle,
      description: trimmedDesc || undefined,
      targetValue: targetValue !== "" ? Number(targetValue) : undefined,
      currentValue: 0,
      startDate,
      endDate,
    }, {
      onSuccess: () => {
        toast.success("Goal created");
        setSheetOpen(false);
        setUserId("");
        setTitle("");
        setDescription("");
        setTargetValue("");
        setStartDate("");
        setEndDate("");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, title, description, targetValue, startDate, endDate, createGoal]);

  const handleProgressUpdate = useCallback((goalId: number, progress: number) => {
    const newProgress = Math.min(100, Math.max(0, progress));
    updateGoal.mutate({ goalId, progress: newProgress, status: newProgress >= 100 ? "COMPLETED" : "IN_PROGRESS" }, {
      onSuccess: () => toast.success("Progress updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateGoal]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteGoal.mutate(deleteId, {
      onSuccess: () => { toast.success("Goal deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteGoal]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  const goalsList = Array.isArray(goals) ? goals : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{goalsList.length} goals</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Goal
        </Button>
      </div>

      {goalsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No goals set yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goalsList.map((goal: Goal) => (
            <Card key={goal.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <Badge variant={goal.status === "COMPLETED" ? "default" : "secondary"} className="text-[10px]">
                    {(goal.status ?? "IN_PROGRESS").replace("_", " ")}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleProgressUpdate(goal.id, (goal.progress ?? 0) + 10)}>+10% Progress</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleProgressUpdate(goal.id, 100)}>Mark Complete</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(goal.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm font-semibold leading-tight">{goal.title}</p>
                {goal.endDate && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Due {format(new Date(goal.endDate), "MMM d, yyyy")}</p>}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{goal.progress ?? 0}%</span>
                  </div>
                  <Progress value={goal.progress ?? 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Goal" onSubmit={handleCreate} submitLabel="Create" isPending={createGoal.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="e.g., Complete Q2 OKRs" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Goal details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Value</label>
          <Input
            inputMode="numeric"
            placeholder="100"
            value={targetValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || (/^\d{1,10}(\.\d{0,4})?$/.test(v) && Number(v) >= 0)) setTargetValue(v);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Goal"
        description="Are you sure you want to delete this goal? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteGoal.isPending}
      />
    </div>
  );
}

function OneOnOnesTab() {
  const { data: meetings, isLoading } = useOneOnOneMeetings();
  const { data: employeesRaw } = useHrEmployees();
  const createMeeting = useCreateOneOnOne();
  const updateMeeting = useUpdateOneOnOne();
  const deleteMeeting = useDeleteOneOnOne();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [empId, setEmpId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [agenda, setAgenda] = useState("");

  const employees = useMemo(
    () => ((Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[]).filter((e) => !!e.id),
    [employeesRaw]
  );

  const handleCreate = useCallback(() => {
    if (!empId.trim()) { toast.error("Please select an employee"); return; }
    if (!scheduledDate.trim()) { toast.error("Please select a date"); return; }

    const [yr, mo, dy] = scheduledDate.split("-").map(Number);
    const [hr, mn] = scheduledTime.split(":").map(Number);
    const localDt = new Date(yr, mo - 1, dy, hr, mn, 0, 0);

    const isDuplicate = (meetings ?? []).some((m: OneOnOneMeeting) => {
      if (m.employeeId !== empId || m.status === "CANCELLED") return false;
      const diff = Math.abs(new Date(m.scheduledAt).getTime() - localDt.getTime());
      return diff < 60 * 60 * 1000;
    });
    if (isDuplicate) { toast.error("A meeting with this employee is already scheduled at this time"); return; }

    createMeeting.mutate(
      { employeeId: empId, scheduledAt: localDt.toISOString(), duration: Number(duration) || 30, agenda: agenda || undefined },
      {
        onSuccess: () => {
          toast.success("Meeting scheduled");
          setSheetOpen(false);
          setEmpId("");
          setScheduledDate("");
          setScheduledTime("10:00");
          setAgenda("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [empId, scheduledDate, scheduledTime, duration, agenda, createMeeting, meetings]);

  const handleStatusChange = useCallback((id: number, status: MeetingStatus) => {
    updateMeeting.mutate({ id, status }, {
      onSuccess: () => toast.success("Status updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateMeeting]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMeeting.mutate(deleteId, {
      onSuccess: () => { toast.success("Meeting deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteMeeting]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{meetings?.length ?? 0} meetings</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Schedule 1-on-1
        </Button>
      </div>

      {!meetings?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No 1-on-1 meetings scheduled.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meetings.map((m: OneOnOneMeeting) => (
            <Card key={m.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex -space-x-2 shrink-0">
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={resolveImageUrl(m.manager?.image ?? null)} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{m.manager?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={resolveImageUrl(m.employee?.image ?? null)} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{m.employee?.name?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.manager?.name} & {m.employee?.name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(m.scheduledAt), "PPp")} &middot; {m.duration}min
                  </p>
                </div>
                <Badge variant={m.status === "COMPLETED" ? "default" : m.status === "CANCELLED" ? "destructive" : "outline"} className="text-[10px] shrink-0">
                  {m.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {m.status === "SCHEDULED" && <DropdownMenuItem onClick={() => handleStatusChange(m.id, "COMPLETED")}>Mark Completed</DropdownMenuItem>}
                    {m.status === "SCHEDULED" && <DropdownMenuItem onClick={() => handleStatusChange(m.id, "CANCELLED")}>Cancel</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Schedule 1-on-1" onSubmit={handleCreate} submitLabel="Schedule" isPending={createMeeting.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time</label>
            <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration (min)</label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Agenda</label>
          <Textarea placeholder="Topics to discuss..." value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Meeting"
        description="Delete this 1-on-1 meeting?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteMeeting.isPending}
      />
    </div>
  );
}

function CyclesTab() {
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
    if (trimmedName.length < 2) { toast.error("Cycle name must be at least 2 characters"); return; }
    if (trimmedName.length > 100) { toast.error("Cycle name must be at most 100 characters"); return; }
    if (/[^a-zA-Z0-9\s\-_().&,/]/.test(trimmedName)) { toast.error("Cycle name contains invalid characters"); return; }
    if (!periodStart) { toast.error("Period start date is required"); return; }
    if (!periodEnd) { toast.error("Period end date is required"); return; }
    if (periodEnd < periodStart) { toast.error("Period end must be after period start"); return; }
    if (deadline && (deadline < periodStart || deadline > periodEnd)) {
      toast.error("Deadline must fall within the review period dates"); return;
    }
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

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cycles?.length ?? 0} cycles</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Cycle
        </Button>
      </div>

      {!cycles?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No review cycles yet. Create a quarterly or annual cycle.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cycles.map((cycle: ReviewCycle) => (
            <Card key={cycle.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{cycle.name}</p>
                    <Badge variant={cycle.status === "ACTIVE" ? "default" : cycle.status === "COMPLETED" ? "secondary" : "outline"} className="text-[10px]">{cycle.status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {cycle.periodStart} → {cycle.periodEnd}
                    {cycle.deadline && <> &middot; Deadline: {cycle.deadline}</>}
                    {cycle.type && <> &middot; {cycle.type}</>}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cycle)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(cycle.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title={editCycle ? "Edit Review Cycle" : "Create Review Cycle"} onSubmit={handleCreate} submitLabel={editCycle ? "Save Changes" : "Create"} isPending={createCycle.isPending || updateCycle.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cycle Name</label>
          <Input placeholder="e.g., Q2 2026 Review" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
              <SelectItem value="ANNUAL">Annual</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Submission Deadline</label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Review Cycle"
        description="Are you sure you want to delete this review cycle? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteCycle.isPending}
      />
    </div>
  );
}

function PIPTab() {
  const { data: pips, isLoading } = usePIPs();
  const { data: employeesRaw } = useHrEmployees();
  const createPIP = useCreatePIP();
  const updatePIP = useUpdatePIP();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pipUserId, setPipUserId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [objectives, setObjectives] = useState([{ objective: "", metric: "", deadline: "" }]);

  const employees = useMemo(
    () => ((Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[]).filter((e) => !!e.id),
    [employeesRaw]
  );

  const pipsList = useMemo(() => (Array.isArray(pips) ? pips : []) as PIP[], [pips]);

  const resetForm = useCallback(() => {
    setPipUserId("");
    setReason("");
    setStartDate("");
    setEndDate("");
    setNotes("");
    setObjectives([{ objective: "", metric: "", deadline: "" }]);
  }, []);

  const handleCreate = useCallback(() => {
    if (!pipUserId) { toast.error("Please select an employee"); return; }
    const trimmedReason = reason.trim();
    if (!trimmedReason) { toast.error("Reason is required"); return; }
    if (trimmedReason.length > 1000) { toast.error("Reason must be at most 1000 characters"); return; }
    if (!startDate) { toast.error("Start date is required"); return; }
    if (!endDate) { toast.error("End date is required"); return; }
    if (endDate <= startDate) { toast.error("End date must be after start date"); return; }

    const existingActive = pipsList.find((p) => p.userId === pipUserId && (p.status === "ACTIVE" || p.status === "EXTENDED"));
    if (existingActive) { toast.error("This employee already has an active PIP"); return; }

    const validObjectives = objectives.filter((o) => o.objective.trim() && o.metric.trim() && o.deadline);
    if (validObjectives.length === 0) { toast.error("At least one complete objective (goal, metric, deadline) is required"); return; }

    createPIP.mutate(
      {
        userId: pipUserId,
        reason: trimmedReason,
        objectives: validObjectives.map((o) => ({ objective: o.objective.trim(), metric: o.metric.trim(), deadline: o.deadline })),
        startDate,
        endDate,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => { toast.success("PIP created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [pipUserId, reason, startDate, endDate, notes, objectives, pipsList, createPIP, resetForm]);

  const handleUpdateStatus = useCallback((id: number, status: string) => {
    updatePIP.mutate({ id, status }, {
      onSuccess: () => toast.success("PIP updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updatePIP]);

  const addObjective = useCallback(() => {
    setObjectives((prev) => [...prev, { objective: "", metric: "", deadline: "" }]);
  }, []);

  const removeObjective = useCallback((index: number) => {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateObjectiveField = useCallback((index: number, field: "objective" | "metric" | "deadline", value: string) => {
    setObjectives((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }, []);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{pipsList.length} performance improvement plans</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />New PIP
        </Button>
      </div>

      {pipsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No PIPs issued yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pipsList.map((pip) => (
            <Card key={pip.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={resolveImageUrl(pip.user?.image ?? null)} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{pip.user?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pip.user?.name ?? "Employee"}</p>
                      <p className="text-[10px] text-muted-foreground">{pip.startDate} → {pip.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        pip.status === "COMPLETED" ? "default" :
                        pip.status === "TERMINATED" ? "destructive" :
                        pip.status === "EXTENDED" ? "secondary" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {pip.status ?? "ACTIVE"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(pip.status === "ACTIVE" || pip.status === "EXTENDED") && (
                          <>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(pip.id, "COMPLETED")}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(pip.id, "EXTENDED")}>
                              <Calendar className="h-3.5 w-3.5 mr-1.5" />Extend
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleUpdateStatus(pip.id, "TERMINATED")}>
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Terminate
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{pip.reason}</p>
                {pip.objectives && pip.objectives.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{pip.objectives.length} objective{pip.objectives.length !== 1 ? "s" : ""}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }}
        title="Create Performance Improvement Plan"
        onSubmit={handleCreate}
        submitLabel="Create PIP"
        isPending={createPIP.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
          <Select value={pipUserId} onValueChange={setPipUserId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employees.filter((e) => e.isActive).map((e) => (
                <SelectItem key={e.id} value={e.id}>{[e.firstName, e.lastName].filter(Boolean).join(" ") || e.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
          <Textarea placeholder="Describe the performance concerns..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date <span className="text-destructive">*</span></label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date <span className="text-destructive">*</span></label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Objectives <span className="text-destructive">*</span></label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addObjective}>
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
          <div className="space-y-3">
            {objectives.map((obj, idx) => (
              <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Objective {idx + 1}</span>
                  {objectives.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeObjective(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input placeholder="Goal / objective" value={obj.objective} onChange={(e) => updateObjectiveField(idx, "objective", e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Success metric" value={obj.metric} onChange={(e) => updateObjectiveField(idx, "metric", e.target.value)} className="h-8 text-xs" />
                <Input type="date" value={obj.deadline} onChange={(e) => updateObjectiveField(idx, "deadline", e.target.value)} className="h-8 text-xs" />
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes (optional)</label>
          <Textarea placeholder="Additional context or manager notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
        </div>
      </HrSheet>
    </div>
  );
}
