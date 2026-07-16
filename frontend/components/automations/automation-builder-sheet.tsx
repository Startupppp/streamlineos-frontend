"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Play, CheckCircle2, XCircle, MinusCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateAutomation,
  useUpdateAutomation,
  useTestAutomation,
  type AutomationRule,
  type AutomationTrigger,
  type AutomationCondition,
  type AutomationConditionOp,
  type AutomationAction,
  type AutomationActionType,
  type AutomationTestResult,
} from "@/hooks/api/automations";
import {
  type AiAutomationAction,
  type AiAutomationActionType,
  type ExtendedAutomationAction,
  type ExtendedAutomationActionType,
} from "@/hooks/api/automation-ai-nodes";
import { AiActionConfigRenderer, StandardActionConfigRenderer } from "./ai-node-config-forms";
import {
  TRIGGER_META,
  CONDITION_OPS,
  ACTION_TYPES,
  getTriggerMeta,
  type TriggerMeta,
} from "./automation-meta";

interface AutomationBuilderSheetProps {
  rule?: AutomationRule;
  onClose: () => void;
  triggerOptions?: TriggerMeta[];
  defaultTrigger?: AutomationTrigger;
}

function defaultActionConfig(type: ExtendedAutomationActionType): ExtendedAutomationAction {
  switch (type) {
    case "notify_roles":
      return { type, config: { roles: [], title: "", message: "", link: "" } };
    case "notify_all":
      return { type, config: { title: "", message: "", link: "" } };
    case "email":
      return { type, config: { to: "", subject: "", body: "" } };
    case "create_task":
      return { type, config: { title: "", assigneeId: "", dueInDays: 1 } };
    case "webhook":
      return { type, config: { event: "" } };
    case "support_assign_ticket":
      return { type, config: { assigneeId: "" } };
    case "support_set_priority":
      return { type, config: { priority: "MEDIUM" } };
    case "support_add_tag":
      return { type, config: { tagId: 0 } };
    case "support_internal_note":
      return { type, config: { body: "" } };
    case "ai_classify":
      return { type, config: { labels: [], field: "" } };
    case "ai_summarize":
      return { type, config: { fields: [] } };
    case "ai_extract":
      return { type, config: { fields: [] } };
    case "ai_routing_suggestion":
      return { type, config: { options: [], field: "" } };
    default:
      return { type: "notify_all", config: { title: "", message: "" } };
  }
}

function ActionResultBadge({ status }: { status: AutomationTestResult["status"] }) {
  if (status === "success") {
    return (
      <Badge variant="default" className="gap-1 text-[11px]">
        <CheckCircle2 className="h-3 w-3" /> Matched
      </Badge>
    );
  }
  if (status === "skipped") {
    return (
      <Badge variant="secondary" className="gap-1 text-[11px]">
        <MinusCircle className="h-3 w-3" /> Skipped
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1 text-[11px]">
      <XCircle className="h-3 w-3" /> Failed
    </Badge>
  );
}

export function AutomationBuilderSheet({
  rule,
  onClose,
  triggerOptions,
  defaultTrigger,
}: AutomationBuilderSheetProps) {
  const isEdit = !!rule;

  const effectiveTriggerOptions = useMemo(() => {
    const base = triggerOptions ?? TRIGGER_META;
    if (rule && !base.some((t) => t.value === rule.triggerEvent)) {
      const existing = TRIGGER_META.find((t) => t.value === rule.triggerEvent);
      return existing ? [existing, ...base] : base;
    }
    return base;
  }, [triggerOptions, rule]);

  const resolvedDefault: AutomationTrigger =
    rule?.triggerEvent ??
    defaultTrigger ??
    effectiveTriggerOptions[0]?.value ??
    "ticket.created";

  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [triggerEvent, setTriggerEvent] = useState<AutomationTrigger>(resolvedDefault);
  const [conditions, setConditions] = useState<AutomationCondition[]>(rule?.conditions ?? []);
  const [actions, setActions] = useState<ExtendedAutomationAction[]>(rule?.actions ?? []);
  const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true);
  const [testResult, setTestResult] = useState<AutomationTestResult | null>(null);

  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const test = useTestAutomation();
  const isSaving = create.isPending || update.isPending;

  const triggerMeta = useMemo(() => getTriggerMeta(triggerEvent), [triggerEvent]);

  function handleTriggerChange(value: string) {
    setTriggerEvent(value as AutomationTrigger);
    setTestResult(null);
  }

  function handleAddCondition() {
    const firstField = triggerMeta.fields[0]?.value ?? "";
    setConditions((prev) => [...prev, { field: firstField, op: "eq", value: "" }]);
  }

  function handleRemoveCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleConditionField(index: number, field: string) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, field } : c)));
  }

  function handleConditionOp(index: number, op: AutomationConditionOp) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, op } : c)));
  }

  function handleConditionValue(index: number, value: string) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, value } : c)));
  }

  function handleAddAction(type: ExtendedAutomationActionType) {
    setActions((prev) => [...prev, defaultActionConfig(type)]);
  }

  function handleRemoveAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleActionConfig(index: number, patch: Record<string, unknown>) {
    setActions((prev) =>
      prev.map((a, i) =>
        i === index ? ({ ...a, config: { ...a.config, ...patch } } as ExtendedAutomationAction) : a,
      ),
    );
  }

  function buildPayload() {
    const validConditions = conditions.filter((c) => c.field.trim() !== "");
    return {
      name: name.trim(),
      description: description.trim() || undefined,
      triggerEvent,
      conditions: validConditions,
      actions: actions as AutomationAction[],
      isEnabled,
    };
  }

  function validate(): string | null {
    if (!name.trim()) return "Name is required";
    if (actions.length === 0) return "Add at least one action";
    for (const action of actions) {
      if (action.type === "notify_roles") {
        if (action.config.roles.length === 0) return "Notify roles action needs at least one role";
        if (!action.config.title.trim()) return "Notify roles action needs a title";
        if (!action.config.message.trim()) return "Notify roles action needs a message";
      }
      if (action.type === "notify_all") {
        if (!action.config.title.trim()) return "Notify everyone action needs a title";
        if (!action.config.message.trim()) return "Notify everyone action needs a message";
      }
      if (action.type === "email") {
        if (!action.config.to.trim()) return "Email action needs a recipient address";
        if (!action.config.subject.trim()) return "Email action needs a subject";
        if (!action.config.body.trim()) return "Email action needs a body";
      }
      if (action.type === "create_task" && !action.config.title.trim()) {
        return "Create task action needs a title";
      }
      if (action.type === "webhook" && !action.config.event.trim()) {
        return "Webhook action needs an event name";
      }
      if (action.type === "support_assign_ticket" && !action.config.assigneeId.trim()) {
        return "Assign ticket action needs an assignee selected";
      }
      if (action.type === "support_add_tag" && action.config.tagId <= 0) {
        return "Add ticket tag action needs a tag ID";
      }
      if (action.type === "support_internal_note" && !action.config.body.trim()) {
        return "Add internal note action needs a body";
      }
      if (action.type === "ai_classify") {
        if (action.config.labels.length < 2) return "AI Classify needs at least 2 labels";
        if (!action.config.field.trim()) return "AI Classify needs a payload field";
      }
      if (action.type === "ai_summarize" && action.config.fields.length < 1) {
        return "AI Summarize needs at least one field";
      }
      if (action.type === "ai_extract" && action.config.fields.length < 1) {
        return "AI Extract needs at least one field to extract";
      }
      if (action.type === "ai_routing_suggestion") {
        if (action.config.options.length < 1) return "AI Routing Suggestion needs at least one option";
        if (!action.config.field.trim()) return "AI Routing Suggestion needs a payload field";
      }
    }
    return null;
  }

  function handleSave() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    const payload = buildPayload();

    if (isEdit && rule) {
      update.mutate(
        { id: rule.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Automation updated");
            onClose();
          },
          onError: () => toast.error("Failed to update automation"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Automation created");
          onClose();
        },
        onError: () => toast.error("Failed to create automation"),
      });
    }
  }

  function handleTest() {
    if (!isEdit || !rule) {
      toast.info("Save the automation first to run a test");
      return;
    }
    setTestResult(null);
    test.mutate(
      { id: rule.id, payload: triggerMeta.samplePayload },
      {
        onSuccess: (data) => {
          setTestResult(data);
          toast.success("Test run recorded");
        },
        onError: () => toast.error("Test run failed"),
      },
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 gap-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle>{isEdit ? "Edit automation" : "New automation"}</SheetTitle>
          <SheetDescription>
            Configure a trigger, optional conditions, and the actions to run.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="px-6 py-4 space-y-6">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Notify sales on hot lead"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="What does this automation do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Trigger *</Label>
              <Select value={triggerEvent} onValueChange={handleTriggerChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {effectiveTriggerOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} — {t.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conditions (all must pass)</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddCondition}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              {conditions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No conditions — runs on every {triggerMeta.label.toLowerCase()} event.
                </p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Select
                        value={condition.field}
                        onValueChange={(v) => handleConditionField(index, v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerMeta.fields.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={condition.op}
                        onValueChange={(v) => handleConditionOp(index, v as AutomationConditionOp)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {condition.op !== "exists" && (
                        <Input
                          className="flex-1"
                          placeholder="Value"
                          value={
                            condition.value === undefined || condition.value === null
                              ? ""
                              : String(condition.value)
                          }
                          onChange={(e) => handleConditionValue(index, e.target.value)}
                        />
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCondition(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Actions *</Label>
                <Select value="" onValueChange={(v) => handleAddAction(v as ExtendedAutomationActionType)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Add action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {actions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No actions yet. Add at least one.</p>
              ) : (
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div key={index} className="rounded-lg border border-border/60 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[11px]">
                            {ACTION_TYPES.find((a) => a.value === action.type)?.label ?? action.type}
                          </Badge>
                          {action.type.startsWith("ai_") && (
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAction(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {action.type.startsWith("ai_") ? (
                        <AiActionConfigRenderer
                          action={action as AiAutomationAction}
                          onChange={(patch) => handleActionConfig(index, patch)}
                        />
                      ) : (
                        <StandardActionConfigRenderer
                          action={action as AutomationAction}
                          onChange={(patch) => handleActionConfig(index, patch)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {actions.some((a) => a.type.startsWith("ai_")) && (
                <div className="flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 p-2 text-xs text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>AI actions consume credits from your organization&apos;s AI budget.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Disabled automations stay saved but never run.
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            {testResult && (
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Test result</p>
                  <ActionResultBadge status={testResult.status} />
                </div>
                {testResult.matched ? (
                  <div className="space-y-1">
                    {testResult.actionResults.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {r.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
                        )}
                        <span className="min-w-0 break-words text-muted-foreground">
                          {r.type}
                          {r.error ? ` — ${r.error}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Conditions did not match the sample payload — no actions ran.
                  </p>
                )}
              </div>
            )}
          </div>
        </SheetBody>

        <SheetFooter className="shrink-0 border-t border-border px-6 py-4 flex-row gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={!isEdit || test.isPending}
          >
            <Play className="h-4 w-4 mr-1.5" />
            {test.isPending ? "Testing…" : "Test"}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
