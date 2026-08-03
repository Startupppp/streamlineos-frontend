"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Target } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateGoal,
  useUpdateGoal,
  type GoalDetail,
} from "@/hooks/api/goals";
import { useChatOrgUsers } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  projectGoalFormSchema,
  type ProjectGoalFormValues,
} from "./goal-form-schema";
import { GoalObjectiveFields } from "./goal-objective-fields";
import { GoalOwnershipFields } from "./goal-ownership-fields";
import {
  GoalKeyResultsPanel,
  buildKeyResults,
  type DraftKeyResult,
  EMPTY_KR,
} from "./goal-key-results";

interface GoalFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalDetail;
}

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

  const form = useForm<ProjectGoalFormValues>({
    resolver: zodResolver(projectGoalFormSchema),
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

  const handleAddKeyResult = useCallback(() => {
    setKeyResults((prev) => [...prev, { ...EMPTY_KR }]);
  }, []);

  const handleRemoveKeyResult = useCallback((index: number) => {
    setKeyResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateKeyResult = useCallback((index: number, patch: Partial<DraftKeyResult>) => {
    setKeyResults((prev) =>
      prev.map((kr, i) => (i === index ? { ...kr, ...patch } : kr)),
    );
  }, []);

  function handleSubmit(values: ProjectGoalFormValues) {
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
        keyResults: buildKeyResults(keyResults),
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
                <GoalObjectiveFields />
                <GoalOwnershipFields isEdit={isEdit} orgUsers={orgUsers} />

                {!isEdit && (
                  <GoalKeyResultsPanel
                    keyResults={keyResults}
                    onAdd={handleAddKeyResult}
                    onUpdate={updateKeyResult}
                    onRemove={handleRemoveKeyResult}
                  />
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
