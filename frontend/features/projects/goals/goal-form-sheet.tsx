"use client";

import { memo, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
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
  type GoalLevel,
  type GoalStatus,
  type KeyResultMetric,
  type KeyResultInput,
} from "@/hooks/api/goals";
import { useChatOrgUsers } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { LEVEL_OPTIONS, STATUS_OPTIONS, METRIC_OPTIONS } from "./constants";

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

export function GoalFormSheet({
  open,
  onOpenChange,
  goal,
}: GoalFormSheetProps) {
  const isEdit = !!goal;
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [level, setLevel] = useState<GoalLevel>(goal?.level ?? "company");
  const [status, setStatus] = useState<GoalStatus>(
    goal?.status ?? "not_started",
  );
  const [ownerId, setOwnerId] = useState<string>(goal?.ownerId ?? "unassigned");
  const [startDate, setStartDate] = useState(goal?.startDate ?? "");
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? "");
  const [keyResults, setKeyResults] = useState<DraftKeyResult[]>([]);

  const { data: orgUsers } = useChatOrgUsers(open);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const isPending = createGoal.isPending || updateGoal.isPending;

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }
  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
  }
  function handleLevelChange(v: string) {
    const found = LEVEL_OPTIONS.find((o) => o.value === v);
    if (found) setLevel(found.value);
  }
  function handleGoalStatusChange(v: string) {
    const found = STATUS_OPTIONS.find((o) => o.value === v);
    if (found) setStatus(found.value);
  }
  function handleStartDateChange(value: string) {
    setStartDate(value);
  }
  function handleDueDateChange(value: string) {
    setDueDate(value);
  }
  function handleClose() {
    onOpenChange(false);
  }

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

  function handleSubmit() {
    if (!title.trim()) return;
    const resolvedOwner = ownerId === "unassigned" ? null : ownerId;

    if (isEdit) {
      updateGoal.mutate(
        {
          id: goal.id,
          title: title.trim(),
          description: description.trim() || null,
          level,
          status,
          ownerId: resolvedOwner,
          startDate: startDate || null,
          dueDate: dueDate || null,
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
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        status,
        ownerId: resolvedOwner ?? undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
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

        <SheetBody>
          <div className="px-6 py-4 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Objective</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-title" className="text-xs font-medium">
                  Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="goal-title"
                  placeholder="e.g. Grow monthly active users"
                  className=""
                  value={title}
                  onChange={handleTitleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="goal-description"
                  className="text-xs font-medium"
                >
                  Description
                </Label>
                <Textarea
                  id="goal-description"
                  rows={2}
                  className="resize-none"
                  value={description}
                  onChange={handleDescriptionChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Level</Label>
                  <Select value={level} onValueChange={handleLevelChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select value={status} onValueChange={handleGoalStatusChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Ownership & Timeline</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Owner</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {orgUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name ?? user.email ?? user.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="goal-start" className="text-xs font-medium">
                    Start Date
                  </Label>
                  <DatePicker
                    id="goal-start"
                    value={startDate}
                    onChange={handleStartDateChange}
                    placeholder="Pick a date"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-due" className="text-xs font-medium">
                    Due Date
                  </Label>
                  <DatePicker
                    id="goal-due"
                    value={dueDate}
                    onChange={handleDueDateChange}
                    placeholder="Pick a date"
                    className="text-sm"
                  />
                </div>
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
            onClick={handleClose}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            className="flex-1 h-9"
            disabled={!title.trim()}
            isPending={isPending}
            loadingText="Saving…"
            onClick={handleSubmit}
          >
            {isEdit ? "Save Changes" : "Create Goal"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
