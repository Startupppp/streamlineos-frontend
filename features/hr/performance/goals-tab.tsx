"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useHrGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useHrEmployees,
} from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Target, Calendar, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Employee, Goal } from "@/types/hr";

export function GoalsTab() {
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
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const handleCreate = useCallback(() => {
    if (!userId || !title || !startDate || !endDate) {
      toast.error("Employee, title, and dates are required");
      return;
    }
    createGoal.mutate(
      {
        userId,
        title,
        description: description || undefined,
        targetValue: targetValue ? Number(targetValue) : undefined,
        currentValue: 0,
        startDate,
        endDate,
      },
      {
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
      }
    );
  }, [userId, title, description, targetValue, startDate, endDate, createGoal]);

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
        }
      );
    },
    [updateGoal]
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

  const handleSheetOpen = useCallback(() => setSheetOpen(true), []);
  const handleDeleteDialogChange = useCallback(
    (open: boolean) => { if (!open) setDeleteId(null); },
    []
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    []
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
    []
  );
  const handleTargetValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTargetValue(e.target.value),
    []
  );
  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value),
    []
  );
  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value),
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

  const goalsList = Array.isArray(goals) ? goals : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{goalsList.length} goals</p>
        <Button size="sm" onClick={handleSheetOpen}>
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
            <GoalCard
              key={goal.id}
              goal={goal}
              onProgressUpdate={handleProgressUpdate}
              onDeleteRequest={setDeleteId}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Create Goal"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={createGoal.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={userId} onValueChange={setUserId}>
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
          <label className="text-sm font-medium">Title</label>
          <Input
            placeholder="e.g., Complete Q2 OKRs"
            value={title}
            onChange={handleTitleChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Goal details..."
            value={description}
            onChange={handleDescriptionChange}
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Value</label>
          <Input
            type="number"
            placeholder="100"
            value={targetValue}
            onChange={handleTargetValueChange}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={startDate} onChange={handleStartDateChange} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <Input type="date" value={endDate} onChange={handleEndDateChange} />
          </div>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
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

interface GoalCardProps {
  goal: Goal;
  onProgressUpdate: (goalId: number, progress: number) => void;
  onDeleteRequest: (id: number) => void;
}

function GoalCard({ goal, onProgressUpdate, onDeleteRequest }: GoalCardProps) {
  const handleIncrementProgress = useCallback(
    () => onProgressUpdate(goal.id, (goal.progress ?? 0) + 10),
    [onProgressUpdate, goal.id, goal.progress]
  );
  const handleMarkComplete = useCallback(
    () => onProgressUpdate(goal.id, 100),
    [onProgressUpdate, goal.id]
  );
  const handleDeleteRequest = useCallback(
    () => onDeleteRequest(goal.id),
    [onDeleteRequest, goal.id]
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <Badge
            variant={goal.status === "COMPLETED" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {(goal.status ?? "IN_PROGRESS").replace("_", " ")}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleIncrementProgress}>+10% Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={handleMarkComplete}>Mark Complete</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleDeleteRequest}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm font-semibold leading-tight">{goal.title}</p>
        {goal.endDate && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />Due {format(new Date(goal.endDate), "MMM d, yyyy")}
          </p>
        )}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{goal.progress ?? 0}%</span>
          </div>
          <Progress value={goal.progress ?? 0} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
