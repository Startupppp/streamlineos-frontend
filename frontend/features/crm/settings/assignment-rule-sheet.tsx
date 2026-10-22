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
import { MemberPicker } from "@/components/shared";
import {
  RecordForm,
  type LineFieldControl,
  type RecordFieldControl,
  type RecordFormLines,
  type RecordFormValues,
} from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import type {
  AssignmentRule,
  AssignmentRuleCondition,
  CreateAssignmentRuleInput,
  WeightedMember,
} from "@/hooks/api/crm/settings/assignment-rules";
import { ASSIGNMENT_RULE_LAYOUT } from "@/lib/renderer/crm/settings/assignment-rule-layout";
import {
  armPayload,
  asAssignmentType,
  effectiveTypeOf,
  membersFrom,
} from "./assignment-arms";
import {
  flagOr,
  listValue,
  requiredText,
  textOrOmit,
} from "./shared/record-payload";


function initialValues(rule: AssignmentRule): Record<string, unknown> {
  return {
    name: rule.name,
    assignmentType: effectiveTypeOf(rule),
    priority: rule.priority,
    isActive: rule.isActive,
    conditions: rule.conditions,
    assignToUserId: rule.assignToUserId ?? "",
    roundRobinUserIds: (rule.roundRobinUserIds ?? []).join(", "),
    weightedMembers: membersFrom(rule.config),
    fallbackUserId: rule.config?.fallbackUserId ?? "",
  };
}

function conditionsFrom(lines: RecordFormLines | undefined): AssignmentRuleCondition[] {
  return (lines?.conditions ?? [])
    .map((row) => ({
      field: row.field?.trim() ?? "",
      operator: row.operator?.trim() ?? "",
      value: row.value?.trim() ?? "",
    }))
    .filter((condition) => condition.field && condition.operator);
}

function weightedRows(lines: RecordFormLines | undefined): WeightedMember[] {
  return (lines?.weightedMembers ?? [])
    .map((row) => ({ userId: row.userId?.trim() ?? "", weight: Number(row.weight ?? "") }))
    .filter((member) => member.userId && Number.isFinite(member.weight));
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
      fallbackUserId: (control: RecordFieldControl) => (
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
      isActive: flagOr(values, "isActive", true),
      conditions: conditionsFrom(lines),
      ...armPayload(type, {
        assignToUserId: textOrOmit(values, "assignToUserId"),
        members: listValue(values, "roundRobinUserIds") ?? [],
        weighted: weightedRows(lines),
        fallbackUserId: textOrOmit(values, "fallbackUserId"),
      }),
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
