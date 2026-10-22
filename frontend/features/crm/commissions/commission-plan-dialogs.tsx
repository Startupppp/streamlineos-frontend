"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { MemberPicker } from "@/components/members/member-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useAssignCommissionPlan,
  useEndCommissionAssignment,
  useUpdateCommissionPlan,
} from "@/hooks/api/crm/commission";
import { majorToMinor } from "@/lib/accounting/money";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  assignSchema,
  endSchema,
  planSchema,
  type AssignValues,
  type EndValues,
  type PlanValues,
} from "./commission-plan-dialogs-schema";

function toastErrors(error: Error) {
  toast.error(getErrorMessage(error));
}


interface AssignDialogProps {
  planId: string;
  currency: string;
  onOpenChange: (open: boolean) => void;
}

export function AssignCommissionPlanDialog({ planId, currency, onOpenChange }: AssignDialogProps) {
  const assign = useAssignCommissionPlan();
  const handleSubmit = (values: AssignValues) =>
    assign.mutate(
      {
        planId,
        userId: values.userId ?? "",
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo === "" ? null : values.effectiveTo,
        quotaOverrideMinor: values.quota === "" ? null : majorToMinor(Number(values.quota), currency),
      },
      {
        onSuccess: () => {
          toast.success("Assigned to the plan");
          onOpenChange(false);
        },
        onError: toastErrors,
      },
    );

  return (
    <EntityFormDialog<AssignValues>
      open
      onOpenChange={onOpenChange}
      title="Assign to plan"
      resolver={zodResolver(assignSchema)}
      defaultValues={{ userId: null, effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: "", quota: "" }}
      onSubmit={handleSubmit}
      isSubmitting={assign.isPending}
      submitLabel="Assign"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Person</FormLabel>
                <MemberPicker
                  mode="single"
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  placeholder="Select a person"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} ariaLabel="From" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Until (inclusive)</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} ariaLabel="Until" placeholder="Open-ended" clearable />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`Own quota (${currency})`}</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" placeholder="The plan's quota" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}


interface EndDialogProps {
  assignmentId: string;
  personName: string;
  onOpenChange: (open: boolean) => void;
}

export function EndCommissionAssignmentDialog({ assignmentId, personName, onOpenChange }: EndDialogProps) {
  const end = useEndCommissionAssignment();
  const handleSubmit = (values: EndValues) =>
    end.mutate(
      { assignmentId, effectiveTo: values.effectiveTo },
      {
        onSuccess: () => {
          toast.success(`${personName} comes off the plan after ${values.effectiveTo}`);
          onOpenChange(false);
        },
        onError: toastErrors,
      },
    );

  return (
    <EntityFormDialog<EndValues>
      open
      onOpenChange={onOpenChange}
      title={`End ${personName}'s assignment`}
      description="Deals closed after this day earn nothing under this plan."
      resolver={zodResolver(endSchema)}
      defaultValues={{ effectiveTo: new Date().toISOString().slice(0, 10) }}
      onSubmit={handleSubmit}
      isSubmitting={end.isPending}
      submitLabel="End assignment"
    >
      {(form) => (
        <FormField
          control={form.control}
          name="effectiveTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last day</FormLabel>
              <DatePicker value={field.value} onChange={field.onChange} ariaLabel="Last day" />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}


interface EditPlanDialogProps {
  planId: string;
  initial: PlanValues;
  onOpenChange: (open: boolean) => void;
}

export function EditCommissionPlanDialog({ planId, initial, onOpenChange }: EditPlanDialogProps) {
  const update = useUpdateCommissionPlan();
  const handleSubmit = (values: PlanValues) =>
    update.mutate(
      {
        planId,
        name: values.name,
        description: values.description === "" ? null : values.description,
        retiredOn: values.retiredOn === "" ? null : values.retiredOn,
      },
      {
        onSuccess: () => {
          toast.success("Plan saved");
          onOpenChange(false);
        },
        onError: toastErrors,
      },
    );

  return (
    <EntityFormDialog<PlanValues>
      open
      onOpenChange={onOpenChange}
      title="Edit plan"
      description="A retired plan cannot be assigned; earnings already made under it keep their rules."
      resolver={zodResolver(planSchema)}
      defaultValues={initial}
      onSubmit={handleSubmit}
      isSubmitting={update.isPending}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="retiredOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retired on</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} ariaLabel="Retired on" placeholder="Active" clearable />
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
