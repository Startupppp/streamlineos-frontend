"use client";

import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { useCan } from "@/hooks/api/access";
import { useCreateOpportunity } from "@/hooks/api/build/opportunity-mutations";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  createOpportunityFormSchema,
  type CreateOpportunityFormValues,
} from "./opportunity-rice-schema";

type OptionalField = Exclude<keyof CreateOpportunityFormValues, "title">;

interface TextFieldConfig {
  name: OptionalField;
  label: string;
  placeholder: string;
  multiline?: boolean;
  inputMode?: "decimal";
}

const TEXT_FIELDS: ReadonlyArray<TextFieldConfig> = [
  { name: "problem", label: "Problem", placeholder: "What customer problem does this solve?", multiline: true },
  { name: "hypothesis", label: "Hypothesis", placeholder: "If we do X, then Y will happen because Z", multiline: true },
  { name: "affectedSegment", label: "Affected segment", placeholder: "e.g. Enterprise admins" },
  { name: "theme", label: "Theme", placeholder: "e.g. Onboarding" },
  { name: "desiredOutcome", label: "Desired outcome", placeholder: "What changes for customers when this ships?", multiline: true },
  { name: "outcomeMetric", label: "Outcome metric", placeholder: "e.g. Activation rate" },
  { name: "outcomeUnit", label: "Unit", placeholder: "e.g. %" },
  { name: "outcomeBaseline", label: "Baseline", placeholder: "e.g. 32", inputMode: "decimal" },
  { name: "outcomeTarget", label: "Target", placeholder: "e.g. 45", inputMode: "decimal" },
];

const DEFAULT_VALUES: CreateOpportunityFormValues = { title: "" };

interface OptionalTextFieldProps {
  form: UseFormReturn<CreateOpportunityFormValues>;
  config: TextFieldConfig;
}

function OptionalTextField({ form, config }: OptionalTextFieldProps) {
  const renderField = useCallback(
    ({ field }: { field: ControllerRenderProps<CreateOpportunityFormValues, OptionalField> }) =>
      renderOptionalField(field, config),
    [config],
  );
  return <FormField control={form.control} name={config.name} render={renderField} />;
}

function renderFields(form: UseFormReturn<CreateOpportunityFormValues>) {
  return (
    <div className="space-y-4">
      <FormField control={form.control} name="title" render={renderTitleField} />
      {TEXT_FIELDS.map((config) => (
        <OptionalTextField key={config.name} form={form} config={config} />
      ))}
    </div>
  );
}

interface OpportunityCreateSheetProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OpportunityCreateButtonProps {
  managedProductId: number;
}

export function OpportunityCreateSheet({
  managedProductId,
  open,
  onOpenChange,
}: OpportunityCreateSheetProps) {
  const createMutation = useCreateOpportunity(managedProductId);

  const handleSubmit = useCallback(
    (values: CreateOpportunityFormValues) => {
      const optional = Object.fromEntries(
        TEXT_FIELDS.flatMap(({ name }) => {
          const value = values[name]?.trim();
          return value ? [[name, value]] : [];
        }),
      );
      createMutation.mutate(
        { ...optional, title: values.title },
        {
          onSuccess: () => {
            toast.success("Opportunity created.");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, onOpenChange],
  );

  return (
    <EntityFormSheet<CreateOpportunityFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New opportunity"
      description="Capture a customer problem worth solving. Score it and link evidence once it is created."
      resolver={zodResolver(createOpportunityFormSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
      submitLabel="Create opportunity"
      resetOnOpen
    >
      {renderFields}
    </EntityFormSheet>
  );
}

export function OpportunityCreateButton({ managedProductId }: OpportunityCreateButtonProps) {
  const canWrite = useCan("build:managed-products:update");
  const [open, setOpen] = useState(false);
  const handleOpen = useCallback(() => setOpen(true), []);

  if (!canWrite) return null;

  return (
    <>
      <Button type="button" size="sm" onClick={handleOpen} data-testid="new-opportunity-btn">
        <Plus className="size-3.5" aria-hidden />
        New opportunity
      </Button>
      <OpportunityCreateSheet managedProductId={managedProductId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderTitleField({ field }: { field: ControllerRenderProps<CreateOpportunityFormValues, "title"> }) {
  return (
    <FormItem>
      <FormLabel>Title <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
      <FormControl>
        <Input {...field} className={FIELD_CONTROL_CLASS} placeholder="e.g. Mobile onboarding friction" />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

function renderOptionalField(
  field: ControllerRenderProps<CreateOpportunityFormValues, OptionalField>,
  config: (typeof TEXT_FIELDS)[number],
) {
  return (
    <FormItem>
      <FormLabel>{config.label}</FormLabel>
      <FormControl>
        {config.multiline ? (
          <Textarea {...field} value={field.value ?? ""} rows={3} placeholder={config.placeholder} />
        ) : (
          <Input {...field} value={field.value ?? ""} className={FIELD_CONTROL_CLASS} placeholder={config.placeholder} inputMode={config.inputMode} />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
