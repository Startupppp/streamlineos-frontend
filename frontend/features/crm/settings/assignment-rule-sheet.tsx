"use client";

import { useMemo, type ReactNode } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberPicker } from "@/components/shared";
import {
  RecordForm,
  type LineFieldControl,
  type RecordFieldControl,
  type RecordFormLines,
  type RecordFormValues,
} from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { useTerritories } from "@/hooks/api/crm-settings";
import type {
  AssignmentRule,
  AssignmentRuleCondition,
  AssignmentType,
  CreateAssignmentRuleInput,
  WeightedMember,
} from "@/hooks/api/crm-settings";
import { ASSIGNMENT_RULE_LAYOUT } from "@/lib/renderer/crm/settings/assignment-rule-layout";
import {
  flagOr,
  listValue,
  numberOrOmit,
  requiredText,
  textOrOmit,
} from "./shared/record-payload";

/**
 * Create and edit an assignment rule, rendered from the description.
 *
 * The sheet that stood here drew its own conditions editor with
 * `useFieldArray`, its own weighted-member editor with a second one, and five
 * hand-written `assignmentType === …` branches deciding which of them to show.
 * All three are description now: the arms are `visibleWhen`, and the two
 * repeating groups are `lines`. What is left here is the boundary work only a
 * screen can do — who may be picked, and what the API wants each arm's payload
 * to look like.
 */

const ASSIGNMENT_TYPES: readonly AssignmentType[] = [
  "assign_user",
  "round_robin",
  "weighted_round_robin",
  "least_loaded",
  "territory",
];

function asAssignmentType(value: string | undefined): AssignmentType {
  return ASSIGNMENT_TYPES.find((candidate) => candidate === value) ?? "assign_user";
}

function initialValues(rule: AssignmentRule): Record<string, unknown> {
  return {
    name: rule.name,
    assignmentType: rule.assignmentType,
    priority: rule.priority,
    isActive: rule.isActive,
    conditions: rule.conditions,
    assignToUserId: rule.assignToUserId ?? "",
    roundRobinUserIds: (rule.roundRobinUserIds ?? []).join(", "),
    weightedMembers: rule.weightedMembers ?? [],
    windowHours: rule.windowHours,
    territoryId: rule.territoryId,
  };
}

/** Rows that name a field, an operator and something to compare against. */
function conditionsFrom(lines: RecordFormLines | undefined): AssignmentRuleCondition[] {
  return (lines?.conditions ?? [])
    .map((row) => ({
      field: row.field?.trim() ?? "",
      operator: row.operator?.trim() ?? "",
      value: row.value?.trim() ?? "",
    }))
    .filter((condition) => condition.field && condition.operator);
}

/** Rows that name a member; a row with nobody in it is not a share of anything. */
function weightsFrom(lines: RecordFormLines | undefined): WeightedMember[] {
  return (lines?.weightedMembers ?? [])
    .map((row) => ({ userId: row.userId?.trim() ?? "", weight: Number(row.weight ?? "") }))
    .filter((member) => member.userId && Number.isFinite(member.weight));
}

/**
 * The arm's own half of the payload.
 *
 * Only the arm the rule is on contributes. The engine already drops the fields
 * of every other arm before this is called, so a rule switched from round robin
 * to territory does not carry its old member list into the update.
 */
function armPayload(
  type: AssignmentType,
  values: RecordFormValues,
  lines: RecordFormLines | undefined,
): Partial<CreateAssignmentRuleInput> {
  if (type === "assign_user") return { assignToUserId: textOrOmit(values, "assignToUserId") };
  if (type === "round_robin") return { roundRobinUserIds: listValue(values, "roundRobinUserIds") ?? [] };
  if (type === "weighted_round_robin") return { weightedMembers: weightsFrom(lines) };
  if (type === "least_loaded") return { windowHours: numberOrOmit(values, "windowHours") };
  return { territoryId: numberOrOmit(values, "territoryId") };
}

export interface AssignmentRuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AssignmentRule | null;
  isPending: boolean;
  onSubmit: (input: Omit<CreateAssignmentRuleInput, "priority"> & { isActive: boolean }) => void;
}

export function AssignmentRuleSheet({
  open,
  onOpenChange,
  editing,
  isPending,
  onSubmit,
}: AssignmentRuleSheetProps) {
  const layout = useTenantLayout(ASSIGNMENT_RULE_LAYOUT);
  const { data: territories = [] } = useTerritories();

  const controls = useMemo(
    () => ({
      assignToUserId: (control: RecordFieldControl) => (
        <MemberPicker
          mode="single"
          value={control.value || undefined}
          onChange={(id) => control.onChange(id ?? "")}
          disabled={control.disabled}
          placeholder="Select user"
        />
      ),
      roundRobinUserIds: (control: RecordFieldControl) => (
        <RoundRobinMembers control={control} />
      ),
      territoryId: (control: RecordFieldControl) => (
        <Select
          value={control.value}
          onValueChange={control.onChange}
          disabled={control.disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select territory" />
          </SelectTrigger>
          <SelectContent>
            {territories.map((territory) => (
              <SelectItem key={territory.id} value={String(territory.id)}>
                {territory.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    }),
    [territories],
  );

  const lineControls = useMemo<
    Record<string, (control: LineFieldControl, index: number) => ReactNode>
  >(
    () => ({
      "weightedMembers.userId": (control: LineFieldControl) => (
        <MemberPicker
          mode="single"
          value={control.value || undefined}
          onChange={(id) => control.onChange(id ?? "")}
          disabled={control.disabled}
          placeholder="Select user"
        />
      ),
    }),
    [],
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(
    values: RecordFormValues,
    _event?: unknown,
    lines?: RecordFormLines,
  ) {
    const type = asAssignmentType(values.assignmentType);
    onSubmit({
      name: requiredText(values, "name"),
      assignmentType: type,
      isActive: flagOr(values, "isActive", true),
      conditions: conditionsFrom(lines),
      ...armPayload(type, values, lines),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{editing ? "Edit assignment rule" : "New assignment rule"}</SheetTitle>
          <SheetDescription>
            A rule fires on the first lead that matches every one of its conditions, and hands that
            lead to whoever the rule names.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={editing?.id ?? "new"}
            layout={layout}
            mode={editing ? "edit" : "create"}
            initial={editing ? initialValues(editing) : { isActive: "true" }}
            controls={controls}
            lineControls={lineControls}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={editing ? "Save changes" : "Create rule"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The round-robin roster, as the comma-joined string the engine carries.
 *
 * A list of members is a control rather than a shape, exactly as a territory's
 * chip fields are: the description says the field holds text, the surface hands
 * it something better than a text box, and the value stays one string so the
 * generated schema and defaults go on working without knowing this exists.
 */
function RoundRobinMembers({ control }: { control: RecordFieldControl }) {
  const values = control.value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  function handleToggle(userId: string) {
    const next = values.includes(userId)
      ? values.filter((id) => id !== userId)
      : [...values, userId];
    control.onChange(next.join(", "));
  }

  return (
    <MemberPicker
      mode="multi"
      values={values}
      onToggle={handleToggle}
      disabled={control.disabled}
      placeholder="Add members"
    />
  );
}
