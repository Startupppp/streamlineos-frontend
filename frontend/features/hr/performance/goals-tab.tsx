"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useHrGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useHrEmployees,
  type HrGoal,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Plus,
  Calendar,
  Trash2,
  Pencil,
  ChevronsUpDown,
  Check,
} from "lucide-react";
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
import type { Employee } from "@/types/hr";

const goalSchema = z
  .object({
    userId: z.string(),
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(100, "Title must be at most 100 characters")
      .regex(/[a-zA-Z0-9]/, "Must contain at least one letter or number")
      .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces"),
    description: z
      .string()
      .max(1000, "Description must be at most 1000 characters")
      .optional(),
    targetValue: z
      .string()
      .refine((v) => {
        if (!v) return true;
        const n = Number(v);
        return !isNaN(n) && n > 0 && n <= 9_999_999_999;
      }, "Target value must be a positive number (max 10 digits)")
      .optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

type GoalFormValues = z.infer<typeof goalSchema>;

export function GoalsTab() {
  const { data: goals, isLoading } = useHrGoals();
  const { data: employeesRaw } = useHrEmployees();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<HrGoal | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const goalForm = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      userId: "",
      title: "",
      description: "",
      targetValue: "",
      startDate: "",
      endDate: "",
    },
  });

  const employees = useMemo(
    () =>
      (
        (Array.isArray(employeesRaw)
          ? employeesRaw
          : ((employeesRaw as { data?: Employee[] })?.data ?? [])) as Employee[]
      ).filter((e) => !!e.id),
    [employeesRaw],
  );

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
        userId: "",
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
      if (!editGoal && !data.userId) {
        goalForm.setError("userId", { message: "Please select an employee" });
        return;
      }

      if (!editGoal) {
        const today = new Date().toISOString().slice(0, 10);
        if (data.startDate < today) {
          toast.error("Start date cannot be in the past");
          return;
        }
      }

      const trimmedTitle = data.title.trim();
      const trimmedDesc = data.description?.trim();

      if (editGoal) {
        updateGoal.mutate(
          {
            goalId: editGoal.id,
            title: trimmedTitle,
            description: trimmedDesc || undefined,
            targetValue:
              data.targetValue ? Number(data.targetValue) : undefined,
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
          targetValue:
            data.targetValue ? Number(data.targetValue) : undefined,
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
    [editGoal, createGoal, updateGoal, resetForm, goalForm],
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
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
              ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : goal.status === "IN_PROGRESS"
                ? "border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                : "border-border bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

            return (
              <Card
                key={goal.id}
                className={`rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 transition-shadow duration-200 hover:shadow-md ${accentClass}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
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
                      <div className="h-5 w-5 rounded-md bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                        <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Due {format(new Date(goal.endDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Progress
                      </span>
                      <span className="text-[10px] font-bold text-foreground">
                        {progress}%
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      className={cn(
                        "h-1.5",
                        isCompleted
                          ? "[&>div]:bg-emerald-500"
                          : "[&>div]:bg-blue-500",
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
          {!editGoal && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employee</label>
              <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userPickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {employees.find((e) => e.id === watchedUserId)?.name ??
                        employees.find((e) => e.id === watchedUserId)?.email ??
                        "Select employee"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
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
                              goalForm.setValue("userId", e.id);
                              setUserPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                watchedUserId === e.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {e.name ?? e.email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {goalForm.formState.errors.userId?.message && (
                <p className="text-xs text-destructive">
                  {goalForm.formState.errors.userId.message}
                </p>
              )}
            </div>
          )}
          <FormField
            control={goalForm.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Complete Q2 OKRs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={goalForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Goal details..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={goalForm.control}
            name="targetValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Value</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={goalForm.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={goalForm.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
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
