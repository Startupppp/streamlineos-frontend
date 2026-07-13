"use client";

import { useCallback } from "react";
import { z } from "zod";
import { type Control } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";

export type AutomationTrigger =
  | "lead.created"
  | "lead.status_changed"
  | "lead.score_changed"
  | "lead.assigned"
  | "deal.stage_changed"
  | "task.overdue";

export type AutomationAction =
  | "send_email"
  | "assign_to"
  | "update_field"
  | "create_task"
  | "send_notification"
  | "add_tag";

export interface AutomationCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "is_empty";
  value: string;
}

export interface AutomationRule {
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

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  "lead.created": "When lead is created",
  "lead.status_changed": "When lead status changes",
  "lead.score_changed": "When lead score changes",
  "lead.assigned": "When lead is assigned",
  "deal.stage_changed": "When deal stage changes",
  "task.overdue": "When task is overdue",
};

export const ACTION_LABELS: Record<AutomationAction, string> = {
  send_email: "Send email",
  assign_to: "Assign to",
  update_field: "Update field",
  create_task: "Create task",
  send_notification: "Send notification",
  add_tag: "Add tag",
};

export const ALL_ACTIONS: AutomationAction[] = [
  "send_email",
  "assign_to",
  "update_field",
  "create_task",
  "send_notification",
  "add_tag",
];

export const CONDITION_FIELDS = [
  { value: "status", label: "Status" },
  { value: "score", label: "Score" },
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "assignedToId", label: "Assigned To" },
];

export const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "is_empty", label: "Is empty" },
];

export const TRIGGERS = Object.entries(TRIGGER_LABELS) as [AutomationTrigger, string][];

export const conditionSchema = z.object({
  field: z.string().min(1, "Required"),
  operator: z.enum(["equals", "contains", "greater_than", "less_than", "is_empty"]),
  value: z.string().min(1, "Required"),
});

export const automationSchema = z.object({
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
export type AutomationForm = z.infer<typeof automationSchema>;

export function formatActionSummary(actions: AutomationAction[]): string {
  if (actions.length === 0) return "No actions";
  const labels = actions.slice(0, 2).map((a) => ACTION_LABELS[a]).join(" + ");
  const extra = actions.length > 2 ? ` +${actions.length - 2} more` : "";
  return `→ ${labels}${extra}`;
}

export function formatLastRun(lastRunAt: string | null): string {
  if (!lastRunAt) return "Never run";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(lastRunAt));
}

export function useAutomationRules() {
  return useQuery({
    queryKey: ["crm-automations"] as const,
    queryFn: () => apiClient.get<{ rules: AutomationRule[] }>("/crm/automations"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-automations", "create"],
    mutationFn: (
      input: Omit<AutomationRule, "id" | "executionCount" | "lastRunAt" | "createdAt">,
    ) => apiClient.post<{ rule: AutomationRule }>("/crm/automations", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crm-automations"] });
    },
  });
}

export function useToggleAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-automations", "toggle"],
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.patch<{ rule: AutomationRule }>(`/crm/automations/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crm-automations"] });
    },
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-automations", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/automations/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crm-automations"] });
    },
  });
}

const REDUCED_ITEM_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

interface AutomationCardProps {
  rule: AutomationRule;
  onToggle: (id: number, isActive: boolean) => void;
  onDeleteRequest: (id: number) => void;
}

export function AutomationCard({ rule, onToggle, onDeleteRequest }: AutomationCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? REDUCED_ITEM_VARIANTS : fadeUp;

  const handleToggle = useCallback(
    () => onToggle(rule.id, rule.isActive),
    [rule.id, rule.isActive, onToggle],
  );
  const handleDeleteRequest = useCallback(
    () => onDeleteRequest(rule.id),
    [rule.id, onDeleteRequest],
  );

  return (
    <motion.div variants={variants}>
      <Card
        className={cn(
          "bg-card rounded-lg border border-border shadow-sm transition-all hover:shadow-md",
          !rule.isActive && "opacity-60",
        )}
      >
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
                  className="text-[10px] shrink-0 font-normal text-primary border-primary/20 bg-primary/10"
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
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteRequest}
                aria-label="Delete automation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ConditionRowProps {
  cField: { id: string };
  index: number;
  control: Control<AutomationForm>;
  showRemove: boolean;
  onRemove: (index: number) => void;
}

export function ConditionRow({ index: i, control, showRemove, onRemove }: ConditionRowProps) {
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
              {CONDITION_FIELDS.map((f) => (
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
              {CONDITION_OPERATORS.map((o) => (
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

export function ActionCheckboxItem({ action, checked, onToggle }: ActionCheckboxItemProps) {
  const handleChange = useCallback(
    (cs: boolean | "indeterminate") => onToggle(action, cs === true),
    [action, onToggle],
  );

  return (
    <div className="flex items-center gap-2">
      <Checkbox id={`action-${action}`} checked={checked} onCheckedChange={handleChange} />
      <Label
        htmlFor={`action-${action}`}
        className="text-xs font-normal cursor-pointer leading-none"
      >
        {ACTION_LABELS[action]}
      </Label>
    </div>
  );
}
