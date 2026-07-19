"use client";

import { useCallback, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/api-client";
import { useCreateWorkflowDefinition, useUpdateWorkflowDefinition } from "@/hooks/api/hr/hr-workflows";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HR_WORKFLOW_OBJECT_TYPES,
  HR_WORKFLOW_OBJECT_TYPE_LABELS,
  HR_WORKFLOW_APPROVER_TYPES,
  HR_WORKFLOW_APPROVER_TYPE_LABELS,
  type HrWorkflowDefinition,
} from "@/types/hr/workflows";

const STEP_MODES = ["serial", "parallel_all", "parallel_any"] as const;
const STEP_MODE_LABELS = { serial: "Serial", parallel_all: "All must approve", parallel_any: "Any can approve" };

const stepSchema = z.object({
  stepOrder: z.number().int().min(1),
  name: z.string().min(1, "Required"),
  approverType: z.enum(HR_WORKFLOW_APPROVER_TYPES),
  approverValue: z.string().optional(),
  mode: z.enum(STEP_MODES),
  slaHours: z.number().int().positive().optional(),
  escalationApproverType: z.enum(HR_WORKFLOW_APPROVER_TYPES).optional(),
  escalationApproverValue: z.string().optional(),
});

const schema = z.object({
  objectType: z.enum(HR_WORKFLOW_OBJECT_TYPES),
  name: z.string().min(1, "Required"),
  isDefault: z.boolean(),
  settings: z.object({
    rejectionCommentRequired: z.boolean(),
    allowDelegation: z.boolean(),
    allowReopen: z.boolean(),
  }),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editDefinition?: HrWorkflowDefinition | null;
}

export function WorkflowUpsertSheet({ open, onOpenChange, editDefinition }: Props) {
  const create = useCreateWorkflowDefinition();
  const update = useUpdateWorkflowDefinition();
  const isEdit = !!editDefinition;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      objectType: "leave_request",
      name: "",
      isDefault: false,
      settings: { rejectionCommentRequired: false, allowDelegation: true, allowReopen: false },
      steps: [{ stepOrder: 1, name: "Manager Approval", approverType: "direct_manager", mode: "serial" }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "steps" });

  useEffect(() => {
    if (editDefinition) {
      form.reset({
        objectType: editDefinition.objectType,
        name: editDefinition.name,
        isDefault: editDefinition.isDefault,
        settings: {
          rejectionCommentRequired: editDefinition.settings.rejectionCommentRequired ?? false,
          allowDelegation: editDefinition.settings.allowDelegation ?? true,
          allowReopen: editDefinition.settings.allowReopen ?? false,
        },
        steps: editDefinition.steps?.map((s) => ({
          stepOrder: s.stepOrder,
          name: s.name,
          approverType: s.approverType,
          approverValue: s.approverValue ?? undefined,
          mode: s.mode,
          slaHours: s.slaHours ?? undefined,
          escalationApproverType: s.escalationApproverType ?? undefined,
          escalationApproverValue: s.escalationApproverValue ?? undefined,
        })) ?? [],
      });
    } else {
      form.reset({
        objectType: "leave_request",
        name: "",
        isDefault: false,
        settings: { rejectionCommentRequired: false, allowDelegation: true, allowReopen: false },
        steps: [{ stepOrder: 1, name: "Manager Approval", approverType: "direct_manager", mode: "serial" }],
      });
    }
  }, [editDefinition, form, open]);

  const onSubmit = useCallback((data: FormValues) => {
    const payload = {
      ...data,
      steps: data.steps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
    };

    if (isEdit && editDefinition) {
      update.mutate(
        { id: editDefinition.id, ...payload },
        {
          onSuccess: () => { toast.success("Workflow updated"); onOpenChange(false); },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Workflow created"); onOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }, [create, update, isEdit, editDefinition, onOpenChange]);

  function handleAddStep() {
    append({ stepOrder: fields.length + 1, name: "", approverType: "direct_manager", mode: "serial" });
  }

  const isPending = create.isPending || update.isPending;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Workflow" : "Create Workflow"}
      description="Configure an approval chain for HR processes"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save Changes" : "Create Workflow"}
      isPending={isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="objectType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Process Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                  <FormControl>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HR_WORKFLOW_OBJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{HR_WORKFLOW_OBJECT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Standard Leave Approval" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between col-span-3 rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium cursor-pointer">Default for this process</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.rejectionCommentRequired"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between col-span-3 rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium cursor-pointer">Require rejection comment</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.allowDelegation"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between col-span-3 rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium cursor-pointer">Allow delegation</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.allowReopen"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between col-span-3 rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium cursor-pointer">Allow reopen</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Approval Steps</p>
              <Button type="button" variant="outline" size="sm" onClick={handleAddStep} className="text-xs gap-1">
                <PlusIcon size={12} />Add Step
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="text-[11px] shrink-0">Step {index + 1}</Badge>
                  <div className="flex-1 min-w-0">
                    <FormField
                      control={form.control}
                      name={`steps.${index}.name`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Step name" className="text-xs" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-7 shrink-0 text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2Icon size={14} />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name={`steps.${index}.approverType`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-medium text-muted-foreground">Approver</FormLabel>
                        <Select onValueChange={f.onChange} value={f.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HR_WORKFLOW_APPROVER_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{HR_WORKFLOW_APPROVER_TYPE_LABELS[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`steps.${index}.mode`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-medium text-muted-foreground">Mode</FormLabel>
                        <Select onValueChange={f.onChange} value={f.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STEP_MODES.map((m) => (
                              <SelectItem key={m} value={m}>{STEP_MODE_LABELS[m]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`steps.${index}.slaHours`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-medium text-muted-foreground">SLA (hours, optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 48"
                          className="text-xs"
                          value={f.value ?? ""}
                          onChange={(e) => f.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ))}

            {form.formState.errors.steps?.root && (
              <p className="text-xs text-destructive">{form.formState.errors.steps.root.message}</p>
            )}
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}
