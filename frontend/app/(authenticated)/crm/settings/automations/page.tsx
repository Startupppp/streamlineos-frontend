"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Plus, Trash2, Settings } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type AutomationTrigger =
  | "lead.created"
  | "lead.status_changed"
  | "lead.score_changed"
  | "lead.assigned"
  | "deal.stage_changed"
  | "task.overdue";

type AutomationAction =
  | "send_email"
  | "assign_to"
  | "update_field"
  | "create_task"
  | "send_notification"
  | "add_tag";

interface AutomationCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "is_empty";
  value: string;
}

interface AutomationRule {
  id: number;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  executionCount: number;
  lastRunAt: string | null;
  createdAt: string | null;
}

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  "lead.created": "When lead is created",
  "lead.status_changed": "When lead status changes",
  "lead.score_changed": "When lead score changes",
  "lead.assigned": "When lead is assigned",
  "deal.stage_changed": "When deal stage changes",
  "task.overdue": "When task is overdue",
};

const ACTION_LABELS: Record<AutomationAction, string> = {
  send_email: "Send email",
  assign_to: "Assign to",
  update_field: "Update field",
  create_task: "Create task",
  send_notification: "Send notification",
  add_tag: "Add tag",
};

const ALL_ACTIONS: AutomationAction[] = [
  "send_email",
  "assign_to",
  "update_field",
  "create_task",
  "send_notification",
  "add_tag",
];

const CONDITION_FIELDS = [
  { value: "status", label: "Status" },
  { value: "score", label: "Score" },
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "assignedToId", label: "Assigned To" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "is_empty", label: "Is empty" },
];

const TRIGGERS = Object.entries(TRIGGER_LABELS) as [AutomationTrigger, string][];

const conditionSchema = z.object({
  field: z.string().min(1, "Required"),
  operator: z.enum(["equals", "contains", "greater_than", "less_than", "is_empty"]),
  value: z.string().min(1, "Required"),
});

const automationSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  trigger: z.enum([
    "lead.created",
    "lead.status_changed",
    "lead.score_changed",
    "lead.assigned",
    "deal.stage_changed",
    "task.overdue",
  ]),
  conditions: z.array(conditionSchema).min(1, "At least one condition required"),
  actions: z
    .array(z.enum(["send_email", "assign_to", "update_field", "create_task", "send_notification", "add_tag"]))
    .min(1, "At least one action required"),
  isActive: z.boolean(),
});
type AutomationForm = z.infer<typeof automationSchema>;

function useAutomationRules() {
  return useQuery({
    queryKey: ["crm-automations"] as const,
    queryFn: () => apiClient.get<{ rules: AutomationRule[] }>("/crm/automations"),
    staleTime: 2 * 60_000,
  });
}

function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-automations", "create"],
    mutationFn: (input: Omit<AutomationRule, "id" | "executionCount" | "lastRunAt" | "createdAt">) =>
      apiClient.post<{ rule: AutomationRule }>("/crm/automations", input),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["crm-automations"] }); },
  });
}

function useToggleAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-automations", "toggle"],
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.patch<{ rule: AutomationRule }>(`/crm/automations/${id}`, { isActive }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["crm-automations"] }); },
  });
}

function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-automations", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/crm/automations/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["crm-automations"] }); },
  });
}

function formatActionSummary(actions: AutomationAction[]): string {
  if (actions.length === 0) return "No actions";
  const labels = actions.slice(0, 2).map(a => ACTION_LABELS[a]).join(" + ");
  const extra = actions.length > 2 ? ` +${actions.length - 2} more` : "";
  return `→ ${labels}${extra}`;
}

function formatLastRun(lastRunAt: string | null): string {
  if (!lastRunAt) return "Never run";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(lastRunAt));
}

interface AutomationCardProps {
  rule: AutomationRule;
  onToggle: (id: number, isActive: boolean) => void;
  onDeleteRequest: (id: number) => void;
}

function AutomationCard({ rule, onToggle, onDeleteRequest }: AutomationCardProps) {
  const handleToggle = useCallback(
    () => onToggle(rule.id, rule.isActive),
    [rule.id, rule.isActive, onToggle],
  );
  const handleDeleteRequest = useCallback(
    () => onDeleteRequest(rule.id),
    [rule.id, onDeleteRequest],
  );

  return (
    <Card className={cn(
      "shadow-sm border border-slate-200/80 transition-all hover:shadow-md bg-white/90 backdrop-blur-sm rounded-2xl",
      !rule.isActive && "opacity-60",
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate text-foreground">{rule.name}</h3>
              <Badge variant="secondary" className="text-[10px] shrink-0 font-normal">
                {TRIGGER_LABELS[rule.trigger]}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] shrink-0 font-normal text-violet-700 border-violet-200 bg-violet-50/60"
              >
                {formatActionSummary(rule.actions)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                {rule.executionCount} run{rule.executionCount !== 1 ? "s" : ""}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                Last run: {formatLastRun(rule.lastRunAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.isActive} onCheckedChange={handleToggle} />
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteRequest}
                aria-label="Delete automation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConditionRowProps {
  cField: { id: string };
  index: number;
  control: Control<AutomationForm>;
  showRemove: boolean;
  onRemove: (index: number) => void;
}

function ConditionRow({ index: i, control, showRemove, onRemove }: ConditionRowProps) {
  const handleRemove = useCallback(() => onRemove(i), [i, onRemove]);

  return (
    <div className="flex items-start gap-2">
      <FormField
        control={control}
        name={`conditions.${i}.field`}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger className="h-8 text-xs w-[6.5rem]">
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_FIELDS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FormField
        control={control}
        name={`conditions.${i}.operator`}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger className="h-8 text-xs w-[6.5rem]">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPERATORS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FormField
        control={control}
        name={`conditions.${i}.value`}
        render={({ field }) => (
          <Input {...field} className="h-8 text-xs flex-1" placeholder="Value" />
        )}
      />
      {showRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive shrink-0"
          onClick={handleRemove}
          aria-label="Remove condition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface ActionCheckboxItemProps {
  action: AutomationAction;
  checked: boolean;
  onToggle: (action: AutomationAction, checked: boolean) => void;
}

function ActionCheckboxItem({ action, checked, onToggle }: ActionCheckboxItemProps) {
  const handleChange = useCallback(
    (cs: boolean | "indeterminate") => onToggle(action, cs === true),
    [action, onToggle],
  );

  return (
    <div className="flex items-center gap-2">
      <Checkbox id={`action-${action}`} checked={checked} onCheckedChange={handleChange} />
      <Label htmlFor={`action-${action}`} className="text-xs font-normal cursor-pointer leading-none">
        {ACTION_LABELS[action]}
      </Label>
    </div>
  );
}

export default function AutomationsPage() {
  const { data, isLoading, isError, refetch } = useAutomationRules();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createRule = useCreateAutomationRule();
  const toggleRule = useToggleAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const form = useForm<AutomationForm>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      name: "",
      trigger: "lead.created",
      conditions: [{ field: "", operator: "equals", value: "" }],
      actions: [],
      isActive: true,
    },
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const watchedActions = form.watch("actions");

  const onSubmit = useCallback((values: AutomationForm) => {
    createRule.mutate(values, {
      onSuccess: () => {
        toast.success("Automation created");
        setSheetOpen(false);
        form.reset();
      },
      onError: (err) => toast.error(err.message),
    });
  }, [createRule, form]);

  const handleToggle = useCallback((id: number, isActive: boolean) => {
    toggleRule.mutate({ id, isActive: !isActive }, {
      onSuccess: () => toast.success(isActive ? "Automation disabled" : "Automation enabled"),
      onError: (err) => toast.error(err.message),
    });
  }, [toggleRule]);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteRule.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Automation deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  }, [deleteRule, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) handleDeleteCancel();
  }, [handleDeleteCancel]);

  const handleAddCondition = useCallback(() => {
    appendCondition({ field: "", operator: "equals", value: "" });
  }, [appendCondition]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((open: boolean) => setSheetOpen(open), []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleActionToggle = useCallback((action: AutomationAction, checked: boolean) => {
    const current = form.getValues("actions");
    form.setValue(
      "actions",
      checked ? [...current, action] : current.filter(a => a !== action),
      { shouldValidate: true },
    );
  }, [form]);

  const rules = data?.rules ?? [];

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              This automation will be permanently deleted and will no longer run on future triggers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteRule.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Automation</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Automation Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Notify team on new lead" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trigger"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a trigger" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRIGGERS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label className="text-sm font-medium">Conditions</Label>
                <div className="space-y-2">
                  {conditionFields.map((cField, i) => (
                    <ConditionRow
                      key={cField.id}
                      cField={cField}
                      index={i}
                      control={form.control}
                      showRemove={conditionFields.length > 1}
                      onRemove={removeCondition}
                    />
                  ))}
                </div>
                {form.formState.errors.conditions?.root && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.conditions.root.message}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 text-xs"
                  onClick={handleAddCondition}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Actions</Label>
                <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                  {ALL_ACTIONS.map(action => (
                    <ActionCheckboxItem
                      key={action}
                      action={action}
                      checked={watchedActions.includes(action)}
                      onToggle={handleActionToggle}
                    />
                  ))}
                </div>
                {form.formState.errors.actions && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.actions.message}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="!mt-0 cursor-pointer">Active immediately</FormLabel>
                        <p className="text-[11px] text-muted-foreground">
                          Enable this automation as soon as it is created.
                        </p>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <SheetFooter className="pt-1 pb-2">
                <motion.div className="w-full" whileTap={{ scale: 0.97 }}>
                  <Button
                    type="submit"
                    disabled={createRule.isPending}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {createRule.isPending ? "Creating..." : "Create Automation"}
                  </Button>
                </motion.div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <PageWrapper
        title="Workflow Automation"
        subtitle="Automate repetitive CRM tasks with triggers and actions"
        actions={
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleOpenSheet}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </motion.div>
        }
      >
        {isError ? (
          <div className="flex flex-1 items-center justify-center py-14">
            <EmptyState
              illustration={<Settings className="h-10 w-10 text-muted-foreground" />}
              title="Failed to load automations"
              description="Something went wrong. Please try again."
              action={{ label: "Retry", onClick: handleRetry }}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[4.5rem] rounded-2xl bg-muted/40 animate-pulse" />
                ))}
              </motion.div>
            ) : rules.length === 0 ? (
              <motion.div
                key="empty"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
                className="flex flex-1 items-center justify-center py-14"
              >
                <EmptyState
                  illustration={<Zap className="h-10 w-10 text-muted-foreground" />}
                  title="No automations yet"
                  description="Create your first automation to start saving time on repetitive CRM tasks."
                  action={{ label: "Create Automation", onClick: handleOpenSheet }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {rules.map(rule => (
                  <motion.div key={rule.id} variants={fadeUp}>
                    <AutomationCard
                      rule={rule}
                      onToggle={handleToggle}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </PageWrapper>
    </>
  );
}
