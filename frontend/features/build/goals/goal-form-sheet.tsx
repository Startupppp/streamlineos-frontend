"use client";

import { useState, useCallback } from "react";
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
import {
  useCreateGoal,
  useUpdateGoal,
  type GoalDetail,
} from "@/hooks/api/goals";
import { useChatOrgUsers } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
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
  const [conflictFields, setConflictFields] = useState<TicketConflictFieldDiff[] | null>(null);

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
      ownerId: goal?.owner?.id ?? "unassigned",
      startDate: goal?.startDate ?? "",
      dueDate: goal?.dueDate ?? "",
    },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

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
          version: goal.version,
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
          onError: (e) => {
            if (isApiError(e) && e.status === 409) {
              const diffs: TicketConflictFieldDiff[] = [];
              const comparisons: Array<{ key: string; label: string; serverValue: string; pendingValue: string }> = [
                { key: "title", label: "Title", serverValue: goal.title, pendingValue: values.title.trim() },
                { key: "description", label: "Description", serverValue: goal.description ?? "", pendingValue: values.description.trim() },
                { key: "level", label: "Level", serverValue: goal.level, pendingValue: values.level },
                { key: "status", label: "Status", serverValue: goal.status, pendingValue: values.status },
                { key: "startDate", label: "Start date", serverValue: goal.startDate ?? "", pendingValue: values.startDate ?? "" },
                { key: "dueDate", label: "Due date", serverValue: goal.dueDate ?? "", pendingValue: values.dueDate ?? "" },
              ];
              for (const { key, label, serverValue, pendingValue } of comparisons) {
                if (serverValue !== pendingValue) {
                  diffs.push({
                    key,
                    label,
                    serverValue: serverValue || "Not set",
                    pendingValue: pendingValue || "Not set",
                  });
                }
              }
              setConflictFields(diffs.length > 0 ? diffs : [{ key: "version", label: "Version", serverValue: "changed", pendingValue: "stale" }]);
              return;
            }
            toast.error(getErrorMessage(e));
          },
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
                {conflictFields !== null ? (
                  <div
                    role="alert"
                    aria-label="Edit conflict"
                    className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2"
                  >
                    <p className="text-sm font-medium text-destructive">
                      This goal was modified while you were editing. Your changes were not saved.
                    </p>
                    {conflictFields.length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {conflictFields.map((field) => (
                          <li key={field.key} className="rounded border border-border bg-background p-2 text-xs">
                            <span className="font-medium">{field.label}:</span>{" "}
                            <span className="text-muted-foreground">{field.serverValue}</span>
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
