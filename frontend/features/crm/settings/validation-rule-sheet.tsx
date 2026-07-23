"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetBody,
} from "@/components/ui/sheet";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCrmMetadata } from "@/hooks/api/crm";
import { CrmOptionSelect, CrmStageSelect } from "@/features/crm/shared/metadata";
import type { CrmValidationRule, CrmValidationEntityType, CrmValidationRuleType } from "@/types/crm/metadata";

const ALL_RULE_TYPES = [
  "required", "unique",
  "email", "phone", "url", "regex",
  "numeric_min", "numeric_max", "currency_min", "currency_max",
  "date_not_past", "date_not_future",
  "conditional_required", "stage_required", "source_required",
] as const satisfies readonly CrmValidationRuleType[];

const RULE_TYPE_GROUPS: { label: string; types: CrmValidationRuleType[] }[] = [
  { label: "Presence", types: ["required", "unique"] },
  { label: "Format", types: ["email", "phone", "url", "regex"] },
  { label: "Numeric", types: ["numeric_min", "numeric_max", "currency_min", "currency_max"] },
  { label: "Date", types: ["date_not_past", "date_not_future"] },
  { label: "Conditional", types: ["conditional_required", "stage_required", "source_required"] },
];

const ENTITY_TABS: { value: CrmValidationEntityType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
  { value: "quote", label: "Quote" },
];

const ENTITY_FIELDS: Record<CrmValidationEntityType, string[]> = {
  lead: ["name", "email", "phone", "company", "source", "status", "priority", "potentialValue"],
  deal: ["name", "value", "closeDate", "probability", "source", "status"],
  contact: ["firstName", "lastName", "email", "phone", "title", "company"],
  company: ["name", "domain", "industry", "size", "country"],
  quote: ["title", "value", "expiryDate", "status"],
};

export const ruleSchema = z.object({
  entityType: z.enum(["lead", "deal", "contact", "company", "quote"]),
  field: z.string().min(1, "Field is required"),
  ruleType: z.enum(ALL_RULE_TYPES),
  configPattern: z.string().optional(),
  configValue: z.string().optional(),
  configConditionField: z.string().optional(),
  configConditionValue: z.string().optional(),
  pipelineId: z.string().nullable().optional(),
  stageKey: z.string().nullable().optional(),
  sourceKey: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  isActive: z.boolean(),
});

export type RuleFormValues = z.infer<typeof ruleSchema>;

export function buildRuleConfig(data: RuleFormValues): Record<string, unknown> | null {
  if (data.ruleType === "regex" && data.configPattern) return { pattern: data.configPattern };
  if (["numeric_min", "numeric_max", "currency_min", "currency_max"].includes(data.ruleType) && data.configValue !== undefined) {
    return { value: Number(data.configValue) };
  }
  if (data.ruleType === "conditional_required") {
    return { condition_field: data.configConditionField ?? "", condition_value: data.configConditionValue ?? "" };
  }
  return null;
}

export function ruleFormDefaults(rule: CrmValidationRule): RuleFormValues {
  const c = rule.config;
  return {
    entityType: rule.entityType,
    field: rule.field,
    ruleType: rule.ruleType,
    configPattern: typeof c?.pattern === "string" ? c.pattern : undefined,
    configValue: c?.value !== undefined ? String(c.value) : undefined,
    configConditionField: typeof c?.condition_field === "string" ? c.condition_field : undefined,
    configConditionValue: typeof c?.condition_value === "string" ? c.condition_value : undefined,
    pipelineId: rule.pipelineId,
    stageKey: rule.stageKey,
    sourceKey: rule.sourceKey,
    errorMessage: rule.errorMessage,
    isActive: rule.isActive,
  };
}

interface RuleSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CrmValidationRule | null;
  entityType: CrmValidationEntityType;
  rulesCount: number;
  onSubmit: (data: RuleFormValues, isEdit: boolean) => void;
  isPending: boolean;
}

export function RuleSheet({ open, onOpenChange, editing, entityType, rulesCount, onSubmit, isPending }: RuleSheetProps) {
  const { data: metadata } = useCrmMetadata();
  const pipelines = metadata?.pipelines ?? [];

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: editing
      ? ruleFormDefaults(editing)
      : {
          entityType,
          field: "",
          ruleType: "required",
          pipelineId: null,
          stageKey: null,
          sourceKey: null,
          errorMessage: null,
          isActive: true,
        },
  });

  const watchedRuleType = form.watch("ruleType");
  const watchedPipelineId = form.watch("pipelineId");
  const showNumericConfig = ["numeric_min", "numeric_max", "currency_min", "currency_max"].includes(watchedRuleType);
  const fields = ENTITY_FIELDS[editing?.entityType ?? entityType] ?? [];

  const handlePipelineChange = useCallback((v: string) => {
    form.setValue("pipelineId", v || null);
    form.setValue("stageKey", null);
  }, [form]);

  const handleFormSubmit = useCallback((data: RuleFormValues) => {
    onSubmit(data, !!editing);
  }, [editing, onSubmit]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[420px] flex-col gap-0 overflow-hidden p-0 sm:w-[480px] sm:max-w-none">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{editing ? "Edit Rule" : "Validation Rule"}</SheetTitle>
          <SheetDescription>
            {editing ? "Update this validation rule." : `Define a new validation rule. ${rulesCount} rules exist.`}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-5 px-6 py-5">
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scope</p>
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Entity Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!editing}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ENTITY_TABS.map((e) => (
                          <SelectItem key={e.value} value={e.value} className="text-xs">{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Field <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <>
                        <Input {...field} list="crm-fields-datalist" placeholder="e.g. email" className="text-xs" />
                        <datalist id="crm-fields-datalist">
                          {fields.map((f) => <option key={f} value={f} />)}
                        </datalist>
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Rule</p>
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Rule Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RULE_TYPE_GROUPS.map((group) => (
                          <div key={group.label}>
                            <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{group.label}</div>
                            {group.types.map((rt) => (
                              <SelectItem key={rt} value={rt} className="text-xs pl-4">{rt}</SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Config</p>

              {watchedRuleType === "regex" && (
                <FormField
                  control={form.control}
                  name="configPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Regex Pattern</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="^[A-Z]{3}$" className="text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showNumericConfig && (
                <FormField
                  control={form.control}
                  name="configValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{watchedRuleType.includes("min") ? "Minimum value" : "Maximum value"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" value={field.value ?? ""} placeholder="0" className="text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRuleType === "conditional_required" && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="configConditionField"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Condition Field</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="status" className="text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="configConditionValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Condition Value</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="qualified" className="text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {watchedRuleType === "stage_required" && (
                <FormItem>
                  <FormLabel className="text-xs">Pipeline</FormLabel>
                  <Select value={watchedPipelineId ?? ""} onValueChange={handlePipelineChange}>
                    <SelectTrigger><SelectValue placeholder="Select pipeline…" /></SelectTrigger>
                    <SelectContent>
                      {pipelines.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}

              {watchedRuleType === "stage_required" && watchedPipelineId && (
                <FormField
                  control={form.control}
                  name="stageKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Stage</FormLabel>
                      <CrmStageSelect pipelineIdOrType={watchedPipelineId} value={field.value ?? ""} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRuleType === "source_required" && (
                <FormField
                  control={form.control}
                  name="sourceKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Source</FormLabel>
                      <CrmOptionSelect type="source" value={field.value ?? ""} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRuleType !== "stage_required" && (
                <FormField
                  control={form.control}
                  name="pipelineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Pipeline scope (optional)</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={(v) => { field.onChange(v || null); form.setValue("stageKey", null); }}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Any pipeline" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">Any pipeline</SelectItem>
                          {pipelines.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRuleType !== "stage_required" && watchedPipelineId && (
                <FormField
                  control={form.control}
                  name="stageKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Stage scope (optional)</FormLabel>
                      <CrmStageSelect pipelineIdOrType={watchedPipelineId} value={field.value ?? ""} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedRuleType !== "source_required" && (
                <FormField
                  control={form.control}
                  name="sourceKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Source scope (optional)</FormLabel>
                      <CrmOptionSelect type="source" value={field.value ?? ""} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="errorMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Custom error message (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="This field is required" className="text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <FormLabel className="text-xs cursor-pointer">Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            </SheetBody>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving…" size="sm" className="w-full">
                {editing ? "Save Changes" : "Create Rule"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
