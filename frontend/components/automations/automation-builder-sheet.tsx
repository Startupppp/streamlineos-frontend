"use client";

import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useCreateAutomation,
  useTestAutomation,
  useUpdateAutomation,
  type AutomationAction,
  type AutomationCondition,
  type AutomationConditionOp,
  type AutomationRule,
  type AutomationTestResult,
  type AutomationTrigger,
} from "@/hooks/api/automations";
import type {
  ExtendedAutomationAction,
  ExtendedAutomationActionType,
} from "@/hooks/api/automation-ai-nodes";
import { TRIGGER_META, getTriggerMeta, type TriggerMeta } from "./automation-trigger-data";
import { AutomationBuilderEditor } from "./automation-builder-editor";
import { AutomationTestResultPanel } from "./automation-test-result";

interface AutomationBuilderSheetProps {
  rule?: AutomationRule;
  onClose: () => void;
  triggerOptions?: TriggerMeta[];
  defaultTrigger?: AutomationTrigger;
}

function defaultActionConfig(
  type: ExtendedAutomationActionType,
): ExtendedAutomationAction {
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
  }
}

export function AutomationBuilderSheet({
  rule,
  onClose,
  triggerOptions,
  defaultTrigger,
}: AutomationBuilderSheetProps) {
  const isEdit = Boolean(rule);
  const effectiveTriggerOptions = useMemo(() => {
    const base = triggerOptions ?? TRIGGER_META;
    const existing =
      rule && !base.some((trigger) => trigger.value === rule.triggerEvent)
        ? TRIGGER_META.find((trigger) => trigger.value === rule.triggerEvent)
        : undefined;
    return existing ? [existing, ...base] : base;
  }, [rule, triggerOptions]);
  const resolvedDefault =
    rule?.triggerEvent ??
    defaultTrigger ??
    effectiveTriggerOptions[0]?.value ??
    "ticket.created";
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [triggerEvent, setTriggerEvent] =
    useState<AutomationTrigger>(resolvedDefault);
  const [conditions, setConditions] = useState<AutomationCondition[]>(
    rule?.conditions ?? [],
  );
  const [actions, setActions] = useState<ExtendedAutomationAction[]>(
    rule?.actions ?? [],
  );
  const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true);
  const [testResult, setTestResult] = useState<AutomationTestResult | null>(
    null,
  );
  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const test = useTestAutomation();
  const triggerMeta = useMemo(
    () => getTriggerMeta(triggerEvent),
    [triggerEvent],
  );
  const isSaving = create.isPending || update.isPending;

  function handleActionConfig(index: number, patch: Record<string, unknown>) {
    setActions((current) =>
      current.map((action, currentIndex) =>
        currentIndex === index
          ? ({
              ...action,
              config: { ...action.config, ...patch },
            } as ExtendedAutomationAction)
          : action,
      ),
    );
  }
  function handleAddAction(type: ExtendedAutomationActionType) {
    setActions((current) => [...current, defaultActionConfig(type)]);
  }
  function handleAddCondition() {
    setConditions((current) => [
      ...current,
      { field: triggerMeta.fields[0]?.value ?? "", op: "eq", value: "" },
    ]);
  }
  function handleConditionField(index: number, field: string) {
    setConditions((current) =>
      current.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, field } : condition,
      ),
    );
  }
  function handleConditionOp(index: number, op: AutomationConditionOp) {
    setConditions((current) =>
      current.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, op } : condition,
      ),
    );
  }
  function handleConditionValue(index: number, value: string) {
    setConditions((current) =>
      current.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, value } : condition,
      ),
    );
  }
  function handleRemoveAction(index: number) {
    setActions((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  }
  function handleRemoveCondition(index: number) {
    setConditions((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  }
  function handleTriggerChange(value: string) {
    setTriggerEvent(value as AutomationTrigger);
    setTestResult(null);
  }
  function buildPayload() {
    return {
      name: name.trim(),
      description: description.trim() || undefined,
      triggerEvent,
      conditions: conditions.filter((condition) => condition.field.trim()),
      actions: actions as AutomationAction[],
      isEnabled,
    };
  }
  function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (actions.length === 0) {
      toast.error("Add at least one action");
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
      return;
    }
    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Automation created");
        onClose();
      },
      onError: () => toast.error("Failed to create automation"),
    });
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
        onSuccess: (result) => {
          setTestResult(result);
          toast.success("Test run recorded");
        },
        onError: () => toast.error("Test run failed"),
      },
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden p-0 gap-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle>
            {isEdit ? "Edit automation" : "New automation"}
          </SheetTitle>
          <SheetDescription>
            Configure a trigger, optional conditions, and the actions to run.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <AutomationBuilderEditor
            actions={actions}
            conditions={conditions}
            description={description}
            effectiveTriggerOptions={effectiveTriggerOptions}
            isEnabled={isEnabled}
            name={name}
            triggerEvent={triggerEvent}
            triggerMeta={triggerMeta}
            onActionConfig={handleActionConfig}
            onAddAction={handleAddAction}
            onAddCondition={handleAddCondition}
            onConditionField={handleConditionField}
            onConditionOp={handleConditionOp}
            onConditionValue={handleConditionValue}
            onDescriptionChange={(event) => setDescription(event.target.value)}
            onEnabledChange={setIsEnabled}
            onNameChange={(event) => setName(event.target.value)}
            onRemoveAction={handleRemoveAction}
            onRemoveCondition={handleRemoveCondition}
            onTriggerChange={handleTriggerChange}
          />
          {testResult ? (
            <AutomationTestResultPanel result={testResult} />
          ) : null}
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
            <LoadingButton
              type="button"
              onClick={handleSave}
              isPending={isSaving}
              loadingText="Saving…"
            >
              {isEdit ? "Save changes" : "Create"}
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
