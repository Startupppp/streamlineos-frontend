"use client";

import { memo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, User, ListChecks } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import {
  useCreateGoal,
  useUpdateGoal,
  type GoalDetail,
  type KeyResultMetric,
  type KeyResultInput,
} from "@/hooks/api/goals";
import { useChatOrgUsers } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { LEVEL_OPTIONS, STATUS_OPTIONS, METRIC_OPTIONS } from "./constants";

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  level: z.enum(["company", "team", "individual"]),
  status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]),
  ownerId: z.string(),
  startDate: z.string(),
  dueDate: z.string(),
});

interface GoalFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalDetail;
}

interface DraftKeyResult {
  title: string;
  metricType: KeyResultMetric;
  startValue: string;
  targetValue: string;
  unit: string;
}

const EMPTY_KR: DraftKeyResult = {
  title: "",
  metricType: "number",
  startValue: "0",
  targetValue: "100",
  unit: "",
};

interface KeyResultRowProps {
  kr: DraftKeyResult;
  index: number;
  onUpdate: (index: number, patch: Partial<DraftKeyResult>) => void;
  onRemove: (index: number) => void;
}

const KeyResultRow = memo(function KeyResultRow({ kr, index, onUpdate, onRemove }: KeyResultRowProps) {
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { title: e.target.value });
  }
  function handleMetricTypeChange(v: string) {
    const found = METRIC_OPTIONS.find((o) => o.value === v);
    if (found) onUpdate(index, { metricType: found.value });
  }
  function handleUnitChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { unit: e.target.value });
  }
  function handleStartValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { startValue: e.target.value });
  }
  function handleTargetValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, { targetValue: e.target.value });
  }
  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <Input
          placeholder="Key result title"
          className="flex-1"
          value={kr.title}
          onChange={handleTitleChange}
        />
        <AnimatedIconButton
          type="button"
          variant="ghost"
          size="icon"
          icon={Trash2Icon}
          iconSize={14}
          className="w-8 text-destructive hover:text-destructive shrink-0"
          onClick={handleRemove}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={kr.metricType} onValueChange={handleMetricTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Unit (optional)"
          className="text-xs"
          value={kr.unit}
          onChange={handleUnitChange}
        />
        <Input
          type="number"
          placeholder="Start"
          className="text-xs"
          value={kr.startValue}
          onChange={handleStartValueChange}
        />
        <Input
          type="number"
          placeholder="Target"
          className="text-xs"
          value={kr.targetValue}
          onChange={handleTargetValueChange}
        />
      </div>
    </div>
  );
});

type GoalFormValues = z.infer<typeof goalSchema>;

export function GoalFormSheet({
  open,
  onOpenChange,
  goal,
}: GoalFormSheetProps) {
  const isEdit = !!goal;
  const [keyResults, setKeyResults] = useState<DraftKeyResult[]>([]);

  const { data: orgUsers } = useChatOrgUsers(open);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const isPending = createGoal.isPending || updateGoal.isPending;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      level: goal?.level ?? "company",
      status: goal?.status ?? "not_started",
      ownerId: goal?.ownerId ?? "unassigned",
      startDate: goal?.startDate ?? "",
      dueDate: goal?.dueDate ?? "",
    },
  });

  function handleAddKeyResult() {
    setKeyResults((prev) => [...prev, { ...EMPTY_KR }]);
  }

  const handleRemoveKeyResult = useCallback((index: number) => {
    setKeyResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateKeyResult = useCallback((index: number, patch: Partial<DraftKeyResult>) => {
    setKeyResults((prev) =>
      prev.map((kr, i) => (i === index ? { ...kr, ...patch } : kr)),
    );
  }, []);

  function buildKeyResults(): KeyResultInput[] {
    return keyResults
      .filter((kr) => kr.title.trim())
      .map((kr) => ({
        title: kr.title.trim(),
        metricType: kr.metricType,
        startValue: Number(kr.startValue) || 0,
        targetValue: Number(kr.targetValue) || 0,
        currentValue: Number(kr.startValue) || 0,
        unit: kr.unit.trim() || undefined,
      }));
  }

  function handleSubmit(values: GoalFormValues) {
    const resolvedOwner = values.ownerId === "unassigned" ? null : values.ownerId;

    if (isEdit) {
      updateGoal.mutate(
        {
          id: goal.id,
          title: values.title.trim(),
          description: values.description.trim() || null,
          level: values.level,
          status: values.status,
          ownerId: resolvedOwner,
          startDate: values.startDate || null,
          dueDate: values.dueDate || null,
        },
        {
          onSuccess: () => {
            toast.success("Goal updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      return;
    }

    createGoal.mutate(
      {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        level: values.level,
        status: values.status,
        ownerId: resolvedOwner ?? undefined,
        startDate: values.startDate || undefined,
        dueDate: values.dueDate || undefined,
        keyResults: buildKeyResults(),
      },
      {
        onSuccess: () => {
          toast.success("Goal created");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-[520px]">
        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">
                {isEdit ? "Edit Goal" : "New Goal"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEdit
                  ? "Update objective details"
                  : "Define an objective and its key results"}
              </p>
            </div>
          </div>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody>
              <div className="px-6 py-4 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Objective</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Title <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Grow monthly active users" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} className="resize-none" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Level</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LEVEL_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Ownership & Timeline</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Owner</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {orgUsers?.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name ?? user.email ?? user.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Start Date</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Pick a date"
                              className="text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Due Date</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Pick a date"
                              className="text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {!isEdit && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ListChecks className="h-4 w-4" />
                        <span>Key Results</span>
                      </div>
                      <AnimatedIconButton
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={PlusIcon}
                        iconSize={14}
                        iconClassName="mr-1"
                        onClick={handleAddKeyResult}
                      >
                        Add
                      </AnimatedIconButton>
                    </div>

                    {keyResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Add measurable key results to track progress.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {keyResults.map((kr, index) => (
                          <KeyResultRow
                            key={index}
                            kr={kr}
                            index={index}
                            onUpdate={updateKeyResult}
                            onRemove={handleRemoveKeyResult}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SheetBody>

            <SheetFooter className="px-6 py-3 border-t shrink-0">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                className="flex-1 h-9"
                isPending={isPending}
                loadingText="Saving…"
              >
                {isEdit ? "Save Changes" : "Create Goal"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
