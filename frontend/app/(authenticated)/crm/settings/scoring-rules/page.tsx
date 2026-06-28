"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Pencil, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useScoringRules, useCreateScoringRule, useUpdateScoringRule, useDeleteScoringRule,
} from "@/lib/api/hooks/crm-settings";
import { toast } from "sonner";

const FIELDS = [
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "company", label: "Company" },
  { value: "city", label: "City" },
  { value: "potentialValue", label: "Potential Value" },
  { value: "investmentInterest", label: "Investment Interest" },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "In (comma-sep)" },
];

const ruleSchema = z.object({
  field: z.string().min(1, "Select a field"),
  operator: z.enum(["eq", "gt", "lt", "contains", "in"]),
  value: z.string().min(1, "Value required"),
  points: z
    .string()
    .min(1, "Points required")
    .refine((v) => !isNaN(Number(v)), "Must be a number")
    .refine((v) => Number.isInteger(Number(v)), "Must be an integer")
    .refine((v) => Number(v) >= -1000 && Number(v) <= 1000, "Must be between -1000 and 1000"),
});
type RuleForm = z.infer<typeof ruleSchema>;

const SAMPLE_LEAD = {
  name: "Rahul Sharma",
  email: "rahul@example.com",
  phone: "+919876543210",
  source: "referral",
  priority: "HOT",
  status: "INTERESTED",
  company: "TechCorp India",
  city: "Mumbai",
  potentialValue: "5000000",
  investmentInterest: "3000000",
};

export default function ScoringRulesPage() {
  const { data: rules, isLoading, isError, refetch } = useScoringRules();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createRule = useCreateScoringRule();
  const updateRule = useUpdateScoringRule();
  const deleteRule = useDeleteScoringRule();

  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { field: "", operator: "eq", value: "", points: "0" },
  });

  const editForm = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
  });

  const onCreateSubmit = useCallback((data: RuleForm) => {
    createRule.mutate(
      { ...data, points: Number(data.points) },
      {
        onSuccess: () => { toast.success("Rule created"); setCreateOpen(false); form.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createRule, form]);

  const onEditSubmit = useCallback((data: RuleForm) => {
    if (editingId === null) return;
    updateRule.mutate(
      { id: editingId, ...data, points: Number(data.points) },
      {
        onSuccess: () => { toast.success("Rule updated"); setEditingId(null); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [editingId, updateRule]);

  const handleStartEdit = useCallback((rule: { id: number; field: string; operator: string; value: string; points: number }) => {
    setEditingId(rule.id);
    editForm.reset({
      field: rule.field,
      operator: rule.operator as RuleForm["operator"],
      value: rule.value,
      points: String(rule.points),
    });
  }, [editForm]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);

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

  const sampleScore = useMemo(() => {
    if (!rules) return 0;
    let score = 0;
    const record = SAMPLE_LEAD as Record<string, string>;
    for (const rule of rules) {
      const fieldVal = record[rule.field] ?? "";
      let match = false;
      switch (rule.operator) {
        case "eq": match = fieldVal === rule.value; break;
        case "gt": match = Number(fieldVal) > Number(rule.value); break;
        case "lt": match = Number(fieldVal) < Number(rule.value); break;
        case "contains": match = fieldVal.toLowerCase().includes(rule.value.toLowerCase()); break;
        case "in": match = rule.value.split(",").map(v => v.trim()).includes(fieldVal); break;
      }
      if (match) score += rule.points;
    }
    return score;
  }, [rules]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          illustration={<Zap className="h-10 w-10 text-muted-foreground" />}
          title="Failed to load scoring rules"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scoring Rule</AlertDialogTitle>
            <AlertDialogDescription>
              This rule will be permanently deleted. Lead scores will no longer be affected by it.
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
        title="Lead Scoring Rules"
        subtitle="Define rules to automatically score leads"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Scoring Rule</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField control={form.control} name="field" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Pick a field" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="operator" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operator</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="value" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. HOT or 1000000" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="points" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points (-1000 to 1000)</FormLabel>
                      <FormControl><Input type="number" min={-1000} max={1000} {...field} placeholder="e.g. 20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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
          className="space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Rules</CardTitle>
              </CardHeader>
              <CardContent>
                {rules && rules.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Field</TableHead>
                        <TableHead className="text-xs">Operator</TableHead>
                        <TableHead className="text-xs">Value</TableHead>
                        <TableHead className="text-xs text-right">Points</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map(rule => (
                        <ScoringRuleRow
                          key={rule.id}
                          rule={rule}
                          isEditing={editingId === rule.id}
                          editForm={editForm}
                          onEditSubmit={onEditSubmit}
                          onEdit={handleStartEdit}
                          onDeleteRequest={handleDeleteRequest}
                          onCancelEdit={handleCancelEdit}
                          updatePending={updateRule.isPending}
                        />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-14">
                    <EmptyState
                      illustration={<Zap className="h-10 w-10 text-muted-foreground" />}
                      title="No scoring rules defined"
                      description="Create your first rule to start scoring leads automatically."
                      action={{ label: "New Rule", onClick: handleOpenCreate }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  Live Preview - Sample Lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {Object.entries(SAMPLE_LEAD).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground capitalize">{key}: </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-emerald-500/5 border border-border/50 flex items-center justify-between">
                  <span className="text-sm font-medium">Calculated Score</span>
                  <Badge className={cn(
                    "text-lg px-4 py-1 font-bold",
                    sampleScore <= 30 ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                    sampleScore <= 60 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  )}>
                    {sampleScore} pts
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </PageWrapper>
    </>
  );
}

type ScoringRuleData = { id: number; field: string; operator: string; value: string; points: number };

interface ScoringRuleRowProps {
  rule: ScoringRuleData;
  isEditing: boolean;
  editForm: UseFormReturn<RuleForm>;
  onEditSubmit: (data: RuleForm) => void;
  onEdit: (rule: ScoringRuleData) => void;
  onDeleteRequest: (id: number) => void;
  onCancelEdit: () => void;
  updatePending: boolean;
}

function ScoringRuleRow({ rule, isEditing, editForm, onEditSubmit, onEdit, onDeleteRequest, onCancelEdit, updatePending }: ScoringRuleRowProps) {
  const handleEdit = useCallback(() => onEdit(rule), [rule, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(rule.id), [rule.id, onDeleteRequest]);

  return (
    <TableRow>
      {isEditing ? (
        <>
          <TableCell colSpan={4}>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex items-end gap-2">
                <FormField control={editForm.control} name="field" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FormField control={editForm.control} name="operator" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FormField control={editForm.control} name="value" render={({ field }) => (
                  <Input {...field} className="h-8 w-24 text-xs" />
                )} />
                <FormField control={editForm.control} name="points" render={({ field }) => (
                  <Input type="number" {...field} className="h-8 w-16 text-xs" />
                )} />
                <Button type="submit" size="sm" className="h-8 text-xs" disabled={updatePending}>Save</Button>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onCancelEdit}>Cancel</Button>
              </form>
            </Form>
          </TableCell>
          <TableCell />
        </>
      ) : (
        <>
          <TableCell className="text-xs capitalize">{FIELDS.find(f => f.value === rule.field)?.label ?? rule.field}</TableCell>
          <TableCell className="text-xs">{OPERATORS.find(o => o.value === rule.operator)?.label ?? rule.operator}</TableCell>
          <TableCell className="text-xs">{rule.value}</TableCell>
          <TableCell className="text-xs text-right">
            <Badge variant={rule.points >= 0 ? "default" : "destructive"} className="text-[10px]">
              {rule.points > 0 ? "+" : ""}{rule.points}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteRequest} aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
