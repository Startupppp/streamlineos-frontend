"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateEngagement,
  useUpdateEngagement,
} from "@/hooks/api/directory/workers";
import { getErrorMessage } from "@/lib/get-error-message";
import type { WorkerEngagement } from "@/types/directory/workers";
import {
  EMPTY_WORKER_ENGAGEMENT_FORM_VALUES,
  workerEngagementFormSchema,
  type WorkerEngagementFormValues,
} from "./worker-engagement-form-schema";
import {
  getEngagementStatusLabel,
  getWorkerEngagementPeriodLabel,
  WORKER_TYPE_OPTIONS,
} from "./worker-engagement-presentation";
import {
  findConflictingWorkerEngagement,
  getWorkerEngagementDefaults,
} from "./worker-engagement-rules";

interface WorkerEngagementFormProps {
  workerId: string;
  engagements: WorkerEngagement[];
  editingEngagement: WorkerEngagement | null;
  onSuccess: () => void;
  onEditCancelled: () => void;
}

export function WorkerEngagementForm({
  workerId,
  engagements,
  editingEngagement,
  onSuccess,
  onEditCancelled,
}: WorkerEngagementFormProps) {
  const createEngagement = useCreateEngagement();
  const updateEngagement = useUpdateEngagement();
  const [expanded, setExpanded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEditing = editingEngagement !== null;
  const isPending = isEditing
    ? updateEngagement.isPending
    : createEngagement.isPending;

  const form = useForm<WorkerEngagementFormValues>({
    resolver: zodResolver(workerEngagementFormSchema),
    defaultValues: getWorkerEngagementDefaults(editingEngagement),
  });
  const { reset } = form;

  function handleToggleExpand() {
    setExpanded((previousExpanded) => !previousExpanded);
    setSubmitError(null);
    if (!expanded) reset(EMPTY_WORKER_ENGAGEMENT_FORM_VALUES);
  }

  function handleSubmit(values: WorkerEngagementFormValues) {
    setSubmitError(null);
    const conflictingEngagement = findConflictingWorkerEngagement(
      { startsOn: values.startsOn, endsOn: values.endsOn },
      engagements,
      editingEngagement?.workerEngagementId,
    );
    if (conflictingEngagement) {
      const resolution =
        conflictingEngagement.status === "PLANNED"
          ? "Cancel that plan above, or choose dates outside its period."
          : "End that active engagement above, or choose dates outside its period.";
      setSubmitError(
        "These dates overlap the " +
          getEngagementStatusLabel(conflictingEngagement.status).toLowerCase() +
          " engagement for " +
          getWorkerEngagementPeriodLabel(conflictingEngagement) +
          ". " +
          resolution,
      );
      return;
    }

    const activePrimaryEngagement = engagements.find(
      (engagement) =>
        engagement.workerEngagementId !==
          editingEngagement?.workerEngagementId &&
        engagement.status === "ACTIVE" &&
        engagement.isPrimary,
    );
    if (values.isPrimary && activePrimaryEngagement) {
      setSubmitError(
        "This worker already has a primary engagement. Unmark Primary, or terminate the current primary engagement first.",
      );
      return;
    }

    if (editingEngagement) {
      updateEngagement.mutate(
        {
          workerId,
          workerEngagementId: editingEngagement.workerEngagementId,
          expectedVersion: editingEngagement.rowVersion,
          startsOn: values.startsOn,
          endsOn: values.endsOn || null,
          workerType: values.workerType,
          designation: values.designation || null,
        },
        {
          onSuccess: () => {
            toast.success("Engagement updated");
            reset(EMPTY_WORKER_ENGAGEMENT_FORM_VALUES);
            setSubmitError(null);
            setExpanded(false);
            onSuccess();
          },
          onError: (mutationError) =>
            setSubmitError(getErrorMessage(mutationError)),
        },
      );
      return;
    }

    createEngagement.mutate(
      {
        workerId,
        startsOn: values.startsOn,
        endsOn: values.endsOn || undefined,
        workerType: values.workerType,
        isPrimary: values.isPrimary,
        designation: values.designation || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Engagement added");
          reset(EMPTY_WORKER_ENGAGEMENT_FORM_VALUES);
          setSubmitError(null);
          setExpanded(false);
          onSuccess();
        },
        onError: (mutationError) =>
          setSubmitError(getErrorMessage(mutationError)),
      },
    );
  }

  function handleCancel() {
    setExpanded(false);
    setSubmitError(null);
    reset(EMPTY_WORKER_ENGAGEMENT_FORM_VALUES);
    if (isEditing) onEditCancelled();
  }

  if (!expanded && !isEditing) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-xs"
        onClick={handleToggleExpand}
      >
        + Add engagement
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">
          {isEditing ? "Edit planned engagement" : "New engagement"}
        </p>
        {isEditing ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Correct the schedule or role details. The original record remains in
            the audit history.
          </p>
        ) : null}
      </div>
      {submitError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      ) : null}
      <Form {...form}>
        <form
          id="engagement-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-3"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startsOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endsOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date (optional)</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Open-ended"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="workerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Worker type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {WORKER_TYPE_OPTIONS.map((workerTypeOption) => (
                      <SelectItem
                        key={workerTypeOption.value}
                        value={workerTypeOption.value}
                      >
                        {workerTypeOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Senior Engineer" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isEditing ? (
            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem>
                  <label className="flex cursor-pointer items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="engagement-is-primary"
                      />
                    </FormControl>
                    <span className="text-sm">Mark as primary engagement</span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              form="engagement-form"
              size="sm"
              isPending={isPending}
              loadingText="Savingâ€¦"
            >
              {isEditing ? "Save changes" : "Add engagement"}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}
