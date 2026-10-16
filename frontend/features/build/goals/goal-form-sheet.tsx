"use client";

import { useState, useCallback, useMemo } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
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
import { useSubmitGuard } from "@/hooks/common/use-submit-guard";
import {
  useCreateGoal,
  useGoals,
  useUpdateGoal,
  type GoalDetail,
} from "@/hooks/api/goals";
import { useChatOrgUsers } from "@/hooks/api/chat-core-read";
import { getErrorMessage } from "@/lib/get-error-message";
import { getApiErrorCode } from "@/lib/api-envelope";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
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
import { buildGoalConflictDiffs } from "./goal-conflict-diffs";

interface GoalFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalDetail;
  managedProductId?: number;
}

export function GoalFormSheet({
  open,
  onOpenChange,
  goal,
  managedProductId,
}: GoalFormSheetProps) {
  const isEdit = !!goal;
  const [keyResults, setKeyResults] = useState<DraftKeyResult[]>([]);
  const [conflictFields, setConflictFields] = useState<
    TicketConflictFieldDiff[] | null
  >(null);

  const { data: orgUsers } = useChatOrgUsers(open);
  const { data: goalOptions } = useGoals({ limit: 100 }, { enabled: open });
  const parentOptions = useMemo(
    () => (goalOptions ?? []).filter((option) => option.id !== goal?.id),
    [goalOptions, goal?.id],
  );
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
      ownerId: goal?.owner?.id ?? "unassigned",
      parentGoalId: goal?.parentGoalId != null ? String(goal.parentGoalId) : "none",
      startDate: goal?.startDate ?? "",
      dueDate: goal?.dueDate ?? "",
    },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      form.reset();
      setKeyResults([]);
      setConflictFields(null);
    }
    onOpenChange(next);
  }, [form, onOpenChange]);

  const handleAddKeyResult = useCallback(() => {
    setKeyResults((prev) => [...prev, { ...EMPTY_KR }]);
  }, []);

  const handleRemoveKeyResult = useCallback((index: number) => {
    setKeyResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateKeyResult = useCallback(
    (index: number, patch: Partial<DraftKeyResult>) => {
      setKeyResults((prev) =>
        prev.map((kr, i) => (i === index ? { ...kr, ...patch } : kr)),
      );
    },
    [],
  );

  function handleSubmit(values: ProjectGoalFormValues, settle: () => void) {
    const resolvedOwner =
      values.ownerId === "unassigned" ? null : values.ownerId;
    const resolvedParent =
      values.parentGoalId === "none" ? null : Number(values.parentGoalId);

    if (isEdit) {
      updateGoal.mutate(
        {
          id: goal.id,
          version: goal.version,
          title: values.title.trim(),
          description: values.description.trim() || null,
          level: values.level,
          status: values.status,
          ownerId: resolvedOwner,
          startDate: values.startDate || null,
          dueDate: values.dueDate || null,
          ...(resolvedParent !== goal.parentGoalId ? { parentGoalId: resolvedParent } : {}),
        },
        {
          onSuccess: () => {
            toast.success("Goal updated");
            handleOpenChange(false);
          },
          onError: (e) => {
            if (getApiErrorCode(e) === "PROJECTS_TICKET_CONFLICT") {
              setConflictFields(buildGoalConflictDiffs(goal, values));
              return;
            }
            toast.error(getErrorMessage(e));
          },
          onSettled: settle,
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
        parentGoalId: resolvedParent ?? undefined,
        managedProductId,
        keyResults: buildKeyResults(keyResults),
      },
      {
        onSuccess: () => {
          toast.success("Goal created");
          handleOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
        onSettled: settle,
      },
    );
  }

  const submitGuard = useSubmitGuard(
    (values: ProjectGoalFormValues) => new Promise<void>((settle) => { handleSubmit(values, settle); }),
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-medium">
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
          <form
            onSubmit={form.handleSubmit(submitGuard.submit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody>
              <div className="space-y-5 px-6 pb-4">
                {conflictFields !== null ? (
                  <div
                    role="alert"
                    aria-label="Edit conflict"
                    className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2"
                  >
                    <p className="text-sm font-medium text-destructive">
                      This goal was modified while you were editing. Your
                      changes were not saved.
                    </p>
                    {conflictFields.length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {conflictFields.map((field) => (
                          <li
                            key={field.key}
                            className="rounded border border-border bg-background p-2 text-xs"
                          >
                            <span className="font-medium">{field.label}:</span>{" "}
                            <span className="text-muted-foreground">
                              {field.serverValue}
                            </span>
                            {" → "}
                            <span>{field.pendingValue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={() => setConflictFields(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
                <GoalObjectiveFields />
                <GoalOwnershipFields
                  isEdit={isEdit}
                  orgUsers={orgUsers}
                  parentOptions={parentOptions}
                />

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
                onClick={() => handleOpenChange(false)}
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
