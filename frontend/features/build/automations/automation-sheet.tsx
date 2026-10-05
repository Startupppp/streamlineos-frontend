"use client";

import { useState, useCallback } from "react";
import { type UseFormReturn } from "react-hook-form";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { TRIGGER_EVENTS, ACTION_TYPES, type ProjectAutomation } from "@/hooks/api/build/automations";
import { AutomationValueInput } from "./automation-value-input";
import { RemoveButton } from "./remove-button";
import {
  type FormValues,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  FIELD_CLASS,
} from "./automation-schema";
import { AutomationDryRunPanel } from "./automation-dry-run-panel";
import { AutomationRunHistory } from "./automation-run-history";

type SheetTab = "rules" | "test" | "history";

interface AutomationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAutomation: ProjectAutomation | null;
  form: UseFormReturn<FormValues>;
  conditionFields: Array<{ id: string }>;
  actionFields: Array<{ id: string }>;
  onAppendCondition: () => void;
  onRemoveCondition: (index: number) => void;
  onAppendAction: () => void;
  onRemoveAction: (index: number) => void;
  onSubmit: (values: FormValues) => void;
  onClose: () => void;
  projectId: number;
  createIsPending: boolean;
  updateIsPending: boolean;
}

export function AutomationSheet({
  open,
  onOpenChange,
  editingAutomation,
  form,
  conditionFields,
  actionFields,
  onAppendCondition,
  onRemoveCondition,
  onAppendAction,
  onRemoveAction,
  onSubmit,
  onClose,
  projectId,
  createIsPending,
  updateIsPending,
}: AutomationSheetProps) {
  const [activeTab, setActiveTab] = useState<SheetTab>("rules");
  const handleTabRules = useCallback(() => setActiveTab("rules"), []);
  const handleTabTest = useCallback(() => setActiveTab("test"), []);
  const handleTabHistory = useCallback(() => setActiveTab("history"), []);

  function makeRemoveConditionHandler(idx: number) {
    return () => onRemoveCondition(idx);
  }
  function makeRemoveActionHandler(idx: number) {
    return () => onRemoveAction(idx);
  }
  function makeConditionOperatorHandler(conditionIdx: number) {
    return (v: string) => {
      const found = CONDITION_OPERATORS.find((o) => o === v);
      if (found) form.setValue(`conditions.${conditionIdx}.operator`, found);
    };
  }
  function makeActionTypeHandler(actionIdx: number) {
    return (v: string) => {
      const found = ACTION_TYPES.find((a) => a.value === v);
      if (found) form.setValue(`actions.${actionIdx}.type`, found.value);
    };
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-lg overflow-hidden">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-base">
            {editingAutomation ? "Edit Automation" : "New Automation"}
          </SheetTitle>
          {editingAutomation !== null && (
            <div className="flex gap-1 mt-1.5" role="tablist" aria-label="Automation tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "rules"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === "rules"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={handleTabRules}
              >
                Rules
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "test"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === "test"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={handleTabTest}
              >
                Test
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "history"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === "history"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={handleTabHistory}
              >
                History
              </button>
            </div>
          )}
        </SheetHeader>

        {editingAutomation !== null && activeTab === "test" && (
          <SheetBody className="px-4 py-3">
            <AutomationDryRunPanel
              projectId={projectId}
              automationId={editingAutomation.id}
              triggerEvent={editingAutomation.triggerEvent}
            />
          </SheetBody>
        )}

        {editingAutomation !== null && activeTab === "history" && (
          <SheetBody className="px-4 py-3">
            <AutomationRunHistory
              projectId={projectId}
              automationId={editingAutomation.id}
            />
          </SheetBody>
        )}

        {(editingAutomation === null || activeTab === "rules") && (
        <SheetBody className="px-4 py-3">
          <Form {...form}>
            <form
              id="automation-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel className="text-xs">Automation Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Auto-assign bugs to QA"
                        className={FIELD_CLASS}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="triggerEvent"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel className="text-xs">When this happens (Trigger)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={FIELD_CLASS}>
                          <SelectValue placeholder="Select a trigger..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRIGGER_EVENTS.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-sm">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Conditions (optional)
                  </label>
                  <AnimatedIconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-foreground hover:text-foreground"
                    onClick={onAppendCondition}
                    icon={PlusIcon}
                    iconSize={12}
                  >
                    Add Condition
                  </AnimatedIconButton>
                </div>
                {conditionFields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-1.5 p-2 rounded-lg border border-border bg-muted/40"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      <Select
                        value={form.watch(`conditions.${idx}.field`)}
                        onValueChange={(v) => form.setValue(`conditions.${idx}.field`, v)}
                      >
                        <SelectTrigger className={cn(FIELD_CLASS, "min-w-28 flex-1")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_FIELDS.map((cf) => (
                            <SelectItem key={cf} value={cf} className="text-sm capitalize">
                              {cf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={form.watch(`conditions.${idx}.operator`)}
                        onValueChange={makeConditionOperatorHandler(idx)}
                      >
                        <SelectTrigger className={cn(FIELD_CLASS, "min-w-36 flex-1")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPERATORS.map((o) => (
                            <SelectItem key={o} value={o} className="text-sm">
                              {o.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!["is_empty", "is_not_empty"].includes(
                        form.watch(`conditions.${idx}.operator`),
                      ) && (
                        <div className="min-w-48 flex-[2_1_12rem]">
                          <AutomationValueInput
                            kind="condition"
                            discriminant={form.watch(`conditions.${idx}.field`)}
                            value={form.watch(`conditions.${idx}.value`) ?? ""}
                            onChange={(v) => form.setValue(`conditions.${idx}.value`, v)}
                            projectId={projectId}
                            className={cn(FIELD_CLASS, "w-full")}
                          />
                        </div>
                      )}
                    </div>
                    <RemoveButton onClick={makeRemoveConditionHandler(idx)} />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Actions <span className="text-status-danger-ink-strong">*</span>
                  </label>
                  <AnimatedIconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-foreground hover:text-foreground"
                    onClick={onAppendAction}
                    icon={PlusIcon}
                    iconSize={12}
                  >
                    Add Action
                  </AnimatedIconButton>
                </div>
                {actionFields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-1.5 p-2 rounded-lg border border-border bg-muted/40"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      <Select
                        value={form.watch(`actions.${idx}.type`)}
                        onValueChange={makeActionTypeHandler(idx)}
                      >
                        <SelectTrigger className={cn(FIELD_CLASS, "min-w-36 flex-1")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((a) => (
                            <SelectItem key={a.value} value={a.value} className="text-sm">
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="min-w-64 flex-[2_1_16rem]">
                        <AutomationValueInput
                          kind="action"
                          discriminant={form.watch(`actions.${idx}.type`)}
                          value={form.watch(`actions.${idx}.value`)}
                          onChange={(v) => form.setValue(`actions.${idx}.value`, v)}
                          projectId={projectId}
                          className={FIELD_CLASS}
                        />
                      </div>
                    </div>
                    <RemoveButton onClick={makeRemoveActionHandler(idx)} />
                  </div>
                ))}
                {form.formState.errors.actions?.root && (
                  <p className="text-xs text-status-danger-ink-strong">
                    {form.formState.errors.actions.root.message}
                  </p>
                )}
              </div>
            </form>
          </Form>
        </SheetBody>
        )}

        {(editingAutomation === null || activeTab === "rules") && (
        <SheetFooter className="px-4 py-3 border-t shrink-0 flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(FIELD_CLASS, "flex-1")}
          >
            Cancel
          </Button>
          <LoadingButton
            form="automation-form"
            type="submit"
            isPending={createIsPending || updateIsPending}
            loadingText="Saving…"
            className={cn(FIELD_CLASS, "flex-1")}
          >
            {editingAutomation ? "Save Changes" : "Create Automation"}
          </LoadingButton>
        </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
