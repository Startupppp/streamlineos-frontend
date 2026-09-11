"use client";

import { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CrmOptionSelect, CrmStageSelect } from "@/features/crm/shared/metadata";
import {
  RecordForm,
  type RecordFieldControl,
  type RecordFormValues,
} from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  useCreateValidationRule,
  useCrmMetadata,
  useUpdateValidationRule,
} from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { VALIDATION_RULE_LAYOUT } from "@/lib/renderer/crm/settings/validation-rule-layout";
import type {
  CrmValidationEntityType,
  CrmValidationRule,
} from "@/types/crm/metadata";
import { flagOr, requiredText, textOrOmit } from "./shared/record-payload";
import { configFor, initialValues, toEntityType, toRuleType } from "./validation-rule-form-values";

/**
 * Create and edit a validation rule, rendered from the description.
 *
 * The five-branch form this replaces is gone: which config fields a rule has is
 * declared by `visibleWhen` on `ruleType`, so the engine renders the arm the
 * rule is on, validates only that arm, and submits only that arm. Nothing here
 * decides what to show.
 *
 * What is left is what a description cannot supply — three pickers whose
 * contents belong to the tenant rather than to the record's shape. Two of them
 * are ordinary. The stage picker is not: which stages exist depends on which
 * pipeline the form currently holds, and `visibleWhen` compares against a small
 * set of known values rather than asking whether a sibling is filled in. So the
 * control reads its sibling from react-hook-form's own context, which the engine
 * already establishes — a control being clever about the tenant, not a
 * conditional smuggled into the description.
 */

/** The fields each entity is known to carry, offered as suggestions only. */
const ENTITY_FIELDS: Record<CrmValidationEntityType, readonly string[]> = {
  lead: ["name", "email", "phone", "company", "source", "status", "priority", "potentialValue"],
  deal: ["name", "value", "closeDate", "probability", "source", "status"],
  contact: ["firstName", "lastName", "email", "phone", "title", "company"],
  company: ["name", "domain", "industry", "size", "country"],
  quote: ["title", "value", "expiryDate", "status"],
};

function RuleFieldControl({
  control,
  fallbackEntity,
}: {
  control: RecordFieldControl;
  fallbackEntity: CrmValidationEntityType;
}) {
  const watched = useWatch({ name: "entityType" });
  const entity = toEntityType(typeof watched === "string" ? watched : undefined) ?? fallbackEntity;
  const listId = `validation-fields-${entity}`;

  return (
    <>
      <Input
        list={listId}
        value={control.value}
        disabled={control.disabled}
        placeholder="email"
        onChange={(event) => control.onChange(event.target.value)}
      />
      <datalist id={listId}>
        {ENTITY_FIELDS[entity].map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}

/**
 * Which stages exist depends on the pipeline the form currently holds, which is
 * why this reads its sibling rather than taking it as a prop.
 */
function RuleStageControl({ control }: { control: RecordFieldControl }) {
  const watched = useWatch({ name: "pipelineId" });
  const pipelineId = typeof watched === "string" ? watched : "";

  if (!pipelineId)
    return (
      <Input
        value={control.value}
        disabled
        placeholder="Choose a pipeline first"
        readOnly
      />
    );

  return (
    <CrmStageSelect
      pipelineIdOrType={pipelineId}
      value={control.value}
      onChange={control.onChange}
      placeholder="Any stage"
    />
  );
}

interface ValidationRuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: CrmValidationEntityType;
  rule: CrmValidationRule | null;
  sortOrder: number;
}

export function ValidationRuleSheet({
  open,
  onOpenChange,
  entityType,
  rule,
  sortOrder,
}: ValidationRuleSheetProps) {
  const layout = useTenantLayout(VALIDATION_RULE_LAYOUT);
  const { data: metadata } = useCrmMetadata();
  const createRule = useCreateValidationRule();
  const updateRule = useUpdateValidationRule();
  const isEditing = rule !== null;
  const isPending = createRule.isPending || updateRule.isPending;

  const pipelines = useMemo(() => metadata?.pipelines ?? [], [metadata]);
  const pipelineName = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === rule?.pipelineId)?.name ?? "",
    [pipelines, rule],
  );

  const fallbackEntity = rule?.entityType ?? entityType;

  const controls = useMemo(
    () => ({
      field: (control: RecordFieldControl) => (
        <RuleFieldControl control={control} fallbackEntity={fallbackEntity} />
      ),
      pipelineId: (control: RecordFieldControl) => (
        <Select
          value={control.value}
          onValueChange={control.onChange}
          disabled={control.disabled}
        >
          <SelectTrigger aria-label="Pipeline">
            <SelectValue placeholder="Any pipeline" />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      stageKey: (control: RecordFieldControl) => <RuleStageControl control={control} />,
      sourceKey: (control: RecordFieldControl) => (
        <CrmOptionSelect
          type="source"
          value={control.value}
          onChange={control.onChange}
          placeholder="Any source"
        />
      ),
    }),
    [pipelines, fallbackEntity],
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    const ruleType = toRuleType(values.ruleType) ?? rule?.ruleType ?? "required";
    const body = {
      field: requiredText(values, "field"),
      ruleType,
      config: configFor(ruleType, values),
      pipelineId: textOrOmit(values, "pipelineId") ?? null,
      stageKey: textOrOmit(values, "stageKey") ?? null,
      sourceKey: textOrOmit(values, "sourceKey") ?? null,
      errorMessage: textOrOmit(values, "errorMessage") ?? null,
      isActive: flagOr(values, "isActive", true),
    };

    if (rule) {
      updateRule.mutate(
        { id: rule.id, ...body },
        {
          onSuccess: () => {
            toast.success("Rule updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createRule.mutate(
      {
        ...body,
        entityType: toEntityType(values.entityType) ?? entityType,
        sortOrder,
      },
      {
        onSuccess: () => {
          toast.success("Rule created");
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
          <SheetTitle>{isEditing ? "Edit validation rule" : "New validation rule"}</SheetTitle>
          <SheetDescription>
            A rule refuses a record that would otherwise be saved half-filled.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={rule?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={
              rule
                ? initialValues(rule, pipelineName)
                : { entityType, ruleType: "required", isActive: "true" }
            }
            controls={controls}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create rule"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
