"use client";

import { use, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Zap, X, Plus } from "lucide-react";
import { PlusIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { StatCardGrid, StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { AutomationValueInput } from "@/features/projects/automations/automation-value-input";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  TRIGGER_EVENTS,
  ACTION_TYPES,
  type ProjectAutomation,
} from "@/hooks/api/projects/automations";

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
  value: z.string().optional(),
});

const actionSchema = z.object({
  type: z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment"]),
  value: z.string().min(1),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  triggerEvent: z.string().min(1, "Select a trigger"),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema).min(1, "At least one action required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const CONDITION_FIELDS = ["status", "priority", "assignee", "label", "type"];
const CONDITION_OPERATORS = ["equals", "not_equals", "contains", "is_empty", "is_not_empty"] as const;
const FIELD_CLASS = "h-8 text-sm";

function getTriggerLabel(event: string) {
  return TRIGGER_EVENTS.find((t) => t.value === event)?.label ?? event;
}

function getActionLabel(type: string) {
  return ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
}

interface AutomationCardProps {
  automation: ProjectAutomation;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (automation: ProjectAutomation) => void;
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function AutomationCard({ automation, onToggle, onDelete, onEdit }: AutomationCardProps) {
  const { iconRef: editIconRef, hoverHandlers: editHoverHandlers } = useAnimatedIcon();
  const handleSwitchChange = useCallback(
    (v: boolean) => onToggle(automation.id, v),
    [automation.id, onToggle],
  );
  const handleEdit = useCallback(() => onEdit(automation), [automation, onEdit]);
  const handleDeleteAutomation = useCallback(() => onDelete(automation.id), [automation.id, onDelete]);

  return (
    <motion.div
      layout
      className={cn(
        PM_PANEL,
        "p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            automation.isActive
              ? "bg-primary/10 border border-primary/20"
              : "bg-muted border border-border",
          )}
        >
          <Zap
            className={cn("h-4 w-4", automation.isActive ? "text-primary" : "text-muted-foreground")}
          />
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
              automation.isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm font-semibold text-foreground", TEXT_ONE_LINE)}>
              {automation.name}
            </p>
            <Badge
              variant="secondary"
              className="text-[10px] bg-muted text-muted-foreground border-border shrink-0"
            >
              {getTriggerLabel(automation.triggerEvent)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {automation.conditions.length > 0 && (
              <span>
                {automation.conditions.length} condition
                {automation.conditions.length > 1 ? "s" : ""}
              </span>
            )}
            <span>
              {automation.actions.length} action{automation.actions.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {automation.actions.map((a, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                {getActionLabel(a.type)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={automation.isActive}
            onCheckedChange={handleSwitchChange}
            aria-label={automation.isActive ? "Deactivate" : "Activate"}
          />
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={handleEdit}
            {...editHoverHandlers}
          >
            <ChevronRightIcon ref={editIconRef} size={14} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete automation?</AlertDialogTitle>
                <AlertDialogDescription>This rule will stop running immediately.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAutomation}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}

function NewAutomationButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      New Automation
    </Button>
  );
}

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function AutomationsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<ProjectAutomation | null>(null);

  const { data: automations = [], isLoading, isError, refetch } = useAutomations(projectId);
  const createAutomation = useCreateAutomation(projectId);
  const updateAutomation = useUpdateAutomation(projectId);
  const deleteAutomation = useDeleteAutomation(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      triggerEvent: "",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
      isActive: true,
    },
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({
    control: form.control,
    name: "conditions",
  });
  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({
    control: form.control,
    name: "actions",
  });

  const handleEdit = useCallback(
    (automation: ProjectAutomation) => {
      setEditingAutomation(automation);
      form.reset({
        name: automation.name,
        triggerEvent: automation.triggerEvent,
        conditions: automation.conditions,
        actions: automation.actions,
        isActive: automation.isActive,
      });
      setSheetOpen(true);
    },
    [form],
  );

  const handleOpenNew = useCallback(() => {
    setEditingAutomation(null);
    form.reset({
      name: "",
      triggerEvent: "",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
      isActive: true,
    });
    setSheetOpen(true);
  }, [form]);

  const handleToggle = useCallback(
    (id: number, isActive: boolean) => {
      updateAutomation.mutate(
        { id, isActive },
        {
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateAutomation],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteAutomation.mutate(id, {
        onSuccess: () => toast.success("Automation deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteAutomation],
  );

  const handleSubmit = useCallback(
    (values: FormValues) => {
      if (editingAutomation) {
        updateAutomation.mutate(
          { id: editingAutomation.id, ...values },
          {
            onSuccess: () => {
              setSheetOpen(false);
              toast.success("Automation updated");
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createAutomation.mutate(values, {
          onSuccess: () => {
            setSheetOpen(false);
            toast.success("Automation created");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [editingAutomation, createAutomation, updateAutomation],
  );

  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function makeRemoveConditionHandler(idx: number) {
    return () => removeCondition(idx);
  }
  function makeRemoveActionHandler(idx: number) {
    return () => removeAction(idx);
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

  const handleAppendCondition = useCallback(() => {
    appendCondition({ field: "status", operator: "equals", value: "" });
  }, [appendCondition]);

  const handleAppendAction = useCallback(() => {
    appendAction({ type: "set_status", value: "" });
  }, [appendAction]);

  return (
    <PageWrapper
      title="Automations"
      subtitle="Automate repetitive actions with if-then rules"
      actions={<NewAutomationButton onClick={handleOpenNew} />}
    >
      <PmPageShell>
        {isLoading ? (
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </PmSection>
        ) : isError ? (
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <ErrorState
              title="Could not load automations"
              description="Failed to load automations."
              onRetry={handleRetry}
              className="flex-1"
            />
          </PmSection>
        ) : automations.length === 0 ? (
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <EmptyState
                className={PM_FILL_PANEL}
                illustration={<AutomationsIllustration className="h-32 w-32" />}
                title="No automations yet"
                description="Automate repetitive work — assign tickets, change statuses, and more with if-then rules."
                action={{ label: "Create Automation", onClick: handleOpenNew }}
              />
          </PmSection>
        ) : (
          <>
            <PmSection index={0} className="shrink-0">
              <StatCardGrid cols={2} className="mb-1">
                <StatCard
                  label="Active"
                  value={automations.filter((a) => a.isActive).length}
                  icon={Zap}
                  tone="emerald"
                />
                <StatCard
                  label="Inactive"
                  value={automations.filter((a) => !a.isActive).length}
                  icon={Zap}
                  tone="default"
                />
              </StatCardGrid>
            </PmSection>

            <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
              <PmStaggerList className="space-y-2.5" role="list" aria-label="Automations">
                <AnimatePresence initial={false}>
                  {automations.map((auto) => (
                    <AutomationCard
                      key={auto.id}
                      automation={auto}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </AnimatePresence>
              </PmStaggerList>
            </PmSection>
          </>
        )}
      </PmPageShell>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
                onSubmit={form.handleSubmit(handleSubmit)}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 text-foreground hover:text-foreground"
                      onClick={handleAppendCondition}
                    >
                      <Plus className="h-3 w-3" />
                      Add Condition
                    </Button>
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
                      Actions <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 text-foreground hover:text-foreground"
                      onClick={handleAppendAction}
                    >
                      <Plus className="h-3 w-3" />
                      Add Action
                    </Button>
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
                    <p className="text-xs text-red-500 dark:text-red-400">
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
              onClick={handleCloseSheet}
              className={cn(FIELD_CLASS, "flex-1")}
            >
              Cancel
            </Button>
            <LoadingButton
              form="automation-form"
              type="submit"
              isPending={createAutomation.isPending || updateAutomation.isPending}
              loadingText="Saving…"
              className={cn(FIELD_CLASS, "flex-1")}
            >
              {editingAutomation ? "Save Changes" : "Create Automation"}
            </LoadingButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
