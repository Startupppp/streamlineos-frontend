"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Route, Trash2, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import {
  useRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
  type SupportRoutingRule,
  type TicketPriority,
} from "@/lib/api/hooks/support/macros";
import { useOrgMembers } from "@/lib/api/hooks/organization";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

const NO_ASSIGNEE = "__none__";
const NO_PRIORITY = "__none__";

const FIELDS = [
  { value: "title", label: "Title" },
  { value: "category", label: "Category" },
  { value: "description", label: "Description" },
  { value: "priority", label: "Priority" },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "contains", label: "Contains" },
];

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const conditionSchema = z.object({
  field: z.string().min(1, "Field required"),
  op: z.enum(["eq", "neq", "contains"]),
  value: z.string().min(1, "Value required"),
});

const ruleSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  conditions: z.array(conditionSchema).min(1, "At least one condition required"),
  assigneeId: z.string(),
  setPriority: z.string(),
  isEnabled: z.boolean(),
});
type RuleForm = z.infer<typeof ruleSchema>;

interface ConditionRowProps {
  index: number;
  control: Control<RuleForm>;
  showRemove: boolean;
  onRemove: (index: number) => void;
}

function ConditionRow({ index, control, showRemove, onRemove }: ConditionRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  return (
    <div className="flex items-start gap-2">
      <FormField
        control={control}
        name={`conditions.${index}.field`}
        render={({ field }) => (
          <FormItem className="w-32">
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`conditions.${index}.op`}
        render={({ field }) => (
          <FormItem className="w-32">
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Op" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {OPERATORS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`conditions.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Value" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {showRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive shrink-0"
          onClick={handleRemove}
          aria-label="Remove condition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface RuleSheetProps {
  rule?: SupportRoutingRule;
  members: { userId: string; name: string | null; email: string }[];
  onClose: () => void;
}

function RuleSheet({ rule, members, onClose }: RuleSheetProps) {
  const isEdit = !!rule;
  const create = useCreateRoutingRule();
  const update = useUpdateRoutingRule();
  const isPending = create.isPending || update.isPending;

  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: rule?.name ?? "",
      conditions:
        rule?.conditions && rule.conditions.length > 0
          ? rule.conditions
          : [{ field: "title", op: "contains", value: "" }],
      assigneeId: rule?.assigneeId ?? NO_ASSIGNEE,
      setPriority: rule?.setPriority ?? NO_PRIORITY,
      isEnabled: rule?.isEnabled ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "conditions" });

  const handleAddCondition = useCallback(() => {
    append({ field: "title", op: "contains", value: "" });
  }, [append]);

  const onSubmit = useCallback(
    (data: RuleForm) => {
      const assigneeId = data.assigneeId === NO_ASSIGNEE ? undefined : data.assigneeId;
      const setPriority =
        data.setPriority === NO_PRIORITY ? undefined : (data.setPriority as TicketPriority);

      if (isEdit) {
        update.mutate(
          {
            id: rule.id,
            name: data.name,
            conditions: data.conditions,
            assigneeId: assigneeId ?? null,
            setPriority: setPriority ?? null,
            isEnabled: data.isEnabled,
          },
          {
            onSuccess: () => {
              toast.success("Rule updated");
              onClose();
            },
            onError: (error) => toast.error(getApiError(error)),
          },
        );
      } else {
        create.mutate(
          {
            name: data.name,
            conditions: data.conditions,
            assigneeId,
            setPriority,
            isEnabled: data.isEnabled,
          },
          {
            onSuccess: () => {
              toast.success("Rule created");
              onClose();
            },
            onError: (error) => toast.error(getApiError(error)),
          },
        );
      }
    },
    [create, update, isEdit, rule, onClose],
  );

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit Routing Rule" : "New Routing Rule"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Billing tickets to finance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-sm">Conditions (all must match)</FormLabel>
                <div className="space-y-2 mt-2">
                  {fields.map((cField, i) => (
                    <ConditionRow
                      key={cField.id}
                      index={i}
                      control={form.control}
                      showRemove={fields.length > 1}
                      onRemove={remove}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={handleAddCondition}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Condition
                </Button>
              </div>

              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ASSIGNEE}>No assignee</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.name ?? m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setPriority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Set Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Keep priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PRIORITY}>Keep priority</SelectItem>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="mb-0">Enabled</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Rule"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

interface RuleCardProps {
  rule: SupportRoutingRule;
  index: number;
  total: number;
  assigneeName: string | null;
  onToggle: (rule: SupportRoutingRule) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onEdit: (rule: SupportRoutingRule) => void;
  onDelete: (rule: SupportRoutingRule) => void;
}

function RuleCard({
  rule,
  index,
  total,
  assigneeName,
  onToggle,
  onMove,
  onEdit,
  onDelete,
}: RuleCardProps) {
  const handleToggle = useCallback(() => onToggle(rule), [rule, onToggle]);
  const handleMoveUp = useCallback(() => onMove(index, "up"), [index, onMove]);
  const handleMoveDown = useCallback(() => onMove(index, "down"), [index, onMove]);
  const handleEdit = useCallback(() => onEdit(rule), [rule, onEdit]);
  const handleDelete = useCallback(() => onDelete(rule), [rule, onDelete]);

  return (
    <Card className={rule.isEnabled ? "" : "opacity-60"}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={index === 0}
              onClick={handleMoveUp}
              aria-label="Move rule up"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={index === total - 1}
              onClick={handleMoveDown}
              aria-label="Move rule down"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium truncate">{rule.name}</h3>
              {rule.setPriority && (
                <Badge variant="secondary" className="text-[10px]">
                  → {rule.setPriority}
                </Badge>
              )}
              {assigneeName && (
                <Badge variant="outline" className="text-[10px]">
                  → {assigneeName}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {rule.conditions.map((c, ci) => (
                <Badge key={ci} variant="outline" className="text-[10px]">
                  {FIELDS.find((f) => f.value === c.field)?.label ?? c.field}{" "}
                  {OPERATORS.find((o) => o.value === c.op)?.label ?? c.op} {c.value}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.isEnabled} onCheckedChange={handleToggle} />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit rule">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={handleDelete}
              aria-label="Delete rule"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupportRoutingPage() {
  const { data: rules, isLoading, isError, refetch } = useRoutingRules();
  const { data: membersResponse } = useOrgMembers(1, 200);
  const members = useMemo(() => membersResponse?.data ?? [], [membersResponse]);

  const updateRule = useUpdateRoutingRule();
  const deleteRule = useDeleteRoutingRule();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupportRoutingRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportRoutingRule | null>(null);
  const [orderedRules, setOrderedRules] = useState<SupportRoutingRule[]>(rules ?? []);
  const [syncedRules, setSyncedRules] = useState(rules);
  if (rules !== syncedRules) {
    setSyncedRules(rules);
    setOrderedRules(rules ?? []);
  }

  const assigneeNameOf = useCallback(
    (id: string | null) => {
      if (!id) return null;
      const match = members.find((m) => m.userId === id);
      return match?.name ?? match?.email ?? id;
    },
    [members],
  );

  const handleToggle = useCallback(
    (rule: SupportRoutingRule) => {
      updateRule.mutate(
        { id: rule.id, isEnabled: !rule.isEnabled },
        { onError: (error) => toast.error(getApiError(error)) },
      );
    },
    [updateRule],
  );

  const handleMove = useCallback(
    (index: number, direction: "up" | "down") => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= orderedRules.length) return;
      const next = [...orderedRules];
      [next[index], next[target]] = [next[target], next[index]];
      setOrderedRules(next);
      next.forEach((rule, i) => {
        if (rule.sortOrder !== i) {
          updateRule.mutate(
            { id: rule.id, sortOrder: i },
            { onError: (error) => toast.error(getApiError(error)) },
          );
        }
      });
    },
    [orderedRules, updateRule],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRule.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Rule deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getApiError(error)),
    });
  }, [deleteTarget, deleteRule]);

  return (
    <PageWrapper
      title="Routing Rules"
      subtitle="Auto-assign and prioritise incoming tickets"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Rule
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : orderedRules.length > 0 ? (
        <div className="space-y-3">
          {orderedRules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              index={index}
              total={orderedRules.length}
              assigneeName={assigneeNameOf(rule.assigneeId)}
              onToggle={handleToggle}
              onMove={handleMove}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Route}
          title="No routing rules yet"
          description="Create rules to auto-assign and prioritise tickets as they arrive."
          action={{ label: "New Rule", onClick: () => setCreateOpen(true) }}
          className="flex-1"
        />
      )}

      {createOpen && <RuleSheet members={members} onClose={() => setCreateOpen(false)} />}
      {editTarget && (
        <RuleSheet rule={editTarget} members={members} onClose={() => setEditTarget(null)} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete routing rule?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
