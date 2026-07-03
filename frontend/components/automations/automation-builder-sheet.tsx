"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Play, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
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

function defaultActionConfig(type: AutomationActionType): AutomationAction {
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
  const [actions, setActions] = useState<AutomationAction[]>(rule?.actions ?? []);
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

  function handleAddAction(type: AutomationActionType) {
    setActions((prev) => [...prev, defaultActionConfig(type)]);
  }

  function handleRemoveAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleActionConfig(index: number, patch: Record<string, unknown>) {
    setActions((prev) =>
      prev.map((a, i) =>
        i === index ? ({ ...a, config: { ...a.config, ...patch } } as AutomationAction) : a,
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
      actions,
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
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 gap-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{isEdit ? "Edit automation" : "New automation"}</SheetTitle>
          <SheetDescription>
            Configure a trigger, optional conditions, and the actions to run.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
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
                <Select value="" onValueChange={(v) => handleAddAction(v as AutomationActionType)}>
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
                        <Badge variant="secondary" className="text-[11px]">
                          {ACTION_TYPES.find((a) => a.value === action.type)?.label ?? action.type}
                        </Badge>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAction(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {action.type === "notify_roles" && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Roles (comma separated, e.g. CEO, SALES)"
                            value={action.config.roles.join(", ")}
                            onChange={(e) =>
                              handleActionConfig(index, {
                                roles: e.target.value
                                  .split(",")
                                  .map((r) => r.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                          <Input
                            placeholder="Notification title"
                            value={action.config.title}
                            onChange={(e) => handleActionConfig(index, { title: e.target.value })}
                          />
                          <Textarea
                            rows={2}
                            placeholder="Notification message"
                            value={action.config.message}
                            onChange={(e) => handleActionConfig(index, { message: e.target.value })}
                          />
                          <Input
                            placeholder="Link (optional, e.g. /crm/leads)"
                            value={action.config.link ?? ""}
                            onChange={(e) => handleActionConfig(index, { link: e.target.value })}
                          />
                        </div>
                      )}

                      {action.type === "notify_all" && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Notification title"
                            value={action.config.title}
                            onChange={(e) => handleActionConfig(index, { title: e.target.value })}
                          />
                          <Textarea
                            rows={2}
                            placeholder="Notification message"
                            value={action.config.message}
                            onChange={(e) => handleActionConfig(index, { message: e.target.value })}
                          />
                          <Input
                            placeholder="Link (optional)"
                            value={action.config.link ?? ""}
                            onChange={(e) => handleActionConfig(index, { link: e.target.value })}
                          />
                        </div>
                      )}

                      {action.type === "email" && (
                        <div className="space-y-2">
                          <Input
                            type="email"
                            placeholder="Recipient email"
                            value={action.config.to}
                            onChange={(e) => handleActionConfig(index, { to: e.target.value })}
                          />
                          <Input
                            placeholder="Subject"
                            value={action.config.subject}
                            onChange={(e) => handleActionConfig(index, { subject: e.target.value })}
                          />
                          <Textarea
                            rows={3}
                            placeholder="Body (HTML allowed)"
                            value={action.config.body}
                            onChange={(e) => handleActionConfig(index, { body: e.target.value })}
                          />
                        </div>
                      )}

                      {action.type === "create_task" && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Task title"
                            value={action.config.title}
                            onChange={(e) => handleActionConfig(index, { title: e.target.value })}
                          />
                          <Input
                            placeholder="Assignee user ID (optional)"
                            value={action.config.assigneeId ?? ""}
                            onChange={(e) =>
                              handleActionConfig(index, { assigneeId: e.target.value })
                            }
                          />
                          <Input
                            type="number"
                            min={0}
                            placeholder="Due in days (optional)"
                            value={
                              action.config.dueInDays === undefined
                                ? ""
                                : String(action.config.dueInDays)
                            }
                            onChange={(e) =>
                              handleActionConfig(index, {
                                dueInDays:
                                  e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      )}

                      {action.type === "webhook" && (
                        <Input
                          placeholder="Webhook event name (e.g. lead.hot)"
                          value={action.config.event}
                          onChange={(e) => handleActionConfig(index, { event: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
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
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
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
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2 sm:justify-between">
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
