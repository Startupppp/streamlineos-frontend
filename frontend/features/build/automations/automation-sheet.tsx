"use client";

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
        </SheetHeader>

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
                    className="flex items-center gap-1.5 p-2 rounded-lg border border-border bg-muted/40"
                  >
                    <Select
                      value={form.watch(`conditions.${idx}.field`)}
                      onValueChange={(v) => form.setValue(`conditions.${idx}.field`, v)}
                    >
                      <SelectTrigger className={cn(FIELD_CLASS, "flex-1")}>
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
                      <SelectTrigger className={cn(FIELD_CLASS, "w-28")}>
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
                      <AutomationValueInput
                        kind="condition"
                        discriminant={form.watch(`conditions.${idx}.field`)}
                        value={form.watch(`conditions.${idx}.value`) ?? ""}
                        onChange={(v) => form.setValue(`conditions.${idx}.value`, v)}
                        projectId={projectId}
                        className={cn(FIELD_CLASS, "w-28")}
                      />
                    )}
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
                    className="flex items-center gap-1.5 p-2 rounded-lg border border-border bg-muted/40"
                  >
                    <Select
                      value={form.watch(`actions.${idx}.type`)}
                      onValueChange={makeActionTypeHandler(idx)}
                    >
                      <SelectTrigger className={cn(FIELD_CLASS, "flex-1")}>
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
                    <div className="flex-1 min-w-0">
                      <AutomationValueInput
                        kind="action"
                        discriminant={form.watch(`actions.${idx}.type`)}
                        value={form.watch(`actions.${idx}.value`)}
                        onChange={(v) => form.setValue(`actions.${idx}.value`, v)}
                        projectId={projectId}
                        className={FIELD_CLASS}
                      />
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
      </SheetContent>
    </Sheet>
  );
}
