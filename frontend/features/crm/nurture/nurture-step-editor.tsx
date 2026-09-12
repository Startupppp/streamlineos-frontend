"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useReplaceNurtureSteps } from "@/hooks/api/crm/nurture";
import {
  MAX_SEQUENCE_STEPS,
  MIN_STEP_WAIT_HOURS,
  type NurtureSequenceStatus,
  type NurtureStep,
} from "@/types/crm/nurture";
import { cadenceOffsetsHours, describeWaitHours, stepsToFields } from "./nurture-cadence";
import { NurtureStepRow } from "./nurture-step-row";
import {
  nurtureStepsSchema,
  toReplaceStepsInput,
  type NurtureStepsFormValues,
} from "./nurture-steps-schema";

const EMPTY_TONE = statusToneClasses("warning");

interface NurtureStepEditorProps {
  nurtureSequenceId: string;
  steps: NurtureStep[];
  status: NurtureSequenceStatus;
  canManage: boolean;
}

/**
 * The cadence, edited whole and saved whole.
 *
 * `PUT` rather than a per-step form because step numbers must be dense: a gap
 * makes `waitMsForStep` return zero, and the sender fires two messages back to
 * back at somebody who was promised a fortnight between them. Numbering comes
 * from this array's order, so reordering is what editing a step number means and
 * there is no number field to get wrong.
 *
 * Nothing here writes a message. There is no subject, no body and no recipient
 * on this screen because there is none on the wire — a step says only "consider
 * writing to this person again, this long after the last one".
 */
export function NurtureStepEditor({
  nurtureSequenceId,
  steps,
  status,
  canManage,
}: NurtureStepEditorProps) {
  const replaceSteps = useReplaceNurtureSteps();

  const form = useForm<NurtureStepsFormValues>({
    resolver: zodResolver(nurtureStepsSchema),
    defaultValues: { steps: stepsToFields(steps) },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "steps" });

  const watched = form.watch("steps") ?? [];
  const offsets = cadenceOffsetsHours(
    watched.map((step) => ({ waitHours: Number(step.waitHours) })),
  );
  const totalHours = offsets.length === 0 ? 0 : (offsets[offsets.length - 1] ?? 0);
  const atStepLimit = fields.length >= MAX_SEQUENCE_STEPS;

  const handleAddStep = () => append({ waitHours: String(MIN_STEP_WAIT_HOURS) });

  const handleSubmit = (values: NurtureStepsFormValues) => {
    replaceSteps.mutate(
      { nurtureSequenceId, ...toReplaceStepsInput(values) },
      {
        onSuccess: (saved) => {
          toast.success("Cadence saved");
          /*
            Reset from what the server stored, not from what was typed. The
            waits come back clamped, so the clamp becomes visible in the fields
            rather than only in the notice under them.
          */
          form.reset({ steps: stepsToFields(saved) });
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-gap-field">
        <div className="flex flex-wrap items-start justify-between gap-gap-field">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">The cadence</h2>
            <p className="text-label text-muted-foreground">
              How long to wait before considering the next message. What it says is written at
              send time and judged before it leaves.
            </p>
          </div>
          {canManage ? (
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              type="button"
              variant="outline"
              size="sm"
              disabled={atStepLimit}
              onClick={handleAddStep}
            >
              Add step
            </AnimatedIconButton>
          ) : null}
        </div>

        {atStepLimit ? (
          <p className="text-micro text-muted-foreground">
            {MAX_SEQUENCE_STEPS} steps is the limit. Past that a nurture is a subscription nobody
            signed up for.
          </p>
        ) : null}

        {fields.length === 0 ? (
          <div
            className={cn(
              "rounded-md border p-3",
              EMPTY_TONE.surface,
              EMPTY_TONE.rule,
            )}
          >
            <p className={cn("text-sm font-medium", EMPTY_TONE.ink)}>This sequence has no steps</p>
            <p className="text-micro text-muted-foreground">
              {status === "active"
                ? "It is running with nothing to do, so every enrolment in it ends at its first wake. Add a step or pause it."
                : "It cannot be activated until it has at least one."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-gap-field">
            {fields.map((field, index) => (
              <li key={field.id}>
                <NurtureStepRow
                  form={form}
                  index={index}
                  offsetHours={offsets[index] ?? 0}
                  canManage={canManage}
                  onRemove={remove}
                />
              </li>
            ))}
          </ul>
        )}

        {form.formState.errors.steps?.root ? (
          <p role="alert" className="text-xs text-destructive">
            {form.formState.errors.steps.root.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-gap-field border-t border-border pt-3">
          <p className="text-label text-muted-foreground">
            {fields.length === 0
              ? "Nothing scheduled."
              : `${fields.length} ${fields.length === 1 ? "step" : "steps"} over ${describeWaitHours(totalHours)}.`}
          </p>
          {canManage ? (
            <LoadingButton
              type="submit"
              size="sm"
              isPending={replaceSteps.isPending}
              disabled={!form.formState.isDirty}
            >
              Save cadence
            </LoadingButton>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
