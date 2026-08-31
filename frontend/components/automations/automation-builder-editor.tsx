import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditionOp,
  AutomationTrigger,
} from "@/hooks/api/automations";
import type {
  AiAutomationAction,
  ExtendedAutomationAction,
  ExtendedAutomationActionType,
} from "@/hooks/api/automation-ai-nodes";
import {
  AiActionConfigRenderer,
  StandardActionConfigRenderer,
} from "./ai-node-config-forms";
import { ACTION_TYPES, CONDITION_OPS } from "./automation-meta";
import type { TriggerMeta } from "./automation-trigger-data";

interface AutomationBuilderEditorProps {
  actions: ExtendedAutomationAction[];
  conditions: AutomationCondition[];
  description: string;
  effectiveTriggerOptions: TriggerMeta[];
  isEnabled: boolean;
  name: string;
  triggerEvent: AutomationTrigger;
  triggerMeta: TriggerMeta;
  onActionConfig: (index: number, patch: Record<string, unknown>) => void;
  onAddAction: (type: ExtendedAutomationActionType) => void;
  onAddCondition: () => void;
  onConditionField: (index: number, field: string) => void;
  onConditionOp: (index: number, op: AutomationConditionOp) => void;
  onConditionValue: (index: number, value: string) => void;
  onDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onEnabledChange: (enabled: boolean) => void;
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAction: (index: number) => void;
  onRemoveCondition: (index: number) => void;
  onTriggerChange: (trigger: string) => void;
}

function isAiAction(
  action: ExtendedAutomationAction,
): action is AiAutomationAction {
  return action.type.startsWith("ai_");
}

export function AutomationBuilderEditor({
  actions,
  conditions,
  description,
  effectiveTriggerOptions,
  isEnabled,
  name,
  triggerEvent,
  triggerMeta,
  onActionConfig,
  onAddAction,
  onAddCondition,
  onConditionField,
  onConditionOp,
  onConditionValue,
  onDescriptionChange,
  onEnabledChange,
  onNameChange,
  onRemoveAction,
  onRemoveCondition,
  onTriggerChange,
}: AutomationBuilderEditorProps) {
  return (
    <div className="px-6 py-4 space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="automation-name">Name *</Label>
        <Input
          id="automation-name"
          placeholder="e.g. Notify sales on hot lead"
          value={name}
          onChange={onNameChange}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="automation-description">Description</Label>
        <Textarea
          id="automation-description"
          rows={2}
          placeholder="What does this automation do?"
          value={description}
          onChange={onDescriptionChange}
        />
      </div>

      <div className="space-y-1.5">
        <Label id="automation-trigger-label">Trigger *</Label>
        <Select value={triggerEvent} onValueChange={onTriggerChange}>
          <SelectTrigger aria-labelledby="automation-trigger-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {effectiveTriggerOptions.map((trigger) => (
              <SelectItem key={trigger.value} value={trigger.value}>
                {trigger.label} — {trigger.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Conditions (all must pass)</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddCondition}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {conditions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No conditions — runs on every {triggerMeta.label.toLowerCase()}{" "}
            event.
          </p>
        ) : (
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <div
                key={`${condition.field}-${index}`}
                className="flex items-start gap-2"
              >
                <Select
                  value={condition.field}
                  onValueChange={(value) => onConditionField(index, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerMeta.fields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={condition.op}
                  onValueChange={(value) =>
                    onConditionOp(index, value as AutomationConditionOp)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPS.map((operation) => (
                      <SelectItem key={operation.value} value={operation.value}>
                        {operation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {condition.op !== "exists" ? (
                  <Input
                    className="flex-1"
                    placeholder="Value"
                    value={
                      condition.value === undefined || condition.value === null
                        ? ""
                        : String(condition.value)
                    }
                    onChange={(event) =>
                      onConditionValue(index, event.target.value)
                    }
                  />
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => onRemoveCondition(index)}
                  aria-label={`Remove condition ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Actions *</Label>
          <Select
            value=""
            onValueChange={(value) =>
              onAddAction(value as ExtendedAutomationActionType)
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Add action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {actions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No actions yet. Add at least one.
          </p>
        ) : (
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div
                key={`${action.type}-${index}`}
                className="rounded-lg border border-border/60 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-dense">
                      {ACTION_TYPES.find(
                        (candidate) => candidate.value === action.type,
                      )?.label ?? action.type}
                    </Badge>
                    {isAiAction(action) ? (
                      <Sparkles className="h-3.5 w-3.5 text-status-warning-ink" />
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemoveAction(index)}
                    aria-label={`Remove action ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                {isAiAction(action) ? (
                  <AiActionConfigRenderer
                    action={action}
                    onChange={(patch) => onActionConfig(index, patch)}
                  />
                ) : (
                  <StandardActionConfigRenderer
                    action={action as AutomationAction}
                    onChange={(patch) => onActionConfig(index, patch)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {actions.some(isAiAction) ? (
          <div className="flex items-start gap-1.5 rounded-md bg-status-warning-surface border border-status-warning-rule p-2 text-xs text-status-warning-ink">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              AI actions consume credits from your organization&apos;s AI
              budget.
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
        <div>
          <p className="text-sm font-medium">Enabled</p>
          <p className="text-xs text-muted-foreground">
            Disabled automations stay saved but never run.
          </p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={onEnabledChange} />
      </div>
    </div>
  );
}
