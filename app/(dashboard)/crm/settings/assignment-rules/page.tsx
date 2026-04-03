"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, GripVertical, Power, PowerOff, ChevronUp, ChevronDown, Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/lib/api/hooks/crm-settings";
import { useHrEmployees } from "@/lib/api/hooks/hr";
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

export default function AssignmentRulesPage() {
  const { data: rules, isLoading } = useAssignmentRules();
  const { data: rawEmployees } = useHrEmployees();
  const employees = Array.isArray(rawEmployees) ? rawEmployees : rawEmployees?.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);

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

  const toggleActive = useCallback((id: number, currentActive: boolean) => {
    updateRule.mutate(
      { id, isActive: !currentActive },
      { onSuccess: () => toast.success("Rule updated"), onError: (err) => toast.error(err.message) }
    );
  }, [updateRule]);

  const moveRule = useCallback((index: number, direction: "up" | "down") => {
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

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Assignment Rules"
      subtitle="Auto-assign leads based on conditions"
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-white">
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
                      <div key={cField.id} className="flex items-center gap-2">
                        <FormField control={form.control} name={`conditions.${i}.field`} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                            <SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                        <FormField control={form.control} name={`conditions.${i}.operator`} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Op" /></SelectTrigger>
                            <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                        <FormField control={form.control} name={`conditions.${i}.value`} render={({ field }) => (
                          <Input {...field} className="h-8 text-xs flex-1" placeholder="Value" />
                        )} />
                        {conditionFields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeCondition(i)} aria-label="Remove condition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={() => addCondition({ field: "", operator: "eq", value: "" })}>
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
                          {employees?.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name || e.id}</SelectItem>
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

                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={createRule.isPending}>
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
            rules.map((rule, index) => {
              const conditions = rule.conditions as { field: string; operator: string; value: string }[];
              return (
                <Card key={rule.id} className={cn("shadow-sm transition-all", !rule.isActive && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          disabled={index === 0}
                          onClick={() => moveRule(index, "up")}
                          aria-label="Move rule up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          disabled={index === (rules?.length ?? 0) - 1}
                          onClick={() => moveRule(index, "down")}
                          aria-label="Move rule down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">{rule.name}</h3>
                          <Badge variant="secondary" className="text-[10px]">
                            Priority {rule.priority}
                          </Badge>
                          <Badge
                            variant={rule.assignmentType === "round_robin" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {rule.assignmentType === "round_robin" ? "Round Robin" : "Direct Assign"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {conditions.map((c, ci) => (
                            <Badge key={ci} variant="outline" className="text-[10px]">
                              {FIELDS.find(f => f.value === c.field)?.label ?? c.field} {c.operator} {c.value}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => toggleActive(rule.id, rule.isActive)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteRule.mutate(rule.id, { onSuccess: () => toast.success("Rule deleted"), onError: (err) => toast.error(err.message) })}
                          aria-label="Delete rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assignment rules defined</p>
                <p className="text-xs mt-1">Create rules to auto-assign leads</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
