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
import { useCreateOpportunity } from "@/hooks/api/build/product-discovery-mutations";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  createOpportunityFormSchema,
  type CreateOpportunityFormValues,
} from "./opportunity-rice-schema";

type OptionalField = Exclude<keyof CreateOpportunityFormValues, "title">;

const TEXT_FIELDS: ReadonlyArray<{
  name: OptionalField;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  { name: "problem", label: "Problem", placeholder: "What customer problem does this solve?", multiline: true },
  { name: "hypothesis", label: "Hypothesis", placeholder: "If we do X, then Y will happen because Z", multiline: true },
  { name: "affectedSegment", label: "Affected segment", placeholder: "e.g. Enterprise admins" },
  { name: "theme", label: "Theme", placeholder: "e.g. Onboarding" },
  { name: "desiredOutcome", label: "Desired outcome", placeholder: "What changes for customers when this ships?", multiline: true },
  { name: "outcomeMetric", label: "Outcome metric", placeholder: "e.g. Activation rate" },
  { name: "outcomeUnit", label: "Unit", placeholder: "e.g. %" },
  { name: "outcomeBaseline", label: "Baseline", placeholder: "e.g. 32" },
  { name: "outcomeTarget", label: "Target", placeholder: "e.g. 45" },
];

const DEFAULT_VALUES: CreateOpportunityFormValues = { title: "" };

interface OpportunityCreateButtonProps {
  managedProductId: number;
}

export function OpportunityCreateButton({ managedProductId }: OpportunityCreateButtonProps) {
  const canWrite = useCan("build:managed-products:update");
  const [open, setOpen] = useState(false);
  const createMutation = useCreateOpportunity(managedProductId);

  const handleOpen = useCallback(() => setOpen(true), []);

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
            setOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation],
  );

  function renderFields(form: UseFormReturn<CreateOpportunityFormValues>) {
    return (
      <div className="space-y-4">
        <FormField control={form.control} name="title" render={renderTitleField} />
        {TEXT_FIELDS.map((config) => (
          <FormField
            key={config.name}
            control={form.control}
            name={config.name}
            render={({ field }) => renderOptionalField(field, config)}
          />
        ))}
      </div>
    );
  }

  if (!canWrite) return null;

  return (
    <>
      <Button type="button" size="sm" onClick={handleOpen} data-testid="new-opportunity-btn">
        <Plus className="size-3.5 mr-1" aria-hidden />
        New opportunity
      </Button>
      <EntityFormSheet<CreateOpportunityFormValues>
        open={open}
        onOpenChange={setOpen}
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
    </>
  );
}

function renderTitleField({ field }: { field: ControllerRenderProps<CreateOpportunityFormValues, "title"> }) {
  return (
    <FormItem>
      <FormLabel>Title</FormLabel>
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
          <Input {...field} value={field.value ?? ""} className={FIELD_CONTROL_CLASS} placeholder={config.placeholder} />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
