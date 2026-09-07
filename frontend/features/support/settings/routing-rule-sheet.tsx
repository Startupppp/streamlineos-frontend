import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { PlusIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  useCreateRoutingRule,
  useUpdateRoutingRule,
  type SupportRoutingRule,
} from "@/hooks/api/support/macros";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { conditionSchema, ruleSchema, type RuleForm } from "./routing-rule-form.schema";
import {
  ASSIGNMENT_MODES,
  NO_ASSIGNEE,
  NO_PRIORITY,
  ROUTING_PRIORITIES,
} from "./routing-rule-options";
import {
  CandidateCheckbox,
  ConditionRow,
  RequiredSkills,
} from "./routing-rule-conditions";

export interface RoutingRuleMember {
  userId: string;
  name: string | null;
  email: string;
}

interface RuleSheetProps {
  rule?: SupportRoutingRule;
  members: RoutingRuleMember[];
  onClose: () => void;
}

const DEFAULT_CONDITION: RuleForm["conditions"][number] = { field: "title", op: "contains", value: "" };

function parseConditions(raw: unknown[]): RuleForm["conditions"] {
  const parsed = conditionSchema.array().safeParse(raw);
  return parsed.success && parsed.data.length > 0 ? parsed.data : [DEFAULT_CONDITION];
}

export function RoutingRuleSheet({ rule, members, onClose }: RuleSheetProps) {
  const isEdit = Boolean(rule);
  const create = useCreateRoutingRule();
  const update = useUpdateRoutingRule();
  const isPending = create.isPending || update.isPending;
  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: rule?.name ?? "",
      conditions: parseConditions(rule?.conditions ?? []),
      assigneeId: NO_ASSIGNEE,
      setPriority: rule?.setPriority ?? NO_PRIORITY,
      assignmentMode: rule?.assignmentMode ?? "static",
      candidateAgentIds: rule?.candidateAgentIds ?? [],
      requiredSkills: rule?.requiredSkills ?? [],
      isEnabled: rule?.isEnabled ?? true,
    },
  });
  const assignmentMode = useWatch({
    control: form.control,
    name: "assignmentMode",
  });
  const candidateAgentIds = useWatch({
    control: form.control,
    name: "candidateAgentIds",
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });
  const handleAddCondition = useCallback(
    () => append({ field: "title", op: "contains", value: "" }),
    [append],
  );
  const handleToggleCandidate = useCallback(
    (userId: string, checked: boolean) => {
      const current = form.getValues("candidateAgentIds");
      form.setValue(
        "candidateAgentIds",
        checked ? [...current, userId] : current.filter((id) => id !== userId),
        { shouldDirty: true },
      );
    },
    [form],
  );
  const handleSubmit = useCallback(
    (data: RuleForm) => {
      const assigneeId =
        data.assigneeId === NO_ASSIGNEE ? undefined : data.assigneeId;
      const setPriority = ROUTING_PRIORITIES.find(
        (priority) => priority === data.setPriority,
      );
      const onError = (error: Error) => toast.error(getErrorMessage(error));
      if (isEdit && rule) {
        update.mutate(
          {
            id: rule.id,
            name: data.name,
            conditions: data.conditions,
            assigneeId: assigneeId ?? null,
            setPriority: setPriority ?? null,
            assignmentMode: data.assignmentMode,
            candidateAgentIds: data.candidateAgentIds,
            requiredSkills: data.requiredSkills,
            isEnabled: data.isEnabled,
          },
          {
            onSuccess: () => {
              toast.success("Rule updated");
              onClose();
            },
            onError,
          },
        );
        return;
      }
      create.mutate(
        {
          name: data.name,
          conditions: data.conditions,
          assigneeId,
          setPriority,
          assignmentMode: data.assignmentMode,
          candidateAgentIds: data.candidateAgentIds,
          requiredSkills: data.requiredSkills,
          isEnabled: data.isEnabled,
        },
        {
          onSuccess: () => {
            toast.success("Rule created");
            onClose();
          },
          onError,
        },
      );
    },
    [create, isEdit, onClose, rule, update],
  );
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {isEdit ? "Edit Routing Rule" : "New Routing Rule"}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="p-4 space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Billing tickets to finance"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel className="text-sm">
                  Conditions (all must match)
                </FormLabel>
                <div className="space-y-2 mt-2">
                  {fields.map((field, index) => (
                    <ConditionRow
                      key={field.id}
                      index={index}
                      control={form.control}
                      showRemove={fields.length > 1}
                      onRemove={remove}
                    />
                  ))}
                </div>
                <AnimatedIconButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={handleAddCondition}
                  icon={PlusIcon}
                  iconClassName="mr-1"
                >
                  Add Condition
                </AnimatedIconButton>
              </div>
              <FormField
                control={form.control}
                name="assignmentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assignment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSIGNMENT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {
                        ASSIGNMENT_MODES.find(
                          (mode) => mode.value === field.value,
                        )?.description
                      }
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {assignmentMode === "static" ? (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_ASSIGNEE}>
                            No assignee
                          </SelectItem>
                          {members.map((member) => (
                            <SelectItem
                              key={member.userId}
                              value={member.userId}
                            >
                              {member.name ?? member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="candidateAgentIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Candidate Agents</FormLabel>
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 p-2 space-y-1.5">
                        {members.map((member) => (
                          <CandidateCheckbox
                            key={member.userId}
                            userId={member.userId}
                            label={member.name ?? member.email}
                            checked={candidateAgentIds.includes(member.userId)}
                            onToggle={handleToggleCandidate}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {assignmentMode === "skill_based" && (
                <FormItem>
                  <FormLabel>Required Skills</FormLabel>
                  <RequiredSkills form={form} />
                </FormItem>
              )}
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
                        <SelectItem value={NO_PRIORITY}>
                          Keep priority
                        </SelectItem>
                        {ROUTING_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
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
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : isEdit
                    ? "Save Changes"
                    : "Create Rule"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
