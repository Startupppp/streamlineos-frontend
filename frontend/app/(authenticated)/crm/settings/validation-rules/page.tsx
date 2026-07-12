"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, FlaskConical } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useValidationRules, useCreateValidationRule, useUpdateValidationRule,
  useDeleteValidationRule, useTestValidationRules, useCrmMetadata,
} from "@/hooks/api/crm";
import { CrmOptionSelect } from "@/features/crm/shared/metadata";
import { CrmStageSelect } from "@/features/crm/shared/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { CrmValidationRule, CrmValidationEntityType, CrmValidationRuleType } from "@/types/crm/metadata";

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

const ALL_RULE_TYPES: CrmValidationRuleType[] = [
  "required", "unique",
  "email", "phone", "url", "regex",
  "numeric_min", "numeric_max", "currency_min", "currency_max",
  "date_not_past", "date_not_future",
  "conditional_required", "stage_required", "source_required",
];

const RULE_TYPE_GROUPS: { label: string; types: CrmValidationRuleType[] }[] = [
  { label: "Presence", types: ["required", "unique"] },
  { label: "Format", types: ["email", "phone", "url", "regex"] },
  { label: "Numeric", types: ["numeric_min", "numeric_max", "currency_min", "currency_max"] },
  { label: "Date", types: ["date_not_past", "date_not_future"] },
  { label: "Conditional", types: ["conditional_required", "stage_required", "source_required"] },
];

const RULE_TYPE_COLORS: Record<CrmValidationRuleType, string> = {
  required: "bg-red-50 text-red-700 border-red-200",
  email: "bg-blue-50 text-blue-700 border-blue-200",
  phone: "bg-blue-50 text-blue-700 border-blue-200",
  url: "bg-blue-50 text-blue-700 border-blue-200",
  regex: "bg-violet-50 text-violet-700 border-violet-200",
  numeric_min: "bg-amber-50 text-amber-700 border-amber-200",
  numeric_max: "bg-amber-50 text-amber-700 border-amber-200",
  currency_min: "bg-amber-50 text-amber-700 border-amber-200",
  currency_max: "bg-amber-50 text-amber-700 border-amber-200",
  date_not_past: "bg-cyan-50 text-cyan-700 border-cyan-200",
  date_not_future: "bg-cyan-50 text-cyan-700 border-cyan-200",
  unique: "bg-emerald-50 text-emerald-700 border-emerald-200",
  conditional_required: "bg-orange-50 text-orange-700 border-orange-200",
  stage_required: "bg-orange-50 text-orange-700 border-orange-200",
  source_required: "bg-orange-50 text-orange-700 border-orange-200",
};

const ruleSchema = z.object({
  entityType: z.enum(["lead", "deal", "contact", "company", "quote"]),
  field: z.string().min(1, "Field is required"),
  ruleType: z.enum(ALL_RULE_TYPES as [CrmValidationRuleType, ...CrmValidationRuleType[]]),
  config: z.record(z.unknown()).optional(),
  pipelineId: z.string().nullable().optional(),
  stageKey: z.string().nullable().optional(),
  sourceKey: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  isActive: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface RuleRowProps {
  rule: CrmValidationRule;
  pipelineName: string | undefined;
  onEdit: (rule: CrmValidationRule) => void;
  onToggle: (id: string, current: boolean) => void;
  onDeleteRequest: (id: string) => void;
}

function RuleRow({ rule, pipelineName, onEdit, onToggle, onDeleteRequest }: RuleRowProps) {
  const handleEdit = useCallback(() => onEdit(rule), [rule, onEdit]);
  const handleToggle = useCallback(() => onToggle(rule.id, rule.isActive), [rule.id, rule.isActive, onToggle]);
  const handleDelete = useCallback(() => onDeleteRequest(rule.id), [rule.id, onDeleteRequest]);

  return (
    <TableRow className={cn("h-9 hover:bg-muted/30 transition-colors", !rule.isActive && "opacity-60")}>
      <TableCell className="px-2 py-1">
        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">{rule.field}</span>
      </TableCell>
      <TableCell className="px-2 py-1">
        <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 py-0 border", RULE_TYPE_COLORS[rule.ruleType])}>
          {rule.ruleType}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-1">
        <div className="flex items-center gap-1 flex-wrap">
          {pipelineName && (
            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
              {pipelineName}
            </span>
          )}
          {rule.stageKey && (
            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
              stage:{rule.stageKey}
            </span>
          )}
          {rule.sourceKey && (
            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
              src:{rule.sourceKey}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-2 py-1 text-center text-[10px] text-muted-foreground">{rule.sortOrder}</TableCell>
      <TableCell className="px-2 py-1 text-center">
        <Switch checked={rule.isActive} onCheckedChange={handleToggle} />
      </TableCell>
      <TableCell className="px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit rule">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete} aria-label="Delete rule">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface ConfigFieldsProps {
  ruleType: CrmValidationRuleType;
  pipelineId: string | null | undefined;
  setPipelineId: (v: string | null) => void;
}

function ConfigFields({ ruleType, pipelineId, setPipelineId }: ConfigFieldsProps) {
  const { data: metadata } = useCrmMetadata();
  const pipelines = metadata?.pipelines ?? [];

  if (ruleType === "regex") {
    return (
      <FormField
        name="config.pattern"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Regex Pattern</FormLabel>
            <FormControl>
              <Input {...field} value={typeof field.value === "string" ? field.value : ""} placeholder="^[A-Z]{3}$" className="h-8 text-xs" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (["numeric_min", "numeric_max", "currency_min", "currency_max"].includes(ruleType)) {
    const label = ruleType.includes("min") ? "Minimum value" : "Maximum value";
    return (
      <FormField
        name="config.value"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">{label}</FormLabel>
            <FormControl>
              <Input {...field} type="number" value={typeof field.value === "number" ? field.value : ""} placeholder="0" className="h-8 text-xs" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (ruleType === "conditional_required") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <FormField
          name="config.condition_field"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Condition Field</FormLabel>
              <FormControl>
                <Input {...field} value={typeof field.value === "string" ? field.value : ""} placeholder="status" className="h-8 text-xs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="config.condition_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Condition Value</FormLabel>
              <FormControl>
                <Input {...field} value={typeof field.value === "string" ? field.value : ""} placeholder="qualified" className="h-8 text-xs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  if (ruleType === "stage_required") {
    return (
      <div className="space-y-3">
        <FormItem>
          <FormLabel className="text-xs">Pipeline</FormLabel>
          <Select value={pipelineId ?? ""} onValueChange={(v) => setPipelineId(v || null)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select pipeline…" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
        {pipelineId && (
          <FormField
            name="stageKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Stage</FormLabel>
                <CrmStageSelect
                  pipelineIdOrType={pipelineId}
                  value={typeof field.value === "string" ? field.value : ""}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    );
  }

  if (ruleType === "source_required") {
    return (
      <FormField
        name="sourceKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Source</FormLabel>
            <CrmOptionSelect
              type="source"
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return null;
}

interface RuleSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CrmValidationRule | null;
  entityType: CrmValidationEntityType;
  rulesCount: number;
  onSubmitCreate: (data: RuleFormValues) => void;
  onSubmitUpdate: (data: RuleFormValues) => void;
  isPending: boolean;
}

function RuleSheet({ open, onOpenChange, editing, entityType, rulesCount, onSubmitCreate, onSubmitUpdate, isPending }: RuleSheetProps) {
  const { data: metadata } = useCrmMetadata();
  const pipelines = metadata?.pipelines ?? [];

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: editing
      ? {
          entityType: editing.entityType,
          field: editing.field,
          ruleType: editing.ruleType,
          config: editing.config ?? undefined,
          pipelineId: editing.pipelineId,
          stageKey: editing.stageKey,
          sourceKey: editing.sourceKey,
          errorMessage: editing.errorMessage,
          isActive: editing.isActive,
        }
      : {
          entityType,
          field: "",
          ruleType: "required",
          config: undefined,
          pipelineId: null,
          stageKey: null,
          sourceKey: null,
          errorMessage: null,
          isActive: true,
        },
  });

  const watchedRuleType = form.watch("ruleType");
  const watchedPipelineId = form.watch("pipelineId");

  const handleSetPipelineId = useCallback((v: string | null) => {
    form.setValue("pipelineId", v);
    form.setValue("stageKey", null);
  }, [form]);

  const handleSubmit = useCallback((data: RuleFormValues) => {
    if (editing) {
      onSubmitUpdate(data);
    } else {
      onSubmitCreate({ ...data, sortOrder: rulesCount } as RuleFormValues & { sortOrder: number });
    }
  }, [editing, onSubmitCreate, onSubmitUpdate, rulesCount]);

  const fields = ENTITY_FIELDS[editing?.entityType ?? entityType] ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{editing ? "Edit Rule" : "Validation Rule"}</SheetTitle>
          <SheetDescription>
            {editing ? "Update this validation rule." : "Define a new field validation rule for CRM entities."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Scope</p>
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Entity Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!editing}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
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
                    <FormLabel className="text-xs">Field</FormLabel>
                    <FormControl>
                      <>
                        <Input
                          {...field}
                          list="crm-fields-datalist"
                          placeholder="e.g. email"
                          className="h-8 text-xs"
                        />
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
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RULE_TYPE_GROUPS.map((group) => (
                          <div key={group.label}>
                            <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {group.label}
                            </div>
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
              <ConfigFields
                ruleType={watchedRuleType}
                pipelineId={watchedPipelineId}
                setPipelineId={handleSetPipelineId}
              />
              {watchedRuleType !== "stage_required" && (
                <FormItem>
                  <FormLabel className="text-xs">Pipeline (optional scope)</FormLabel>
                  <Select
                    value={watchedPipelineId ?? ""}
                    onValueChange={(v) => handleSetPipelineId(v || null)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Any pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">Any pipeline</SelectItem>
                      {pipelines.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
              {watchedPipelineId && watchedRuleType !== "stage_required" && (
                <FormField
                  control={form.control}
                  name="stageKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Stage (optional)</FormLabel>
                      <CrmStageSelect
                        pipelineIdOrType={watchedPipelineId}
                        value={typeof field.value === "string" ? field.value : ""}
                        onChange={field.onChange}
                      />
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
                      <FormLabel className="text-xs">Source (optional)</FormLabel>
                      <CrmOptionSelect
                        type="source"
                        value={typeof field.value === "string" ? field.value : ""}
                        onChange={field.onChange}
                      />
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
                    <FormLabel className="text-xs">Custom Error Message (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="This field is required"
                        className="h-8 text-xs"
                      />
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

            <SheetFooter>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving…" size="sm">
                {editing ? "Save Changes" : "Create Rule"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

interface TestPanelProps {
  entityType: CrmValidationEntityType;
}

function TestPanel({ entityType }: TestPanelProps) {
  const [fieldKey, setFieldKey] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [record, setRecord] = useState<Record<string, unknown>>({});

  const testMutation = useTestValidationRules();

  const handleFieldKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFieldKey(e.target.value), []);
  const handleFieldValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.value), []);

  const handleAddField = useCallback(() => {
    if (!fieldKey.trim()) return;
    setRecord((prev) => ({ ...prev, [fieldKey.trim()]: fieldValue }));
    setFieldKey("");
    setFieldValue("");
  }, [fieldKey, fieldValue]);

  const handleRemoveField = useCallback((key: string) => {
    setRecord((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleRunTest = useCallback(() => {
    testMutation.mutate(
      { entityType, record },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [testMutation, entityType, record]);

  const errors = testMutation.data?.errors;
  const errorEntries = errors ? Object.entries(errors) : [];

  return (
    <Card className="bg-card rounded-lg border border-border shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-blue-500" />
          Test Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={fieldKey}
            onChange={handleFieldKeyChange}
            placeholder="field name"
            className="h-8 text-xs flex-1"
          />
          <Input
            value={fieldValue}
            onChange={handleFieldValueChange}
            placeholder="value"
            className="h-8 text-xs flex-1"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={handleAddField}>
            Add
          </Button>
        </div>
        {Object.keys(record).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(record).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 cursor-pointer hover:bg-destructive/10 hover:border-destructive/40"
                onClick={() => handleRemoveField(k)}
              >
                <span className="font-mono text-muted-foreground">{k}</span>
                <span>:</span>
                <span>{String(v)}</span>
                <span className="text-muted-foreground">×</span>
              </span>
            ))}
          </div>
        )}
        <LoadingButton
          type="button"
          size="sm"
          onClick={handleRunTest}
          isPending={testMutation.isPending}
          loadingText="Running…"
        >
          Run Test
        </LoadingButton>
        {testMutation.data && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Result</div>
            {errorEntries.length === 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-medium">
                  All rules pass
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                {errorEntries.map(([field, message]) => (
                  <div key={field} className="flex items-start gap-1.5">
                    <span className="font-mono text-[9px] bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5 shrink-0">
                      {field}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EntityRulesTabProps {
  entityType: CrmValidationEntityType;
  onNewRule: () => void;
}

function EntityRulesTab({ entityType, onNewRule }: EntityRulesTabProps) {
  const { data: rules, isLoading, isError, refetch } = useValidationRules({ entity: entityType });
  const { data: metadata } = useCrmMetadata();
  const updateRule = useUpdateValidationRule();
  const deleteRule = useDeleteValidationRule();
  const [editingRule, setEditingRule] = useState<CrmValidationRule | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const createRule = useCreateValidationRule();

  const pipelineMap = new Map((metadata?.pipelines ?? []).map((p) => [p.id, p.name]));

  const handleToggle = useCallback((id: string, current: boolean) => {
    updateRule.mutate(
      { id, isActive: !current },
      {
        onSuccess: () => toast.success("Rule updated"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [updateRule]);

  const handleDeleteRequest = useCallback((id: string) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    deleteRule.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Rule deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
    });
  }, [deleteRule, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);
  const handleEditOpen = useCallback((rule: CrmValidationRule) => setEditingRule(rule), []);
  const handleEditClose = useCallback((open: boolean) => { if (!open) setEditingRule(null); }, []);

  const handleSubmitUpdate = useCallback((data: RuleFormValues) => {
    if (!editingRule) return;
    updateRule.mutate(
      { id: editingRule.id, ...data, config: data.config ?? null, pipelineId: data.pipelineId ?? null, stageKey: data.stageKey ?? null, sourceKey: data.sourceKey ?? null, errorMessage: data.errorMessage ?? null },
      {
        onSuccess: () => { toast.success("Rule updated"); setEditingRule(null); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [editingRule, updateRule]);

  const handleSubmitCreate = useCallback((data: RuleFormValues & { sortOrder?: number }) => {
    createRule.mutate(
      { ...data, sortOrder: data.sortOrder ?? (rules?.length ?? 0), config: data.config ?? null, pipelineId: data.pipelineId ?? null, stageKey: data.stageKey ?? null, sourceKey: data.sourceKey ?? null, errorMessage: data.errorMessage ?? null },
      {
        onSuccess: () => toast.success("Rule created"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createRule, rules?.length]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>This validation rule will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RuleSheet
        open={!!editingRule}
        onOpenChange={handleEditClose}
        editing={editingRule}
        entityType={entityType}
        rulesCount={rules?.length ?? 0}
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={handleSubmitUpdate}
        isPending={updateRule.isPending || createRule.isPending}
      />

      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : isError ? (
          <EmptyState
            compact
            title="Failed to load rules"
            description="Something went wrong loading validation rules."
            action={{ label: "Retry", onClick: handleRetry }}
            className="min-h-[20vh] border-0 bg-transparent"
          />
        ) : rules && rules.length > 0 ? (
          <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow className="border-b-2 border-border hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Field</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Type</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Scope</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-center">Order</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-center">Active</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      pipelineName={rule.pipelineId ? pipelineMap.get(rule.pipelineId) : undefined}
                      onEdit={handleEditOpen}
                      onToggle={handleToggle}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            compact
            title="No rules for this entity"
            description="Add validation rules to enforce data quality on this entity type."
            action={{ label: "New Rule", onClick: onNewRule }}
            className="min-h-[20vh] border-0 bg-transparent"
          />
        )}

        <TestPanel entityType={entityType} />
      </div>
    </>
  );
}

export default function ValidationRulesPage() {
  const [activeTab, setActiveTab] = useState<CrmValidationEntityType>("lead");
  const [sheetOpen, setSheetOpen] = useState(false);
  const createRule = useCreateValidationRule();
  const { data: rules } = useValidationRules({ entity: activeTab });

  const handleOpenNew = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((v: boolean) => setSheetOpen(v), []);
  const handleTabChange = useCallback((v: string) => setActiveTab(v as CrmValidationEntityType), []);

  const handleSubmitCreate = useCallback((data: RuleFormValues & { sortOrder?: number }) => {
    createRule.mutate(
      { ...data, sortOrder: data.sortOrder ?? (rules?.length ?? 0), config: data.config ?? null, pipelineId: data.pipelineId ?? null, stageKey: data.stageKey ?? null, sourceKey: data.sourceKey ?? null, errorMessage: data.errorMessage ?? null },
      {
        onSuccess: () => { toast.success("Rule created"); setSheetOpen(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createRule, rules?.length]);

  return (
    <>
      <RuleSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editing={null}
        entityType={activeTab}
        rulesCount={rules?.length ?? 0}
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={() => undefined}
        isPending={createRule.isPending}
      />

      <PageWrapper
        title="Validation Rules"
        subtitle="Define field validation for CRM entities"
        actions={
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        }
      >
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            {ENTITY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {ENTITY_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <EntityRulesTab entityType={tab.value} onNewRule={handleOpenNew} />
            </TabsContent>
          ))}
        </Tabs>
      </PageWrapper>
    </>
  );
}
