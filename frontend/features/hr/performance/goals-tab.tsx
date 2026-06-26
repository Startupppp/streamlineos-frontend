"use client";

import { useState, useCallback, useMemo, type ChangeEvent } from "react";
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
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, Target, Calendar, MoreHorizontal, Trash2, Pencil, ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee, Goal } from "@/types/hr";

export function GoalsTab() {
  const { data: goals, isLoading } = useHrGoals();
  const { data: employeesRaw } = useHrEmployees();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const employees = useMemo(
    () => ((Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[]).filter((e) => !!e.id),
    [employeesRaw]
  );

  const resetForm = useCallback(() => {
    setUserId(""); setTitle(""); setDescription(""); setTargetValue(""); setStartDate(""); setEndDate(""); setEditGoal(null);
  }, []);

  const handleOpenEdit = useCallback((goal: Goal) => {
    setEditGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setTargetValue(goal.targetValue != null ? String(goal.targetValue) : "");
    setStartDate(typeof goal.startDate === "string" ? goal.startDate.slice(0, 10) : "");
    setEndDate(typeof goal.endDate === "string" ? goal.endDate.slice(0, 10) : "");
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!editGoal && !userId) { toast.error("Please select an employee"); return; }
    if (!trimmedTitle) { toast.error("Goal title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Goal title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 100) { toast.error("Goal title must be at most 100 characters"); return; }
    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) { toast.error("Goal title must contain at least one letter or number"); return; }
    if (/\s{2,}/.test(trimmedTitle)) { toast.error("Goal title cannot have consecutive spaces"); return; }
    if (trimmedDesc && trimmedDesc.length > 1000) { toast.error("Description must be at most 1000 characters"); return; }
    if (targetValue !== "") {
      const tv = Number(targetValue);
      if (isNaN(tv) || tv <= 0) { toast.error("Target value must be a positive number"); return; }
      if (tv > 9_999_999_999) { toast.error("Target value is too large (max 10 digits)"); return; }
    }
    if (!startDate) { toast.error("Start date is required"); return; }
    if (!endDate) { toast.error("End date is required"); return; }
    if (!editGoal) {
      const today = new Date().toISOString().slice(0, 10);
      if (startDate < today) { toast.error("Start date cannot be in the past"); return; }
    }
    if (endDate < startDate) { toast.error("End date must be after start date"); return; }

    if (editGoal) {
      updateGoal.mutate({
        goalId: editGoal.id,
        title: trimmedTitle,
        description: trimmedDesc || undefined,
        targetValue: targetValue !== "" ? Number(targetValue) : undefined,
        startDate,
        endDate,
      }, {
        onSuccess: () => { toast.success("Goal updated"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
      return;
    }

    createGoal.mutate({
      userId,
      title: trimmedTitle,
      description: trimmedDesc || undefined,
      targetValue: targetValue !== "" ? Number(targetValue) : undefined,
      currentValue: 0,
      startDate,
      endDate,
    }, {
      onSuccess: () => { toast.success("Goal created"); setSheetOpen(false); resetForm(); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, title, description, targetValue, startDate, endDate, editGoal, createGoal, updateGoal, resetForm]);

  const handleTargetValueChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || (/^\d{1,10}(\.\d{0,4})?$/.test(v) && Number(v) > 0)) setTargetValue(v);
  }, []);

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

  const handleOpenSheet = useCallback(() => { resetForm(); setSheetOpen(true); }, [resetForm]);
  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value), []);
  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value), []);

  if (isLoading) {
    return <LoadingState variant="cards" rows={4} />;
  }

  const goalsList = Array.isArray(goals) ? goals : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{goalsList.length} goals</p>
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Goal
        </Button>
      </div>

      {goalsList.length === 0 ? (
        <EmptyState icon={Target} title="No goals set yet" compact />
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
                      <DropdownMenuItem onClick={() => handleOpenEdit(goal)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</DropdownMenuItem>
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

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }} title={editGoal ? "Edit Goal" : "Create Goal"} onSubmit={handleSave} submitLabel={editGoal ? "Save Changes" : "Create"} isPending={createGoal.isPending || updateGoal.isPending}>
        {!editGoal && <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={userPickerOpen} className="w-full justify-between font-normal">
                <span className="truncate">{employees.find((e) => e.id === userId)?.name ?? employees.find((e) => e.id === userId)?.email ?? "Select employee"}</span>
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
                      <CommandItem key={e.id} value={`${e.name ?? ""} ${e.email}`} onSelect={() => { setUserId(e.id); setUserPickerOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", userId === e.id ? "opacity-100" : "opacity-0")} />
                        {e.name ?? e.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="e.g., Complete Q2 OKRs" value={title} onChange={handleTitleChange} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Goal details..." value={description} onChange={handleDescriptionChange} rows={3} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Value</label>
          <Input
            inputMode="numeric"
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

      <ConfirmDialog
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
