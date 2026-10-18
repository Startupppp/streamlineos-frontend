"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrDepartments } from "@/hooks/api/hr/employee-departments";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses } from "@/lib/design-tokens";
import {
  useCreatePosition,
  usePositionStatuses,
  useSeedPositionStatuses,
} from "@/features/hr/governance/hooks/use-positions";
import {
  CREATE_POSITION_DEFAULTS,
  budgetedCostCentsOf,
  createPositionFormSchema,
  type CreatePositionFormValues,
} from "@/features/hr/governance/components/position-schema";

const NO_DEPARTMENT = "none";
const DEFAULT_STATUS_NAME = "open";

interface CreatePositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePositionDialog({ open, onOpenChange }: CreatePositionDialogProps) {
  const createPosition = useCreatePosition();
  const statusesQuery = usePositionStatuses();
  const statuses = statusesQuery.data;
  const { data: departments } = useHrDepartments({ enabled: open });
  const seedStatuses = useSeedPositionStatuses();
  const activeStatuses = useMemo(() => (statuses ?? []).filter((status) => status.isActive), [statuses]);
  const statusesPending = statuses === undefined && !statusesQuery.isError;
  const noStatuses = statuses !== undefined && activeStatuses.length === 0;
  const defaultValues = useMemo<CreatePositionFormValues>(
    () => ({
      ...CREATE_POSITION_DEFAULTS,
      status: (activeStatuses.find((status) => status.name === DEFAULT_STATUS_NAME) ?? activeStatuses[0])?.name ?? "",
    }),
    [activeStatuses],
  );
  const tone = statusToneClasses("neutral");
  const errorTone = statusToneClasses("danger");

  function handleRetryStatuses() {
    void statusesQuery.refetch();
  }

  function handleSeedStatuses() {
    seedStatuses.mutate(undefined, {
      onSuccess: () => toast.success("Default position statuses added"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleSubmit(values: CreatePositionFormValues) {
    createPosition.mutate(
      {
        title: values.title,
        status: values.status,
        effectiveFrom: values.effectiveFrom,
        departmentId: values.departmentId || undefined,
        budgetedCostCents: budgetedCostCentsOf(values.budgetedCost),
      },
      {
        onSuccess: () => {
          toast.success("Position created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<CreatePositionFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Create position"
      description="A position is a budgeted seat in the org structure; assign an incumbent once it exists."
      resolver={zodResolver(createPositionFormSchema)}
      defaultValues={defaultValues}
      resetOnOpen
      onSubmit={handleSubmit}
      isSubmitting={createPosition.isPending}
      submitLabel="Create position"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Senior backend engineer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                {statusesQuery.isError ? (
                  <div role="alert" className={`flex flex-col gap-2 rounded-lg border p-3 ${errorTone.surface} ${errorTone.rule} ${errorTone.ink}`}>
                    <p className="text-dense">
                      Position statuses could not load: {getErrorMessage(statusesQuery.error)}
                    </p>
                    <LoadingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      isPending={statusesQuery.isFetching}
                      onClick={handleRetryStatuses}
                    >
                      Retry
                    </LoadingButton>
                  </div>
                ) : noStatuses ? (
                  <div className={`flex flex-col gap-2 rounded-lg border p-3 ${tone.surface} ${tone.rule} ${tone.ink}`}>
                    <p className="text-dense">
                      No position statuses are set up yet. Add the defaults (draft, open, filled, closed) to continue.
                    </p>
                    <LoadingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      isPending={seedStatuses.isPending}
                      onClick={handleSeedStatuses}
                    >
                      Add default statuses
                    </LoadingButton>
                  </div>
                ) : (
                  <Select value={field.value} onValueChange={field.onChange} disabled={statusesPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={statusesPending ? "Loading statuses…" : "Select a status"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {activeStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.name}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective from</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} placeholder="Pick a date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department (optional)</FormLabel>
                <Select value={field.value || NO_DEPARTMENT} onValueChange={(v) => field.onChange(v === NO_DEPARTMENT ? "" : v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value={NO_DEPARTMENT}>No department</SelectItem>
                    {(departments ?? []).map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
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
            name="budgetedCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budgeted annual cost (optional)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="decimal" min={0} step="0.01" placeholder="e.g. 1200000" {...field} />
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
