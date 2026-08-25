"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useHrGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  type HrGoal,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Form } from "@/components/ui/form";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { Plus, Calendar, Trash2, Pencil } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyGoalsIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildGoalSchema, type GoalFormValues } from "./goal-schema";
import { GoalFormFields } from "./goal-form-fields";

export function GoalsTab() {
  const { data: goals, isLoading } = useHrGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<HrGoal | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const isEditRef = useRef(false);
  isEditRef.current = !!editGoal;

  const goalForm = useForm<GoalFormValues>({
    resolver: (values, context, options) =>
      zodResolver(
        buildGoalSchema({
          requireEmployee: !isEditRef.current,
          enforceFutureDates: !isEditRef.current,
        }),
      )(values, context, options),
    defaultValues: {
      userId: "",
      title: "",
      description: "",
      targetValue: "",
      startDate: "",
      endDate: "",
    },
  });

  const resetForm = useCallback(() => {
    goalForm.reset({
      userId: "",
      title: "",
      description: "",
      targetValue: "",
      startDate: "",
      endDate: "",
    });
    setEditGoal(null);
  }, [goalForm]);

  const handleOpenEdit = useCallback(
    (goal: HrGoal) => {
      setEditGoal(goal);
      goalForm.reset({
        userId: goal.userId ?? "",
        title: goal.title,
        description: goal.description ?? "",
        targetValue: goal.targetValue != null ? String(goal.targetValue) : "",
        startDate:
          typeof goal.startDate === "string" ? goal.startDate.slice(0, 10) : "",
        endDate:
          typeof goal.endDate === "string" ? goal.endDate.slice(0, 10) : "",
      });
      setSheetOpen(true);
    },
    [goalForm],
  );

  const handleSave = useCallback(
    (data: GoalFormValues) => {
      const trimmedTitle = data.title.trim();
      const trimmedDesc = data.description?.trim();
      const targetValue = Number(data.targetValue);

      if (editGoal) {
        updateGoal.mutate(
          {
            goalId: editGoal.id,
            title: trimmedTitle,
            description: trimmedDesc || undefined,
            targetValue,
            startDate: data.startDate,
            endDate: data.endDate,
          },
          {
            onSuccess: () => {
              toast.success("Goal updated");
              setSheetOpen(false);
              resetForm();
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
        return;
      }

      createGoal.mutate(
        {
          userId: data.userId,
          title: trimmedTitle,
          description: trimmedDesc || undefined,
          targetValue,
          currentValue: 0,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        {
          onSuccess: () => {
            toast.success("Goal created");
            setSheetOpen(false);
            resetForm();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [editGoal, createGoal, updateGoal, resetForm],
  );

  const watchedStartDate = goalForm.watch("startDate");
  const watchedEndDate = goalForm.watch("endDate");
  const startBounds = planningStartPickerProps({
    existingValue: editGoal ? watchedStartDate : undefined,
  });
  const endBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "after",
    existingValue: editGoal ? watchedEndDate : undefined,
  });

  const handleStartDateChange = useCallback(
    (value: string) => {
      goalForm.setValue("startDate", value, { shouldValidate: true });
      const currentEnd = goalForm.getValues("endDate") ?? "";
      const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
      if (nextEnd !== currentEnd) {
        goalForm.setValue("endDate", nextEnd, { shouldValidate: true });
      }
    },
    [goalForm],
  );

  const handleProgressUpdate = useCallback(
    (goalId: number, progress: number) => {
      const newProgress = Math.min(100, Math.max(0, progress));
      updateGoal.mutate(
        {
          goalId,
          progress: newProgress,
          status: newProgress >= 100 ? "COMPLETED" : "IN_PROGRESS",
        },
        {
          onSuccess: () => toast.success("Progress updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateGoal],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteGoal.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Goal deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteGoal]);

  const handleOpenSheet = useCallback(() => {
    resetForm();
    setSheetOpen(true);
  }, [resetForm]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const watchedUserId = goalForm.watch("userId");

  if (isLoading) {
    return <LoadingState variant="cards" rows={9} />;
  }

  const goalsList = Array.isArray(goals) ? goals : [];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
            Total Goals
          </p>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {goalsList.length}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          New Goal
        </Button>
      </div>

      {goalsList.length === 0 ? (
        <EmptyState
          illustration={<EmptyGoalsIllustration className="h-full w-full" />}
          title="No goals set yet"
          description="Set a goal to track progress and keep your team aligned."
          action={{ label: "New Goal", onClick: handleOpenSheet }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goalsList.map((goal) => {
            const progress = goal.progress ?? 0;
            const isCompleted = goal.status === "COMPLETED" || progress >= 100;
            const accentClass = isCompleted
              ? "border-l-emerald-500"
              : progress > 0
                ? "border-l-blue-500"
                : "border-l-border";
            const statusBadgeClass = isCompleted
              ? "border-status-success-rule bg-status-success-surface text-status-success-ink"
              : goal.status === "IN_PROGRESS"
                ? "border-status-info-rule bg-status-info-surface text-status-info-ink"
                : "border-border bg-muted text-muted-foreground";

            return (
              <Card
                key={goal.id}
                className={`rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4 transition-shadow duration-200 hover:shadow-md ${accentClass}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      className={`inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
                    >
                      {(goal.status ?? "IN_PROGRESS").replace("_", " ")}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <AnimatedIconButton
                          icon={EllipsisIcon}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
                          aria-label="Goal actions"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(goal)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleProgressUpdate(
                              goal.id,
                              (goal.progress ?? 0) + 10,
                            )
                          }
                        >
                          +10% Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleProgressUpdate(goal.id, 100)}
                        >
                          Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(goal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <TruncatedText
                    text={goal.title}
                    className="text-sm font-semibold text-foreground leading-tight"
                  />
                  {goal.endDate && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-md bg-status-warning-surface flex items-center justify-center shrink-0">
                        <Calendar className="h-3 w-3 text-status-warning-ink" />
                      </div>
                      <p className="text-dense font-medium text-muted-foreground">
                        Due {format(new Date(goal.endDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">
                        Progress
                      </span>
                      <span className="text-micro font-bold text-foreground">
                        {progress}%
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      className={cn(
                        "h-1.5",
                        isCompleted
                          ? "[&>div]:bg-status-success-fill"
                          : "[&>div]:bg-status-info-fill",
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setSheetOpen(open);
        }}
        title={editGoal ? "Edit Goal" : "Create Goal"}
        onSubmit={goalForm.handleSubmit(handleSave)}
        submitLabel={editGoal ? "Save Changes" : "Create"}
        isPending={createGoal.isPending || updateGoal.isPending}
      >
        <Form {...goalForm}>
          <GoalFormFields
            form={goalForm}
            isEdit={!!editGoal}
            watchedUserId={watchedUserId}
            startBounds={startBounds}
            endBounds={endBounds}
            onStartDateChange={handleStartDateChange}
          />
        </Form>
      </HrSheet>

      <ConfirmSheet
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Goal"
        description="Are you sure you want to delete this goal? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        isPending={deleteGoal.isPending}
      />
    </div>
  );
}
