"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrAutomationEvents, useCreateHrAutomation, useUpdateHrAutomation } from "@/hooks/api/hr/hr-automations";
import type { HrAutomationRule, HrAutomationAction, HrAutomationActionType } from "@/types/hr/automations";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

const CONDITION_OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "in", label: "Is one of" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "Contains" },
] as const;

const ACTION_TYPES: { value: HrAutomationActionType; label: string }[] = [
  { value: "create_task", label: "Create Task" },
  { value: "start_workflow", label: "Start Workflow" },
  { value: "send_notification", label: "Send Notification" },
  { value: "send_email", label: "Send Email" },
  { value: "assign_document", label: "Assign Document" },
  { value: "generate_letter", label: "Generate Letter" },
  { value: "assign_course", label: "Assign Course" },
  { value: "assign_asset", label: "Assign Asset" },
  { value: "create_hr_case", label: "Create HR Case" },
  { value: "update_field", label: "Update Field" },
  { value: "call_webhook", label: "Call Webhook" },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  description: z.string().trim().max(2000).optional(),
  triggerEvent: z.string().min(1, "Trigger is required"),
  isEnabled: z.boolean(),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(["eq", "neq", "in", "gte", "lte", "contains"]),
    value: z.string(),
  })),
  actions: z.array(z.object({
    type: z.string().min(1, "Action type is required"),
    configRaw: z.string(),
  })),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  rule?: HrAutomationRule;
  onClose: () => void;
}

function buildAction(type: string, configRaw: string): HrAutomationAction {
  let parsed: Record<string, unknown> = {};
  try {
    const result = JSON.parse(configRaw);
    if (result !== null && typeof result === "object" && !Array.isArray(result)) {
      parsed = result as Record<string, unknown>;
    }
  } catch {
    parsed = {};
  }
  switch (type as HrAutomationActionType) {
    case "create_task":
      return { type: "create_task", config: { title: String(parsed.title ?? ""), assigneeId: parsed.assigneeId !== undefined ? String(parsed.assigneeId) : undefined, dueInDays: typeof parsed.dueInDays === "number" ? parsed.dueInDays : undefined } };
    case "start_workflow":
      return { type: "start_workflow", config: { workflowId: String(parsed.workflowId ?? "") } };
    case "send_notification":
      return { type: "send_notification", config: { title: String(parsed.title ?? ""), message: String(parsed.message ?? ""), link: parsed.link !== undefined ? String(parsed.link) : undefined, roles: Array.isArray(parsed.roles) ? (parsed.roles as unknown[]).map(String) : undefined } };
    case "send_email":
      return { type: "send_email", config: { to: String(parsed.to ?? ""), subject: String(parsed.subject ?? ""), body: String(parsed.body ?? "") } };
    case "assign_document":
      return { type: "assign_document", config: { documentTypeId: Number(parsed.documentTypeId ?? 0) } };
    case "generate_letter":
      return { type: "generate_letter", config: { templateId: Number(parsed.templateId ?? 0) } };
    case "assign_course":
      return { type: "assign_course", config: { courseId: Number(parsed.courseId ?? 0) } };
    case "assign_asset":
      return { type: "assign_asset", config: { assetTypeId: Number(parsed.assetTypeId ?? 0) } };
    case "create_hr_case":
      return { type: "create_hr_case", config: { subject: String(parsed.subject ?? ""), categoryId: typeof parsed.categoryId === "number" ? parsed.categoryId : undefined } };
    case "update_field":
      return { type: "update_field", config: { field: String(parsed.field ?? ""), value: (parsed.value as string | number | boolean) ?? "" } };
    case "call_webhook":
      return { type: "call_webhook", config: { url: String(parsed.url ?? ""), method: parsed.method === "PUT" ? "PUT" : "POST" } };
    default:
      return { type: "create_task", config: { title: "" } };
  }
}

function ActionConfigFields({ index: _index, actionType }: { index: number; actionType: string }) {
  const placeholder: Record<string, string> = {
    create_task: '{"title":"Task title","dueInDays":3}',
    start_workflow: '{"workflowId":"wf_abc"}',
    send_notification: '{"title":"Title","message":"Message"}',
    send_email: '{"to":"email@example.com","subject":"Subject","body":"<p>Body</p>"}',
    assign_document: '{"documentTypeId":1}',
    generate_letter: '{"templateId":1}',
    assign_course: '{"courseId":1}',
    assign_asset: '{"assetTypeId":1}',
    create_hr_case: '{"subject":"HR Case subject"}',
    update_field: '{"field":"fieldName","value":"newValue"}',
    call_webhook: '{"url":"https://hooks.example.com/event","method":"POST"}',
  };

  return (
    <div className="text-xs text-muted-foreground mt-1">
      Config JSON placeholder: <code>{placeholder[actionType] ?? "{}"}</code>
    </div>
  );
}

export function AutomationUpsertSheet({ rule, onClose }: Props) {
  const { data: eventsData, isLoading: eventsLoading } = useHrAutomationEvents();
  const create = useCreateHrAutomation();
  const update = useUpdateHrAutomation();
  const isEditing = !!rule;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: rule?.name ?? "",
      description: rule?.description ?? "",
      triggerEvent: rule?.triggerEvent ?? "",
      isEnabled: rule?.isEnabled ?? true,
      conditions: rule?.conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: Array.isArray(c.value) ? c.value.join(",") : String(c.value),
      })) ?? [],
      actions: rule?.actions.map((a) => ({
        type: a.type,
        configRaw: JSON.stringify(a.config),
      })) ?? [],
    },
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({ control: form.control, name: "conditions" });
  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({ control: form.control, name: "actions" });

  const selectedEvent = form.watch("triggerEvent");
  const eventDef = eventsData?.events.find((e) => e.value === selectedEvent);

  function handleAddCondition() {
    appendCondition({ field: "", operator: "eq", value: "" });
  }

  function handleAddAction() {
    appendAction({ type: "create_task", configRaw: '{"title":""}' });
  }

  async function onSubmit(values: FormValues) {
    const conditions = values.conditions.map((c) => ({
      field: c.field,
      operator: c.operator as "eq" | "neq" | "in" | "gte" | "lte" | "contains",
      value: c.operator === "in" ? c.value.split(",").map((v) => v.trim()) : c.value,
    }));

    const actions = values.actions.map((a) => buildAction(a.type, a.configRaw));

    const payload = {
      name: values.name,
      description: values.description || undefined,
      triggerEvent: values.triggerEvent as Parameters<typeof create.mutate>[0]["triggerEvent"],
      conditions,
      actions,
      isEnabled: values.isEnabled,
    };

    if (isEditing) {
      update.mutate(
        { automationId: rule.id, ...payload },
        {
          onSuccess: () => { toast.success("Automation rule updated"); onClose(); },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Automation rule created"); onClose(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{isEditing ? "Edit Automation" : "New Automation Rule"}</SheetTitle>
          <SheetDescription>Configure when this automation fires and what actions it runs.</SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-6 px-6 py-4">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">General</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="rule-name">Name</Label>
                  <Input id="rule-name" {...form.register("name")} placeholder="e.g. Onboard new employee" className="mt-1" />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="rule-desc">Description</Label>
                  <Textarea id="rule-desc" {...form.register("description")} rows={2} placeholder="Optional description" className="mt-1 resize-none" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enabled</Label>
                  <Controller
                    control={form.control}
                    name="isEnabled"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trigger</h3>
              <Controller
                control={form.control}
                name="triggerEvent"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={eventsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger event" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventsData?.events.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.triggerEvent && (
                <p className="text-xs text-destructive">{form.formState.errors.triggerEvent.message}</p>
              )}
              {eventDef && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {eventDef.fields.map((f) => (
                    <Badge key={f.field} variant="secondary" className="text-micro">{f.field}: {f.type}</Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Conditions</h3>
                <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" type="button" variant="ghost" size="sm" onClick={handleAddCondition}>
                  Add Condition
                </AnimatedIconButton>
              </div>
              {conditionFields.length === 0 && (
                <p className="text-xs text-muted-foreground">No conditions — rule fires on every trigger.</p>
              )}
              {conditionFields.map((f, idx) => (
                <div key={f.id} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-start">
                  <Input
                    {...form.register(`conditions.${idx}.field`)}
                    placeholder={eventDef?.fields[0]?.field ?? "field"}
                  />
                  <Controller
                    control={form.control}
                    name={`conditions.${idx}.operator`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input
                    {...form.register(`conditions.${idx}.value`)}
                    placeholder="value"
                  />
                  <AnimatedIconButton icon={XIcon} iconSize={14} type="button" variant="ghost" size="icon" className="w-8" onClick={() => removeCondition(idx)} aria-label="Remove condition" />
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions</h3>
                <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" type="button" variant="ghost" size="sm" onClick={handleAddAction}>
                  Add Action
                </AnimatedIconButton>
              </div>
              {form.formState.errors.actions?.root && (
                <p className="text-xs text-destructive">{form.formState.errors.actions.root.message}</p>
              )}
              {actionFields.map((f, idx) => {
                const currentType = form.watch(`actions.${idx}.type`);
                return (
                  <div key={f.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                      <Controller
                        control={form.control}
                        name={`actions.${idx}.type`}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Action type" />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map((a) => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <AnimatedIconButton icon={XIcon} iconSize={14} type="button" variant="ghost" size="icon" className="w-7 shrink-0" onClick={() => removeAction(idx)} aria-label="Remove action" />
                    </div>
                    <div>
                      <Textarea
                        {...form.register(`actions.${idx}.configRaw`)}
                        rows={2}
                        placeholder="Config JSON"
                        className="font-mono resize-none"
                      />
                      <ActionConfigFields index={idx} actionType={currentType} />
                    </div>
                  </div>
                );
              })}
              {actionFields.length === 0 && (
                <p className="text-xs text-destructive">At least one action is required.</p>
              )}
            </div>
          </SheetBody>

          <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <LoadingButton type="submit" isPending={isPending} loadingText={isEditing ? "Saving…" : "Creating…"}>
              {isEditing ? "Save Changes" : "Create Rule"}
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
