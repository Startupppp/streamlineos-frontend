"use client";

import { useCallback, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ruleFormSchema, type RuleFormValues } from "./assignment-rule-sheet-schema";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { LoadingButton } from "@/components/ui/loading-button";
import { Plus, Trash2 } from "lucide-react";
import { MemberPicker } from "@/components/shared";
import { useTerritories } from "@/hooks/api/crm-settings";
import type {
  AssignmentRule,
  AssignmentType,
  CreateAssignmentRuleInput,
} from "@/hooks/api/crm-settings";

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: "assign_user", label: "Assign to User" },
  { value: "round_robin", label: "Round Robin" },
  { value: "weighted_round_robin", label: "Weighted Round Robin" },
  { value: "least_loaded", label: "Least Loaded" },
  { value: "territory", label: "Territory" },
];

const CONDITION_FIELDS = [
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "city", label: "City" },
  { value: "company", label: "Company" },
  { value: "potentialValue", label: "Potential Value" },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "in", label: "In (comma-sep)" },
];

export type { RuleFormValues };

function formFromRule(rule: AssignmentRule): RuleFormValues {
  return {
    name: rule.name,
    isActive: rule.isActive,
    assignmentType: rule.assignmentType,
    conditions: rule.conditions.length > 0
      ? rule.conditions
      : [{ field: "", operator: "eq", value: "" }],
    assignToUserId: rule.assignToUserId ?? "",
    roundRobinUserIds: (rule.roundRobinUserIds ?? []).join(", "),
    weightedMembers: rule.weightedMembers ?? [{ userId: "", weight: 50 }],
    windowHours: rule.windowHours != null ? String(rule.windowHours) : "",
    territoryId: rule.territoryId != null ? String(rule.territoryId) : "",
  };
}

const DEFAULT_VALUES: RuleFormValues = {
  name: "",
  isActive: true,
  assignmentType: "assign_user",
  conditions: [{ field: "", operator: "eq", value: "" }],
  assignToUserId: "",
  roundRobinUserIds: "",
  weightedMembers: [{ userId: "", weight: 50 }],
  windowHours: "",
  territoryId: "",
};

export function buildRulePayload(data: RuleFormValues): Omit<CreateAssignmentRuleInput, "priority"> & { isActive: boolean } {
  const base = {
    name: data.name,
    isActive: data.isActive,
    assignmentType: data.assignmentType,
    conditions: data.conditions,
  };

  if (data.assignmentType === "assign_user") {
    return { ...base, assignToUserId: data.assignToUserId || undefined };
  }
  if (data.assignmentType === "round_robin") {
    return {
      ...base,
      roundRobinUserIds: data.roundRobinUserIds
        ? data.roundRobinUserIds.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };
  }
  if (data.assignmentType === "weighted_round_robin") {
    return {
      ...base,
      weightedMembers: (data.weightedMembers ?? []).filter((m) => m.userId.trim()),
    };
  }
  if (data.assignmentType === "least_loaded") {
    return {
      ...base,
      windowHours: data.windowHours ? Number(data.windowHours) : undefined,
    };
  }
  return {
    ...base,
    territoryId: data.territoryId ? Number(data.territoryId) : undefined,
  };
}

interface AssignmentRuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AssignmentRule | null;
  isPending: boolean;
  onSubmit: (data: RuleFormValues) => void;
}

export function AssignmentRuleSheet({
  open,
  onOpenChange,
  editing,
  isPending,
  onSubmit,
}: AssignmentRuleSheetProps) {
  const { data: territories = [] } = useTerritories();

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: editing ? formFromRule(editing) : DEFAULT_VALUES,
  });

  const assignmentType = form.watch("assignmentType");

  const {
    fields: conditionFields,
    append: addCondition,
    remove: removeCondition,
  } = useFieldArray({ control: form.control, name: "conditions" });

  const {
    fields: memberFields,
    append: addMember,
    remove: removeMember,
  } = useFieldArray({ control: form.control, name: "weightedMembers" });

  useEffect(() => {
    form.reset(editing ? formFromRule(editing) : DEFAULT_VALUES);
  }, [editing, form]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) form.reset(DEFAULT_VALUES);
      onOpenChange(next);
    },
    [form, onOpenChange]
  );

  const handleAddCondition = useCallback(() => {
    addCondition({ field: "", operator: "eq", value: "" });
  }, [addCondition]);

  const handleAddMember = useCallback(() => {
    addMember({ userId: "", weight: 50 });
  }, [addMember]);

  const handleSubmit = useCallback(
    (data: RuleFormValues) => onSubmit(data),
    [onSubmit]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle>{editing ? "Edit Assignment Rule" : "New Assignment Rule"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-4">
          <Form {...form}>
            <form id="rule-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Mumbai Leads to Ravi" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="assignmentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSIGNMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-col justify-end pb-1">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Conditions</p>
                <div className="space-y-2">
                  {conditionFields.map((cf, i) => (
                    <div key={cf.id} className="flex items-center gap-2">
                      <FormField control={form.control} name={`conditions.${i}.field`} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-28 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                          <SelectContent>
                            {CONDITION_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                      <FormField control={form.control} name={`conditions.${i}.operator`} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-24 text-xs"><SelectValue placeholder="Op" /></SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                      <FormField control={form.control} name={`conditions.${i}.value`} render={({ field }) => (
                        <Input {...field} className="text-xs flex-1" placeholder="Value" />
                      )} />
                      {conditionFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-8 text-destructive shrink-0"
                          onClick={() => removeCondition(i)}
                          aria-label="Remove condition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={handleAddCondition}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Condition
                </Button>
              </div>

              {assignmentType === "assign_user" && (
                <FormField control={form.control} name="assignToUserId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <FormControl>
                      <MemberPicker
                        mode="single"
                        value={field.value || undefined}
                        onChange={(id) => field.onChange(id ?? "")}
                        placeholder="Select user"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {assignmentType === "round_robin" && (
                <FormField control={form.control} name="roundRobinUserIds" render={({ field }) => {
                  const values = field.value
                    ? field.value.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
                  function handleToggle(userId: string) {
                    const next = values.includes(userId)
                      ? values.filter((id) => id !== userId)
                      : [...values, userId];
                    field.onChange(next.join(", "));
                  }
                  return (
                    <FormItem>
                      <FormLabel>Round-robin members</FormLabel>
                      <FormControl>
                        <MemberPicker
                          mode="multi"
                          values={values}
                          onToggle={handleToggle}
                          placeholder="Add members"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }} />
              )}

              {assignmentType === "weighted_round_robin" && (
                <div>
                  <p className="text-sm font-medium mb-2">Member Weights</p>
                  <div className="space-y-3">
                    {memberFields.map((mf, i) => (
                      <div key={mf.id} className="flex items-center gap-3">
                        <FormField control={form.control} name={`weightedMembers.${i}.userId`} render={({ field }) => (
                          <MemberPicker
                            mode="single"
                            value={field.value || undefined}
                            onChange={(id) => field.onChange(id ?? "")}
                            placeholder="Select user"
                            className="min-w-0 flex-1"
                          />
                        )} />
                        <FormField control={form.control} name={`weightedMembers.${i}.weight`} render={({ field }) => (
                          <div className="flex items-center gap-2 flex-1">
                            <Slider
                              min={0}
                              max={100}
                              step={1}
                              value={[field.value ?? 50]}
                              onValueChange={([v]) => field.onChange(v)}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-8 text-right">{field.value}</span>
                          </div>
                        )} />
                        {memberFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-8 text-destructive shrink-0"
                            onClick={() => removeMember(i)}
                            aria-label="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={handleAddMember}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Member
                  </Button>
                </div>
              )}

              {assignmentType === "least_loaded" && (
                <FormField control={form.control} name="windowHours" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Window Hours</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} placeholder="24" className="w-32" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {assignmentType === "territory" && (
                <FormField control={form.control} name="territoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Territory</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select territory" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {territories.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton type="submit" form="rule-form" isPending={isPending} loadingText="Saving…">
            {editing ? "Save Changes" : "Create Rule"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
