"use client";

import { useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetBody } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CONTENT_FILL_PANEL,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useHrGoals, useCreateHrGoal, type HrGoal } from "@/hooks/api/hr";
import { useUpdateGoal } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  DRAFT: "bg-muted text-muted-foreground border-border",
  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
};

const TYPE_COLORS: Record<string, string> = {
  OKR: "bg-muted text-foreground border-border",
  STRETCH: "bg-muted text-foreground border-border",
  text: "bg-muted text-foreground border-border",
};

function CircularProgress({ value }: { value: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="rotate-[-90deg]">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="36"
        y="36"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-xs font-semibold"
        style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px", fontSize: "11px" }}
      >
        {value}%
      </text>
    </svg>
  );
}

function GoalCard({
  goal,
  index,
  onEditProgress,
}: {
  goal: HrGoal;
  index: number;
  onEditProgress: (goal: HrGoal) => void;
}) {
  function handleEditProgress() {
    onEditProgress(goal);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.06 }}
      className="bg-card rounded-lg border border-border p-5 flex flex-col gap-4"
    >
      <div className="flex items-start gap-4">
        <CircularProgress value={goal.progress} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{goal.title}</h3>
          {goal.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge className={`text-xs ${TYPE_COLORS[goal.type] ?? "bg-muted text-muted-foreground border-border"}`}>
              {goal.type}
            </Badge>
            <Badge className={`text-xs ${STATUS_COLORS[goal.status] ?? "bg-muted text-muted-foreground border-border"}`}>
              {goal.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="w-3.5 h-3.5" />
        <span>{new Date(goal.startDate).toLocaleDateString()} ??? {new Date(goal.endDate).toLocaleDateString()}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{goal.progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={handleEditProgress}
      >
        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
        Update Progress
      </Button>
    </motion.div>
  );
}

function GoalGrid({
  goals,
  onEditProgress,
}: {
  goals: HrGoal[];
  onEditProgress: (g: HrGoal) => void;
}) {
  if (goals.length === 0) {
    return (
      <EmptyState
        illustrationPreset="default"
        title="No goals yet"
        description="Create your first goal to start tracking progress"
        className={CONTENT_FILL_PANEL}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {goals.map((g, i) => (
        <GoalCard key={g.id} goal={g} index={i} onEditProgress={onEditProgress} />
      ))}
    </div>
  );
}

export default function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<HrGoal | null>(null);
  const [progressValue, setProgressValue] = useState(0);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "OKR",
    startDate: "",
    endDate: "",
    targetValue: "",
    unit: "",
    userId: "",
  });

  const { data: goals = [], isLoading, isError, refetch } = useHrGoals();
  const createGoal = useCreateHrGoal();
  const updateGoal = useUpdateGoal();

  const filtered = goals.filter(
    (g) => statusFilter === "ALL" || g.status === statusFilter,
  );
  const myGoals = goals.filter((g) => g.status !== "COMPLETED");
  const completed = goals.filter((g) => g.status === "COMPLETED");

  function handleFormChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    handleFormChange("title", e.target.value);
  }
  function handleDescriptionChange(e: ChangeEvent<HTMLInputElement>) {
    handleFormChange("description", e.target.value);
  }
  function handleTypeChange(v: string) {
    handleFormChange("type", v);
  }
  function handleStartDateChange(value: string) {
    handleFormChange("startDate", value);
  }
  function handleEndDateChange(value: string) {
    handleFormChange("endDate", value);
  }
  function handleTargetValueChange(e: ChangeEvent<HTMLInputElement>) {
    handleFormChange("targetValue", e.target.value);
  }
  function handleUnitChange(e: ChangeEvent<HTMLInputElement>) {
    handleFormChange("unit", e.target.value);
  }
  function handleUserIdChange(value: string) {
    handleFormChange("userId", value);
  }

  async function handleCreate() {
    if (!form.title || !form.startDate || !form.endDate) {
      toast.error("Title, start date, and end date are required");
      return;
    }
    try {
      await createGoal.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        targetValue: form.targetValue || undefined,
        unit: form.unit || undefined,
        userId: form.userId,
      });
      toast.success("Goal created");
      setSheetOpen(false);
      setForm({ title: "", description: "", type: "OKR", startDate: "", endDate: "", targetValue: "", unit: "", userId: "" });
    } catch {
      toast.error("Failed to create goal");
    }
  }

  function handleOpenProgress(goal: HrGoal) {
    setProgressGoal(goal);
    setProgressValue(goal.progress);
  }

  async function handleSaveProgress() {
    if (!progressGoal) return;
    try {
      await updateGoal.mutateAsync({ goalId: progressGoal.id, progress: progressValue });
      toast.success("Progress updated");
      setProgressGoal(null);
    } catch {
      toast.error("Failed to update progress");
    }
  }

  function handleProgressDialogChange(open: boolean) {
    if (!open) setProgressGoal(null);
  }

  function handleProgressRangeChange(e: ChangeEvent<HTMLInputElement>) {
    setProgressValue(Number(e.target.value));
  }

  function handleProgressNumberChange(e: ChangeEvent<HTMLInputElement>) {
    setProgressValue(Math.min(100, Math.max(0, Number(e.target.value))));
  }

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <PageWrapper title="Goals & OKRs" subtitle="Track your personal and team goals">
        <LoadingState variant="cards" rows={9} />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Goals & OKRs" subtitle="Track your personal and team goals">
        <ErrorState
          title="Failed to load goals"
          description="We couldn't load your goals. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Track your personal and team goals"
      actions={
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-[420px] flex-col gap-0 overflow-hidden p-0">
            <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left gap-1">
              <SheetTitle>Create Goal</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Title *</Label>
                <Input
                  value={form.title}
                  onChange={handleTitleChange}
                  placeholder="Goal title"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Description</Label>
                <Input
                  value={form.description}
                  onChange={handleDescriptionChange}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type</Label>
                <Select value={form.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OKR">OKR</SelectItem>
                    <SelectItem value="STRETCH">Stretch</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Start Date *</Label>
                  <DatePicker value={form.startDate} onChange={handleStartDateChange} placeholder="Pick a date" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">End Date *</Label>
                  <DatePicker value={form.endDate} onChange={handleEndDateChange} placeholder="Pick a date" className="text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Target Value</Label>
                  <Input
                    className="text-sm"
                    value={form.targetValue}
                    onChange={handleTargetValueChange}
                    placeholder="e.g. 100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Unit</Label>
                  <Input
                    className="text-sm"
                    value={form.unit}
                    onChange={handleUnitChange}
                    placeholder="e.g. %"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Assignee</Label>
                <UserCombobox
                  value={form.userId}
                  onChange={handleUserIdChange}
                  placeholder="Select assignee"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createGoal.isPending}
              >
                {createGoal.isPending ? "Creating…" : "Create Goal"}
              </Button>
            </SheetBody>
          </SheetContent>
        </Sheet>
      }
    >
      <Tabs defaultValue="all" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="all" className="text-sm font-medium">All Goals ({filtered.length})</TabsTrigger>
          <TabsTrigger value="mine" className="text-sm font-medium">My Goals ({myGoals.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-sm font-medium">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <div className="flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("w-44", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AnimatePresence mode="wait">
          <TabsContent value="all" className="mt-0 flex min-h-0 flex-1 flex-col">
            <GoalGrid goals={filtered} onEditProgress={handleOpenProgress} />
          </TabsContent>
          <TabsContent value="mine" className="mt-0 flex min-h-0 flex-1 flex-col">
            <GoalGrid goals={myGoals} onEditProgress={handleOpenProgress} />
          </TabsContent>
          <TabsContent value="completed" className="mt-0 flex min-h-0 flex-1 flex-col">
            <GoalGrid goals={completed} onEditProgress={handleOpenProgress} />
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      <Dialog open={!!progressGoal} onOpenChange={handleProgressDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          {progressGoal && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">{progressGoal.title}</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Progress: {progressValue}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={handleProgressRangeChange}
                  className="w-full"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={handleProgressNumberChange}
                />
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSaveProgress}
                disabled={updateGoal.isPending}
              >
                {updateGoal.isPending ? "Saving…" : "Save Progress"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
