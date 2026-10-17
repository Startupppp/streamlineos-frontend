"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import {
  declineFormSchema,
  overrideFormSchema,
  type DeclineFormValues,
  type OverrideFormValues,
} from "./opportunity-rice-schema";

interface OpportunityOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedScoreVersion: number;
  isSubmitting: boolean;
  onOverride: (data: OverrideFormValues) => void;
}

export function OpportunityOverrideDialog({
  open,
  onOpenChange,
  expectedScoreVersion,
  isSubmitting,
  onOverride,
}: OpportunityOverrideDialogProps) {
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Override RICE score"
      description="Provide an override score and a mandatory reason for the change."
      resolver={zodResolver(overrideFormSchema)}
      defaultValues={{ overrideScore: 0, reason: "", expectedScoreVersion }}
      onSubmit={onOverride}
      isSubmitting={isSubmitting}
      submitLabel="Save override"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="overrideScore"
            render={({ field }) => {
              function handleChange(e: { target: { value: string } }) {
                field.onChange(Number(e.target.value));
              }
              return (
                <FormItem>
                  <FormLabel>Override score</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className={FIELD_CONTROL_CLASS}
                      placeholder="e.g. 4.5"
                      value={field.value ?? ""}
                      onChange={handleChange}
                      data-testid="override-score-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Reason{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    aria-required="true"
                    className={FIELD_CONTROL_CLASS}
                    placeholder="Explain why this score is being overridden"
                    rows={3}
                    data-testid="override-reason-input"
                  />
                </FormControl>
                <FormMessage data-testid="override-reason-error" />
              </FormItem>
            )}
          />
          <Input
            type="hidden"
            {...form.register("expectedScoreVersion", { valueAsNumber: true })}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}

interface OpportunityDeclineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onDecline: (data: DeclineFormValues) => void;
}

const DECLINE_DEFAULTS: DeclineFormValues = { note: "" };

export function OpportunityDeclineDialog({
  open,
  onOpenChange,
  isSubmitting,
  onDecline,
}: OpportunityDeclineDialogProps) {
  function renderDeclineFields(form: UseFormReturn<DeclineFormValues>) {
    return (
      <FormField control={form.control} name="note" render={renderNoteField} />
    );
  }
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Decline opportunity"
      description="The reason is kept on the opportunity so the decision can be revisited later."
      resolver={zodResolver(declineFormSchema)}
      defaultValues={DECLINE_DEFAULTS}
      onSubmit={onDecline}
      isSubmitting={isSubmitting}
      submitLabel="Decline"
      resetOnOpen
    >
      {renderDeclineFields}
    </EntityFormDialog>
  );
}

function renderNoteField({
  field,
}: {
  field: ControllerRenderProps<DeclineFormValues, "note">;
}) {
  return (
    <FormItem>
      <FormLabel>Reason</FormLabel>
      <FormControl>
        <Textarea
          {...field}
          className={FIELD_CONTROL_CLASS}
          placeholder="Why is this opportunity not being pursued?"
          rows={3}
          data-testid="decline-note-input"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
