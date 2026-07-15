"use client";

import { useState, type ChangeEvent } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useReconciliationRules,
  useCreateReconciliationRule,
  useDeleteReconciliationRule,
} from "@/hooks/api/accounting/banking";
import type {
  ReconciliationRuleCondition,
  ReconciliationRuleAction,
} from "@/hooks/api/accounting/banking";
import { Skeleton } from "@/components/ui/skeleton";

const FIELD_OPTIONS: Array<{ value: ReconciliationRuleCondition["field"]; label: string }> = [
  { value: "description", label: "Description" },
  { value: "counterparty", label: "Counterparty" },
  { value: "amount", label: "Amount" },
];

const OP_OPTIONS: Array<{ value: ReconciliationRuleCondition["op"]; label: string }> = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
];

const ACTION_OPTIONS: Array<{ value: ReconciliationRuleAction["type"]; label: string }> = [
  { value: "categorize", label: "Categorize" },
  { value: "transfer", label: "Transfer" },
  { value: "fee", label: "Bank Fee" },
];

interface RuleFormState {
  name: string;
  priority: string;
  conditions: ReconciliationRuleCondition[];
  actionType: ReconciliationRuleAction["type"];
  isActive: boolean;
}

const DEFAULT_FORM: RuleFormState = {
  name: "",
  priority: "10",
  conditions: [{ field: "description", op: "contains", value: "" }],
  actionType: "categorize",
  isActive: true,
};

interface Props {
  bankAccountId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReconciliationRulesSheet({ bankAccountId, open, onOpenChange }: Props) {
  const [addingRule, setAddingRule] = useState(false);
  const [form, setForm] = useState<RuleFormState>(DEFAULT_FORM);

  const rulesQuery = useReconciliationRules(bankAccountId);
  const createRule = useCreateReconciliationRule(bankAccountId);
  const deleteRule = useDeleteReconciliationRule(bankAccountId);

  const rules = rulesQuery.data ?? [];

  function handleAddCondition() {
    setForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { field: "description", op: "contains", value: "" }],
    }));
  }

  function handleRemoveCondition(idx: number) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== idx),
    }));
  }

  function handleConditionChange(
    idx: number,
    key: keyof ReconciliationRuleCondition,
    value: string,
  ) {
    setForm((prev) => {
      const conditions = prev.conditions.map((c, i) =>
        i === idx ? { ...c, [key]: value } : c,
      );
      return { ...prev, conditions };
    });
  }

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, name: e.target.value }));
  }

  function handlePriorityChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, priority: e.target.value }));
  }

  function isRuleActionType(v: string): v is ReconciliationRuleAction["type"] {
    return ACTION_OPTIONS.some((o) => o.value === v);
  }

  function handleActionTypeChange(value: string) {
    if (!isRuleActionType(value)) return;
    setForm((prev) => ({ ...prev, actionType: value }));
  }

  function handleIsActiveChange(checked: boolean) {
    setForm((prev) => ({ ...prev, isActive: checked }));
  }

  function handleStartAdd() {
    setForm(DEFAULT_FORM);
    setAddingRule(true);
  }

  function handleCancelAdd() {
    setAddingRule(false);
  }

  function handleSaveRule() {
    createRule.mutate(
      {
        name: form.name,
        priority: parseInt(form.priority, 10) || 10,
        conditions: form.conditions,
        action: { type: form.actionType },
        isActive: form.isActive,
      },
      {
        onSuccess: () => {
          setAddingRule(false);
          setForm(DEFAULT_FORM);
        },
      },
    );
  }

  function handleDeleteRule(ruleId: number) {
    deleteRule.mutate(ruleId);
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Reconciliation Rules"
      description="Auto-match transactions based on conditions."
      footer={
        !addingRule ? (
          <Button className="flex-1" onClick={handleStartAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Rule
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {rulesQuery.isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </>
        ) : rules.length === 0 && !addingRule ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No rules yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a rule to auto-match transactions on import.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border border-border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{rule.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      P{rule.priority}
                    </Badge>
                    <Badge
                      variant={rule.isActive ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This rule will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {rule.conditions.map((c, i) => (
                    <span key={i}>
                      {i > 0 && " AND "}
                      <span className="font-medium text-foreground">{c.field}</span>{" "}
                      {c.op}{" "}
                      <span className="font-medium text-foreground">&ldquo;{c.value}&rdquo;</span>
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Action:{" "}
                  <span className="font-medium text-foreground capitalize">
                    {rule.action.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {addingRule && (
          <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold">New Rule</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rule name *</Label>
                <Input
                  placeholder="e.g. Bank charges"
                  value={form.name}
                  onChange={handleNameChange}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={form.priority}
                  onChange={handlePriorityChange}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Conditions</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleAddCondition}
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  Add
                </Button>
              </div>
              {form.conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Select
                    value={cond.field}
                    onValueChange={(v) => handleConditionChange(i, "field", v)}
                  >
                    <SelectTrigger className="w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={cond.op}
                    onValueChange={(v) => handleConditionChange(i, "op", v)}
                  >
                    <SelectTrigger className="w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={cond.value}
                    onChange={(e) => handleConditionChange(i, "value", e.target.value)}
                    className="text-xs flex-1"
                  />
                  {form.conditions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 shrink-0"
                      onClick={() => handleRemoveCondition(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select value={form.actionType} onValueChange={handleActionTypeChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="rule-active"
                checked={form.isActive}
                onCheckedChange={handleIsActiveChange}
              />
              <Label htmlFor="rule-active" className="text-xs cursor-pointer">
                Active
              </Label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCancelAdd}>
                Cancel
              </Button>
              <LoadingButton
                size="sm"
                className="flex-1"
                isPending={createRule.isPending}
                loadingText="Saving…"
                disabled={!form.name || form.conditions.some((c) => !c.value)}
                onClick={handleSaveRule}
              >
                Save Rule
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </AppSheet>
  );
}
