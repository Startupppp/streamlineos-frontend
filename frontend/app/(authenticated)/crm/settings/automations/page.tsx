"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Zap, Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonTable } from "@/components/shared";
import { ErrorState } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { toast } from "sonner";
import {
  type AutomationForm,
  type AutomationAction,
  automationSchema,
  TRIGGERS,
  ALL_ACTIONS,
  useAutomationRules,
  useCreateAutomationRule,
  useToggleAutomationRule,
  useDeleteAutomationRule,
  AutomationCard,
  ConditionRow,
  ActionCheckboxItem,
} from "@/features/crm/settings/automations/automation-card";

export default function AutomationsPage() {
  const { data, isLoading, isError, refetch } = useAutomationRules();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const createRule = useCreateAutomationRule();
  const toggleRule = useToggleAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const form = useForm<AutomationForm>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      name: "",
      trigger: "lead.created",
      conditions: [{ field: "", operator: "equals", value: "" }],
      actions: [],
      isActive: true,
    },
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const watchedActions = form.watch("actions");

  const onSubmit = useCallback(
    (values: AutomationForm) => {
      createRule.mutate(values, {
        onSuccess: () => {
          toast.success("Automation created");
          setSheetOpen(false);
          form.reset();
        },
        onError: (err) => toast.error(err.message),
      });
    },
    [createRule, form],
  );

  const handleToggle = useCallback(
    (id: number, isActive: boolean) => {
      toggleRule.mutate(
        { id, isActive: !isActive },
        {
          onSuccess: () => toast.success(isActive ? "Automation disabled" : "Automation enabled"),
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [toggleRule],
  );

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteRule.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Automation deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  }, [deleteRule, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);
  const handleAddCondition = useCallback(() => appendCondition({ field: "", operator: "equals", value: "" }), [appendCondition]);
  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((open: boolean) => setSheetOpen(open), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleActionToggle = useCallback(
    (action: AutomationAction, checked: boolean) => {
      const current = form.getValues("actions");
      form.setValue(
        "actions",
        checked ? [...current, action] : current.filter((a) => a !== action),
        { shouldValidate: true },
      );
    },
    [form],
  );

  const rules = data?.rules ?? [];
  const listVariants = shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : staggerContainer;
  const itemVariants = shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } } : fadeUp;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              This automation will be permanently deleted and will no longer run on future triggers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteRule.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="p-0 flex flex-col overflow-hidden sm:max-w-lg">
          <SheetHeader className="shrink-0 px-6 py-4 border-b">
            <SheetTitle>Create Automation</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Automation Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Notify team on new lead" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trigger"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a trigger" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRIGGERS.map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Conditions</Label>
                  <div className="space-y-2">
                    {conditionFields.map((cField, i) => (
                      <ConditionRow
                        key={cField.id}
                        cField={cField}
                        index={i}
                        control={form.control}
                        showRemove={conditionFields.length > 1}
                        onRemove={removeCondition}
                      />
                    ))}
                  </div>
                  {form.formState.errors.conditions?.root && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.conditions.root.message}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={handleAddCondition}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Condition
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Actions</Label>
                  <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-border p-3 bg-muted/30">
                    {ALL_ACTIONS.map((action) => (
                      <ActionCheckboxItem
                        key={action}
                        action={action}
                        checked={watchedActions.includes(action)}
                        onToggle={handleActionToggle}
                      />
                    ))}
                  </div>
                  {form.formState.errors.actions && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.actions.message}
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-0.5">
                          <FormLabel className="!mt-0 cursor-pointer">Active immediately</FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Enable this automation as soon as it is created.
                          </p>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div className="shrink-0 px-6 py-4 border-t">
                <Button
                  type="submit"
                  disabled={createRule.isPending}
                  className="w-full"
                >
                  {createRule.isPending ? "Creating..." : "Create Automation"}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <PageWrapper
        title="Automations"
        subtitle={isLoading ? "Loading..." : `${rules.length} rule${rules.length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={handleOpenSheet}>
            <Plus className="h-4 w-4 mr-2" />
            Create Automation
          </Button>
        }
      >
        {isError ? (
          <ErrorState title="Failed to load automations" onRetry={handleRetry} />
        ) : (
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
              >
                <SkeletonTable rows={4} columns={3} />
              </motion.div>
            ) : rules.length === 0 ? (
              <motion.div
                key="empty"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
              >
                <EmptyState
                  className="flex-1 min-h-[50vh] border-0 bg-transparent"
                  illustration={<Zap className="h-10 w-10 text-muted-foreground" />}
                  title="No automations yet"
                  description="Create your first automation to start saving time on repetitive CRM tasks."
                  action={{ label: "Create Automation", onClick: handleOpenSheet }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                className="space-y-3"
                variants={listVariants}
                initial="hidden"
                animate="visible"
              >
                {rules.map((rule) => (
                  <AutomationCard
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggle}
                    onDeleteRequest={handleDeleteRequest}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </PageWrapper>
    </>
  );
}
