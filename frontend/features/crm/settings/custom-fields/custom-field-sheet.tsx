"use client";

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RecordForm,
  type RecordFieldControl,
  type RecordFormValues,
} from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  useCreateCustomField,
  useUpdateCustomField,
  type CustomFieldDefinition,
  type UpdateCustomFieldInput,
} from "@/hooks/api/crm/custom-fields";
import { getErrorMessage } from "@/lib/get-error-message";
import { CUSTOM_FIELD_LAYOUT } from "@/lib/renderer/crm/settings/custom-field-layout";
import { flagOr, flagOrOmit, requiredText, textOrOmit } from "../shared/record-payload";

/**
 * Define a custom field, rendered from the description.
 *
 * The branch this form used to carry — show the choice editor only for a select
 * — is now `visibleWhen` on the description, so the engine decides. What is left
 * is the pair editor itself, supplied through `controls` because a choice is two
 * strings and no field kind holds two.
 *
 * The pairs travel as JSON in one form value. That is transport, not interface:
 * nobody sees it, the control parses on the way in and serialises on the way
 * out, and keeping the engine's value a string is what lets the generated
 * schema, the defaults and the condition all go on working unchanged.
 */

type FieldType = CustomFieldDefinition["fieldType"];
type EntityType = CustomFieldDefinition["entityType"];
type ChoicePair = { value: string; label: string };

const FIELD_TYPES: readonly FieldType[] = ["text", "number", "date", "boolean", "select"];

function toFieldType(value: string | undefined): FieldType | undefined {
  return FIELD_TYPES.find((candidate) => candidate === value);
}

/** The stored key a label becomes, so nobody is asked to type `lead_source`. */
function labelToName(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Defensive on the way in: the value is a form string, and a form string that
 * is not the JSON we wrote is a list of no choices rather than a crash.
 */
function parseChoices(raw: string | undefined): ChoicePair[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const value = "value" in entry && typeof entry.value === "string" ? entry.value : "";
      const label = "label" in entry && typeof entry.label === "string" ? entry.label : "";
      return [{ value, label }];
    });
  } catch {
    return [];
  }
}

function serialiseChoices(choices: readonly ChoicePair[]): string {
  return JSON.stringify(choices);
}

function LabelControl({ value, onChange, disabled }: RecordFieldControl) {
  const key = labelToName(value);
  return (
    <div className="flex flex-col gap-gap-inline">
      <Input
        value={value}
        disabled={disabled}
        placeholder="Lead source"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-micro text-muted-foreground">Stored as {key || "…"}</span>
    </div>
  );
}

function ChoicesControl({ value, onChange, disabled }: RecordFieldControl) {
  const choices = parseChoices(value);

  const replace = (next: ChoicePair[]): void => onChange(serialiseChoices(next));

  const update = (index: number, patch: Partial<ChoicePair>): void =>
    replace(choices.map((choice, at) => (at === index ? { ...choice, ...patch } : choice)));

  return (
    <div className="flex flex-col gap-gap-field">
      {choices.map((choice, index) => (
        <div key={index} className="flex items-start gap-gap-field">
          <Input
            value={choice.label}
            disabled={disabled}
            placeholder="Shown to people"
            aria-label={`Choice ${index + 1} label`}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <Input
            value={choice.value}
            disabled={disabled}
            placeholder="Stored value"
            aria-label={`Choice ${index + 1} value`}
            onChange={(event) => update(index, { value: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-destructive"
            disabled={disabled}
            aria-label={`Remove choice ${index + 1}`}
            onClick={() => replace(choices.filter((_, at) => at !== index))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={disabled}
        onClick={() => replace([...choices, { value: "", label: "" }])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add choice
      </Button>
    </div>
  );
}

interface CustomFieldSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  field: CustomFieldDefinition | null;
  sortOrder: number;
}

export function CustomFieldSheet({
  open,
  onOpenChange,
  entityType,
  field,
  sortOrder,
}: CustomFieldSheetProps) {
  const layout = useTenantLayout(CUSTOM_FIELD_LAYOUT);
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const isEditing = field !== null;
  const isPending = createField.isPending || updateField.isPending;

  const controls = useMemo(
    () => ({
      label: (control: RecordFieldControl) => <LabelControl {...control} />,
      options: (control: RecordFieldControl) => <ChoicesControl {...control} />,
    }),
    [],
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    // Absent means the field is not on the choice arm, which is not the same as
    // an empty list — so it is left out rather than sent as one.
    const choices = values.options === undefined ? undefined : parseChoices(values.options);

    if (field) {
      const patch: UpdateCustomFieldInput = { id: field.id, entityType: field.entityType };
      const label = textOrOmit(values, "label");
      if (label !== undefined) patch.label = label;
      const isRequired = flagOrOmit(values, "isRequired");
      if (isRequired !== undefined) patch.isRequired = isRequired;
      if (choices !== undefined) patch.options = choices;

      updateField.mutate(patch, {
        onSuccess: () => {
          toast.success("Field updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }

    const label = requiredText(values, "label");
    createField.mutate(
      {
        entityType,
        name: labelToName(label),
        label,
        fieldType: toFieldType(values.fieldType) ?? "text",
        isRequired: flagOr(values, "isRequired", false),
        ...(choices === undefined ? {} : { options: choices }),
        sortOrder,
      },
      {
        onSuccess: () => {
          toast.success("Field created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit custom field" : "New custom field"}</SheetTitle>
          <SheetDescription>
            A field of your own on every {entityType}, alongside the ones the product ships with.
            {isEditing ? " A field's type cannot change once records carry values in it." : null}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={field?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={
              field
                ? {
                    label: field.label,
                    name: field.name,
                    fieldType: field.fieldType,
                    isRequired: field.isRequired,
                    options: serialiseChoices(field.options ?? []),
                  }
                : { fieldType: "text", isRequired: "false", options: "[]" }
            }
            controls={controls}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create field"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
