"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RecordForm, asRecordValue, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  useCreateScoringRule,
  useUpdateScoringRule,
  type ScoringRule,
  type UpdateScoringRuleInput,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { SCORING_RULE_LAYOUT } from "@/lib/renderer/crm/settings/scoring-rule-layout";
import { numberOr, numberOrOmit, requiredText, textOrOmit } from "../shared/record-payload";

/**
 * Create and edit a scoring rule, rendered from the description.
 *
 * One form where the page carried two: a create dialog and a second, narrower
 * one spliced into a table row for editing. The inline row was the reason the
 * list could not be a `DataTable` at all — a cell that becomes a form is a
 * table that has to know about forms.
 */

interface ScoringRuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ScoringRule | null;
}

export function ScoringRuleSheet({ open, onOpenChange, rule }: ScoringRuleSheetProps) {
  const layout = useTenantLayout(SCORING_RULE_LAYOUT);
  const createRule = useCreateScoringRule();
  const updateRule = useUpdateScoringRule();
  const isEditing = rule !== null;
  const isPending = createRule.isPending || updateRule.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (rule) {
      const patch: UpdateScoringRuleInput = { id: rule.id };
      const field = textOrOmit(values, "field");
      if (field !== undefined) patch.field = field;
      const operator = textOrOmit(values, "operator");
      if (operator !== undefined) patch.operator = operator;
      const value = textOrOmit(values, "value");
      if (value !== undefined) patch.value = value;
      const points = numberOrOmit(values, "points");
      if (points !== undefined) patch.points = points;

      updateRule.mutate(patch, {
        onSuccess: () => {
          toast.success("Rule updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }

    createRule.mutate(
      {
        field: requiredText(values, "field"),
        operator: requiredText(values, "operator"),
        value: requiredText(values, "value"),
        points: numberOr(values, "points", 0),
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
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit scoring rule" : "New scoring rule"}</SheetTitle>
          <SheetDescription>
            A rule adds or subtracts points when a lead matches it. The total is the lead&apos;s
            score.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={rule?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={rule ? asRecordValue(rule) : { operator: "eq", points: "0" }}
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
