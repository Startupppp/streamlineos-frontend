"use client";
import { use, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Zap, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  TRIGGER_EVENTS,
  ACTION_TYPES,
  type ProjectAutomation,
  type AutomationCondition,
  type AutomationAction,
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

function getTriggerLabel(event: string) {
  return TRIGGER_EVENTS.find(t => t.value === event)?.label ?? event;
}

function getActionLabel(type: string) {
  return ACTION_TYPES.find(a => a.value === type)?.label ?? type;
}

interface AutomationCardProps {
  automation: ProjectAutomation;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (automation: ProjectAutomation) => void;
}

function AutomationCard({ automation, onToggle, onDelete, onEdit }: AutomationCardProps) {
  const handleSwitchChange = useCallback(
    (v: boolean) => onToggle(automation.id, v),
    [automation.id, onToggle],
  );
  const handleEdit = useCallback(() => onEdit(automation), [automation, onEdit]);

  return (
    <motion.div layout className="rounded-lg border border-border bg-card hover:shadow-md transition-shadow p-4">
      <div className="flex items-start gap-3">
        <div className={cn("relative h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          automation.isActive ? "bg-blue-50 border border-blue-100" : "bg-muted border border-border")}>
          <Zap className={cn("h-4 w-4", automation.isActive ? "text-blue-600" : "text-muted-foreground")} />
          <span className={cn("absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
            automation.isActive ? "bg-emerald-500" : "bg-slate-300")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 truncate">{automation.name}</p>
            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 shrink-0">
              {getTriggerLabel(automation.triggerEvent)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {automation.conditions.length > 0 && (
              <span>{automation.conditions.length} condition{automation.conditions.length > 1 ? "s" : ""}</span>
            )}
            <span>{automation.actions.length} action{automation.actions.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {automation.actions.map((a, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{getActionLabel(a.type)}</Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={automation.isActive}
            onCheckedChange={handleSwitchChange}
            aria-label={automation.isActive ? "Deactivate" : "Activate"}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50">
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
                <AlertDialogAction onClick={() => onDelete(automation.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
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

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: "conditions",
  });
  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control: form.control,
    name: "actions",
  });

  const handleEdit = useCallback((automation: ProjectAutomation) => {
    setEditingAutomation(automation);
    form.reset({
      name: automation.name,
      triggerEvent: automation.triggerEvent,
      conditions: automation.conditions,
      actions: automation.actions,
      isActive: automation.isActive,
    });
    setSheetOpen(true);
  }, [form]);

  const handleOpenNew = useCallback(() => {
    setEditingAutomation(null);
    form.reset({ name: "", triggerEvent: "", conditions: [], actions: [{ type: "set_status", value: "" }], isActive: true });
    setSheetOpen(true);
  }, [form]);

  const handleToggle = useCallback((id: number, isActive: boolean) => {
    updateAutomation.mutate({ id, isActive }, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateAutomation]);

  const handleDelete = useCallback((id: number) => {
    deleteAutomation.mutate(id, {
      onSuccess: () => toast.success("Automation deleted"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteAutomation]);

  const handleSubmit = useCallback((values: FormValues) => {
    if (editingAutomation) {
      updateAutomation.mutate({ id: editingAutomation.id, ...values }, {
        onSuccess: () => { setSheetOpen(false); toast.success("Automation updated"); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    } else {
      createAutomation.mutate(values, {
        onSuccess: () => { setSheetOpen(false); toast.success("Automation created"); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [editingAutomation, createAutomation, updateAutomation]);

  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

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
      actions={
        <Button size="sm" onClick={handleOpenNew}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Automation
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-3 pb-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">Failed to load automations.</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>Retry</Button>
          </div>
        ) : (
          <>
            {automations.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{automations.filter(a => a.isActive).length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-500">{automations.filter(a => !a.isActive).length}</p>
                  <p className="text-xs text-muted-foreground">Inactive</p>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {automations.map((auto, idx) => (
                <motion.div
                  key={auto.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <AutomationCard
                    automation={auto}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {automations.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-14 w-14 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <Zap className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No automations yet</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Automate repetitive work — assign tickets, change statuses, and more with if-then rules.
                </p>
                <Button onClick={handleOpenNew} className="mt-2 gap-2">
                  <Plus className="h-4 w-4" />Create Automation
                </Button>
              </motion.div>
            )}

          </>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col p-0 w-full sm:max-w-lg overflow-hidden">
          <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <SheetTitle>{editingAutomation ? "Edit Automation" : "New Automation"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form id="automation-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Automation Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Auto-assign bugs to QA" className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="triggerEvent" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">When this happens (Trigger)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a trigger..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRIGGER_EVENTS.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">Conditions (optional)</label>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1 text-foreground hover:text-foreground" onClick={handleAppendCondition}>
                      <Plus className="h-3 w-3" />Add Condition
                    </Button>
                  </div>
                  {conditionFields.map((f, idx) => (
                    <div key={f.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/40">
                      <Select value={form.watch(`conditions.${idx}.field`)} onValueChange={v => form.setValue(`conditions.${idx}.field`, v)}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITION_FIELDS.map(cf => (
                            <SelectItem key={cf} value={cf} className="text-xs capitalize">{cf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={form.watch(`conditions.${idx}.operator`)} onValueChange={v => form.setValue(`conditions.${idx}.operator`, v as AutomationCondition["operator"])}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPERATORS.map(o => (
                            <SelectItem key={o} value={o} className="text-xs">{o.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!["is_empty", "is_not_empty"].includes(form.watch(`conditions.${idx}.operator`)) && (
                        <Input
                          value={form.watch(`conditions.${idx}.value`) ?? ""}
                          onChange={e => form.setValue(`conditions.${idx}.value`, e.target.value)}
                          placeholder="value"
                          className="h-7 text-xs w-24"
                        />
                      )}
                      <button type="button" onClick={() => removeCondition(idx)} className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">
                      Actions <span className="text-red-500">*</span>
                    </label>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1 text-foreground hover:text-foreground" onClick={handleAppendAction}>
                      <Plus className="h-3 w-3" />Add Action
                    </Button>
                  </div>
                  {actionFields.map((f, idx) => (
                    <div key={f.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/40">
                      <Select value={form.watch(`actions.${idx}.type`)} onValueChange={v => form.setValue(`actions.${idx}.type`, v as AutomationAction["type"])}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(a => (
                            <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={form.watch(`actions.${idx}.value`)}
                        onChange={e => form.setValue(`actions.${idx}.value`, e.target.value)}
                        placeholder="value"
                        className="h-7 text-xs flex-1"
                      />
                      <button type="button" onClick={() => removeAction(idx)} className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {form.formState.errors.actions?.root && (
                    <p className="text-xs text-red-500">{form.formState.errors.actions.root.message}</p>
                  )}
                </div>
              </form>
            </Form>
          </div>

          <SheetFooter className="px-6 py-3 border-t shrink-0 flex-row gap-2">
            <Button
              form="automation-form"
              type="submit"
              disabled={createAutomation.isPending || updateAutomation.isPending}
              className="h-8 text-xs flex-1"
            >
              {(createAutomation.isPending || updateAutomation.isPending)
                ? "Saving..."
                : editingAutomation ? "Save Changes" : "Create Automation"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCloseSheet} className="h-8 text-xs">Cancel</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
