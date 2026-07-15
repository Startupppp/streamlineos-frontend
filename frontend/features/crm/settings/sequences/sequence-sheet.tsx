"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateCrmSequence,
  useUpdateCrmSequence,
  useCrmSequenceSteps,
  useCreateCrmSequenceStep,
  useDeleteCrmSequenceStep,
  useCrmSequenceEnrollments,
  useStopEnrollment,
} from "@/hooks/api/crm";
import type { CrmSequence, SequenceStepType } from "@/types/crm";

const STEP_TYPE_LABELS: Record<SequenceStepType, string> = {
  email: "Send Email",
  call_task: "Call Task",
  whatsapp_task: "WhatsApp Task",
  wait: "Wait",
};

const ENROLLMENT_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  completed: "secondary",
  stopped: "outline",
  failed: "destructive",
};

const sequenceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  entityType: z.enum(["lead", "deal", "contact"]),
  isActive: z.boolean(),
});

type SequenceFormValues = z.infer<typeof sequenceSchema>;

interface Props {
  sequence: CrmSequence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AddStepFormValues {
  stepType: SequenceStepType;
  waitHours: string;
}

function StepsTab({ sequenceId }: { sequenceId: string }) {
  const { data, isLoading } = useCrmSequenceSteps(sequenceId);
  const createStep = useCreateCrmSequenceStep(sequenceId);
  const deleteStep = useDeleteCrmSequenceStep(sequenceId);
  const [addingStep, setAddingStep] = useState(false);
  const [stepForm, setStepForm] = useState<AddStepFormValues>({ stepType: "email", waitHours: "" });

  const handleAddStep = useCallback(() => {
    const waitHours = stepForm.waitHours ? parseInt(stepForm.waitHours, 10) : undefined;
    createStep.mutate(
      { stepType: stepForm.stepType, waitHours },
      {
        onSuccess: () => {
          toast.success("Step added");
          setAddingStep(false);
          setStepForm({ stepType: "email", waitHours: "" });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [createStep, stepForm]);

  const handleDeleteStep = useCallback(
    (stepId: string) => {
      deleteStep.mutate(stepId, {
        onSuccess: () => toast.success("Step deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteStep],
  );

  const handleStepTypeChange = useCallback((value: string) => {
    setStepForm((prev) => ({ ...prev, stepType: value as SequenceStepType }));
  }, []);

  const handleWaitHoursChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStepForm((prev) => ({ ...prev, waitHours: e.target.value }));
  }, []);

  const handleToggleAdding = useCallback(() => setAddingStep((v) => !v), []);

  const steps = data?.steps ?? [];

  if (isLoading) return <DataTableSkeleton rows={8} columns={3} />;

  return (
    <div className="space-y-3">
      {steps.length === 0 && !addingStep && (
        <p className="text-sm text-muted-foreground text-center py-6">No steps yet.</p>
      )}
      {steps
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">
                {step.sortOrder}.
              </span>
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {STEP_TYPE_LABELS[step.stepType]}
              </Badge>
              {step.waitHours != null && (
                <span className="text-xs text-muted-foreground">
                  Wait {step.waitHours}h
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteStep(step.id)}
              disabled={deleteStep.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      {addingStep && (
        <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
          <div className="flex gap-2">
            <Select value={stepForm.stepType} onValueChange={handleStepTypeChange}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STEP_TYPE_LABELS) as SequenceStepType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {STEP_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Wait hours"
              value={stepForm.waitHours}
              onChange={handleWaitHoursChange}
              className="w-28 h-8 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <LoadingButton
              type="button"
              size="sm"
              className="text-xs h-7"
              isPending={createStep.isPending}
              onClick={handleAddStep}
            >
              Add
            </LoadingButton>
            <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={handleToggleAdding}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {!addingStep && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 border-dashed"
          onClick={handleToggleAdding}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Step
        </Button>
      )}
    </div>
  );
}

function EnrollmentsTab({ sequenceId }: { sequenceId: string }) {
  const { data, isLoading } = useCrmSequenceEnrollments(sequenceId, 1);
  const stopEnrollment = useStopEnrollment(sequenceId);

  const handleStop = useCallback(
    (enrollmentId: string) => {
      stopEnrollment.mutate(enrollmentId, {
        onSuccess: () => toast.success("Enrollment stopped"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [stopEnrollment],
  );

  const enrollments = data?.enrollments ?? [];

  if (isLoading) return <DataTableSkeleton rows={8} columns={4} />;

  if (enrollments.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No enrollments yet.</p>;
  }

  return (
    <div className="space-y-2">
      {enrollments.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20 gap-3"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs font-medium truncate">{e.entityId}</p>
            <div className="flex items-center gap-2">
              <Badge
                variant={ENROLLMENT_STATUS_VARIANTS[e.status] ?? "outline"}
                className="text-[10px]"
              >
                {e.status}
              </Badge>
              <span className="text-[11px] text-muted-foreground">Step {e.currentStep}</span>
              {e.nextRunAt && (
                <span className="text-[11px] text-muted-foreground">
                  Next: {new Date(e.nextRunAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          {e.status === "active" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 shrink-0"
              onClick={() => handleStop(e.id)}
              disabled={stopEnrollment.isPending}
            >
              Stop
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function SequenceSheet({ sequence, open, onOpenChange }: Props) {
  const isEdit = sequence !== null;
  const createSequence = useCreateCrmSequence();
  const updateSequence = useUpdateCrmSequence();

  const form = useForm<SequenceFormValues>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      name: "",
      description: "",
      entityType: "lead",
      isActive: false,
    },
  });

  useEffect(() => {
    if (sequence) {
      form.reset({
        name: sequence.name,
        description: sequence.description ?? "",
        entityType: sequence.entityType as "lead" | "deal" | "contact",
        isActive: sequence.isActive,
      });
    } else {
      form.reset({ name: "", description: "", entityType: "lead", isActive: false });
    }
  }, [sequence, form]);

  const onSubmit = useCallback(
    (values: SequenceFormValues) => {
      if (isEdit && sequence) {
        updateSequence.mutate(
          { id: sequence.id, ...values },
          {
            onSuccess: () => {
              toast.success("Sequence updated");
              onOpenChange(false);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        createSequence.mutate(values, {
          onSuccess: () => {
            toast.success("Sequence created");
            onOpenChange(false);
            form.reset();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [isEdit, sequence, createSequence, updateSequence, onOpenChange, form],
  );

  const isPending = createSequence.isPending || updateSequence.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 flex flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>{isEdit ? "Edit Sequence" : "New Sequence"}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0 rounded-none border-b w-full justify-start px-6 h-10 bg-transparent gap-0">
            <TabsTrigger value="details" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm">Details</TabsTrigger>
            {isEdit && (
              <>
                <TabsTrigger value="steps" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm">Steps</TabsTrigger>
                <TabsTrigger value="enrollments" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm">Enrollments</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="details" className="flex flex-col flex-1 min-h-0 mt-0 overflow-hidden">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <SheetBody className="px-6 py-4 space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. New Lead Outreach" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="deal">Deal</SelectItem>
                            <SelectItem value="contact">Contact</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Active</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </SheetBody>
                <SheetFooter className="shrink-0 px-6 py-4 border-t">
                  <LoadingButton type="submit" isPending={isPending} className="w-full">
                    {isEdit ? "Save Changes" : "Create Sequence"}
                  </LoadingButton>
                </SheetFooter>
              </form>
            </Form>
          </TabsContent>

          {isEdit && sequence && (
            <>
              <TabsContent value="steps" className="flex flex-col flex-1 min-h-0 mt-0 overflow-hidden">
                <SheetBody className="px-6 py-4">
                  <StepsTab sequenceId={sequence.id} />
                </SheetBody>
              </TabsContent>
              <TabsContent value="enrollments" className="flex flex-col flex-1 min-h-0 mt-0 overflow-hidden">
                <SheetBody className="px-6 py-4">
                  <EnrollmentsTab sequenceId={sequence.id} />
                </SheetBody>
              </TabsContent>
            </>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
