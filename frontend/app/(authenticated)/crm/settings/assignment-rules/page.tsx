"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useAssignmentRules, useCreateAssignmentRule, useUpdateAssignmentRule,
  useDeleteAssignmentRule, useReorderAssignmentRules,
  type AssignmentRuleCondition,
} from "@/lib/api/hooks/crm-settings";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { Employee, PaginatedEmployees } from "@/types/hr";
import { toast } from "sonner";

const FIELDS = [
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "city", label: "City" },
  { value: "company", label: "Company" },
  { value: "potentialValue", label: "Potential Value" },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "in", label: "In (comma-sep)" },
];

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.string().min(1),
});

const createRuleSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  assignmentType: z.enum(["assign_user", "round_robin"]),
  assignToUserId: z.string().optional(),
  roundRobinUserIds: z.string().optional(),
  conditions: z.array(conditionSchema).min(1, "At least one condition required"),
});
type CreateRuleForm = z.infer<typeof createRuleSchema>;

interface RuleCardProps {
  rule: {
    id: number;
    name: string;
    isActive: boolean;
    assignmentType: string;
    priority: number;
    conditions: AssignmentRuleCondition[];
  };
  index: number;
  totalRules: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onToggle: (id: number, isActive: boolean) => void;
  onDeleteRequest: (id: number) => void;
}

function RuleCard({ rule, index, totalRules, onMove, onToggle, onDeleteRequest }: RuleCardProps) {
  const handleMoveUp = useCallback(() => onMove(index, "up"), [index, onMove]);
  const handleMoveDown = useCallback(() => onMove(index, "down"), [index, onMove]);
  const handleToggle = useCallback(() => onToggle(rule.id, rule.isActive), [rule.id, rule.isActive, onToggle]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(rule.id), [rule.id, onDeleteRequest]);

  return (
    <Card className={cn("shadow-sm transition-all", !rule.isActive && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === 0} onClick={handleMoveUp} aria-label="Move rule up">
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === totalRules - 1} onClick={handleMoveDown} aria-label="Move rule down">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium truncate">{rule.name}</h3>
              <Badge variant="secondary" className="text-[10px]">Priority {rule.priority}</Badge>
              <Badge variant={rule.assignmentType === "round_robin" ? "default" : "secondary"} className="text-[10px]">
                {rule.assignmentType === "round_robin" ? "Round Robin" : "Direct Assign"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {rule.conditions.map((c, ci) => (
                <Badge key={ci} variant="outline" className="text-[10px]">
                  {FIELDS.find(f => f.value === c.field)?.label ?? c.field} {c.operator} {c.value}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.isActive} onCheckedChange={handleToggle} />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteRequest} aria-label="Delete rule">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConditionRowProps {
  cField: { id: string };
  index: number;
  control: Control<CreateRuleForm>;
  showRemove: boolean;
  onRemove: (index: number) => void;
}

function ConditionRow({ index: i, control, showRemove, onRemove }: ConditionRowProps) {
  const handleRemove = useCallback(() => onRemove(i), [i, onRemove]);
  return (
    <div className="flex items-center gap-2">
      <FormField control={control} name={`conditions.${i}.field`} render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
          <SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
      )} />
      <FormField control={control} name={`conditions.${i}.operator`} render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Op" /></SelectTrigger>
          <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      )} />
      <FormField control={control} name={`conditions.${i}.value`} render={({ field }) => (
        <Input {...field} className="h-8 text-xs flex-1" placeholder="Value" />
      )} />
      {showRemove && (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={handleRemove} aria-label="Remove condition">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function resolveEmployees(raw: Employee[] | PaginatedEmployees | undefined): Employee[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.data;
}

export default function AssignmentRulesPage() {
  const { data: rules, isLoading, isError, refetch } = useAssignmentRules();
  const { data: rawEmployees } = useHrEmployees();
  const employees = resolveEmployees(rawEmployees);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createRule = useCreateAssignmentRule();
  const updateRule = useUpdateAssignmentRule();
  const deleteRule = useDeleteAssignmentRule();
  const reorderRules = useReorderAssignmentRules();

  const form = useForm<CreateRuleForm>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: {
      name: "",
      assignmentType: "assign_user",
      assignToUserId: "",
      roundRobinUserIds: "",
      conditions: [{ field: "", operator: "eq", value: "" }],
    },
  });

  const { fields: conditionFields, append: addCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const assignmentType = form.watch("assignmentType");

  const onCreateSubmit = useCallback((data: CreateRuleForm) => {
    createRule.mutate(
      {
        name: data.name,
        assignmentType: data.assignmentType,
        assignToUserId: data.assignmentType === "assign_user" ? data.assignToUserId || undefined : undefined,
        roundRobinUserIds: data.assignmentType === "round_robin"
          ? data.roundRobinUserIds?.split(",").map(s => s.trim()).filter(Boolean) ?? []
          : undefined,
        conditions: data.conditions,
        priority: (rules?.length ?? 0),
      },
      {
        onSuccess: () => { toast.success("Rule created"); setCreateOpen(false); form.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createRule, form, rules]);

  const handleToggleActive = useCallback((id: number, currentActive: boolean) => {
    updateRule.mutate(
      { id, isActive: !currentActive },
      { onSuccess: () => toast.success("Rule updated"), onError: (err) => toast.error(err.message) }
    );
  }, [updateRule]);

  const handleMoveRule = useCallback((index: number, direction: "up" | "down") => {
    if (!rules) return;
    const newRules = [...rules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRules.length) return;
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
    reorderRules.mutate(
      { rules: newRules.map((r, i) => ({ id: r.id, priority: i })) },
      { onError: (err) => toast.error(err.message) }
    );
  }, [rules, reorderRules]);

  const handleAddCondition = useCallback(() => {
    addCondition({ field: "", operator: "eq", value: "" });
  }, [addCondition]);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteRule.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Rule deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  }, [deleteRule, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) handleDeleteCancel(); }, [handleDeleteCancel]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          illustration={<Settings className="h-10 w-10 text-muted-foreground" />}
          title="Failed to load assignment rules"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) handleDeleteCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment Rule</AlertDialogTitle>
            <AlertDialogDescription>
              This rule will be permanently deleted and leads will no longer be auto-assigned by it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageWrapper
        title="Assignment Rules"
        subtitle="Auto-assign leads based on conditions"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Assignment Rule</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Mumbai Leads to Ravi" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div>
                    <FormLabel className="text-sm">Conditions</FormLabel>
                    <div className="space-y-2 mt-2">
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
                    <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={handleAddCondition}>
                      <Plus className="h-3 w-3 mr-1" /> Add Condition
                    </Button>
                  </div>

                  <FormField control={form.control} name="assignmentType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="assign_user">Assign to User</SelectItem>
                          <SelectItem value="round_robin">Round Robin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {assignmentType === "assign_user" && (
                    <FormField control={form.control} name="assignToUserId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {assignmentType === "round_robin" && (
                    <FormField control={form.control} name="roundRobinUserIds" render={({ field }) => (
                      <FormItem>
                        <FormLabel>User IDs (comma-separated)</FormLabel>
                        <FormControl><Input {...field} placeholder="user-id-1, user-id-2, ..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <Button type="submit" className="w-full" disabled={createRule.isPending}>
                    {createRule.isPending ? "Creating..." : "Create Rule"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      >
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="space-y-3">
            {rules && rules.length > 0 ? (
              rules.map((rule, index) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  index={index}
                  totalRules={rules.length}
                  onMove={handleMoveRule}
                  onToggle={handleToggleActive}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))
            ) : (
              <div className="flex flex-1 items-center justify-center py-14">
                <EmptyState
                  illustration={<Settings className="h-10 w-10 text-muted-foreground" />}
                  title="No assignment rules"
                  description="Create rules to automatically assign incoming leads to the right people."
                  action={{ label: "New Rule", onClick: handleOpenCreate }}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      </PageWrapper>
    </>
  );
}
