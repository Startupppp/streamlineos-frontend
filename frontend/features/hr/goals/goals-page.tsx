"use client";

import { useState, type ChangeEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState } from "@/components/shared/loading-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useHrGoals, useCreateHrGoal, useUpdateGoal, type HrGoal } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";
import {
  clearEndIfInvalid,
  isEndInvalidForStart,
} from "@/lib/date-constraints";
import { getTodayString } from "@/lib/date-utils";
import { GoalGrid } from "@/features/hr/goals/goal-card";
import { CreateGoalSheet, type CreateGoalForm } from "@/features/hr/goals/create-goal-sheet";
import { UpdateProgressDialog } from "@/features/hr/goals/update-progress-dialog";

const EMPTY_FORM: CreateGoalForm = {
  title: "",
  description: "",
  type: "OKR",
  startDate: "",
  endDate: "",
  targetValue: "",
  unit: "",
  userId: "",
};

export function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<HrGoal | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [form, setForm] = useState<CreateGoalForm>(EMPTY_FORM);

  const { data: goals = [], isLoading, isError, error, refetch } = useHrGoals();
  const createGoal = useCreateHrGoal();
  const updateGoal = useUpdateGoal();
  const pageState = usePageState({ permission: "hr:performance:view", isLoading, isError, error });
  const canCreate = useCan("hr:performance:manage");
  // PATCH /hr/performance/goals/:id is `hr:performance:view` (performance.controller.ts:109).
  const canUpdate = useCan("hr:performance:view");
  const editProgress = canUpdate ? handleOpenProgress : undefined;

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
    setForm((prev) => ({
      ...prev,
      startDate: value,
      endDate: clearEndIfInvalid(value, prev.endDate, "after"),
    }));
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
    const today = getTodayString();
    if (form.startDate < today || form.endDate < today) {
      toast.error("Goal dates cannot be in the past");
      return;
    }
    if (isEndInvalidForStart(form.startDate, form.endDate, "after")) {
      toast.error("End date must be after start date");
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
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleOpenProgress(goal: HrGoal) {
    setProgressGoal(goal);
    setProgressValue(goal.progress);
  }

  async function handleSaveProgress() {
    if (!progressGoal) return;
    try {
      await updateGoal.mutateAsync({
        goalId: progressGoal.id,
        progress: progressValue,
      });
      toast.success("Progress updated");
      setProgressGoal(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
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

  if (pageState.kind === "loading") {
    return (
      <PageWrapper
        title="Goals & OKRs"
        subtitle="Track your personal and team goals"
      >
        <LoadingState variant="cards" rows={9} />
      </PageWrapper>
    );
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageWrapper
        title="Goals & OKRs"
        subtitle="Track your personal and team goals"
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Track your personal and team goals"
      actions={
        canCreate && <CreateGoalSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          form={form}
          isPending={createGoal.isPending}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
          onTypeChange={handleTypeChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onTargetValueChange={handleTargetValueChange}
          onUnitChange={handleUnitChange}
          onUserIdChange={handleUserIdChange}
          onCreate={handleCreate}
        />
      }
    >
      <Tabs defaultValue="all" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="all">
            All Goals ({filtered.length})
          </TabsTrigger>
          <TabsTrigger value="mine">
            Open ({myGoals.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
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
            <GoalGrid goals={filtered} onEditProgress={editProgress} />
          </TabsContent>
          <TabsContent
            value="mine"
            className="mt-0 flex min-h-0 flex-1 flex-col"
          >
            <GoalGrid goals={myGoals} onEditProgress={editProgress} />
          </TabsContent>
          <TabsContent
            value="completed"
            className="mt-0 flex min-h-0 flex-1 flex-col"
          >
            <GoalGrid goals={completed} onEditProgress={editProgress} />
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      <UpdateProgressDialog
        goal={progressGoal}
        progressValue={progressValue}
        isPending={updateGoal.isPending}
        onOpenChange={handleProgressDialogChange}
        onRangeChange={handleProgressRangeChange}
        onNumberChange={handleProgressNumberChange}
        onSave={handleSaveProgress}
      />
    </PageWrapper>
  );
}
