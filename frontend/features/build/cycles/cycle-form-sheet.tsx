"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCreateCycle, useUpdateCycle } from "@/hooks/api/build";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-refinements";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Cycle } from "@/types/projects";

const DESCRIPTION_MAX = 500;

const cycleFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").transform((value) => value.trim()).pipe(
      z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer")
        .regex(/[A-Za-z0-9]/, "Name must contain at least one letter or number"),
    ),
    description: z.string().max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or fewer`),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, context) => {
    refineDateOrder(data, context, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

const createCycleSchema = cycleFormSchema.superRefine((data, context) => {
  refineNotBeforeToday(data.startDate, context, "startDate", "Start date cannot be in the past");
  refineNotBeforeToday(data.endDate, context, "endDate", "End date cannot be in the past");
});

type CycleFormValues = z.infer<typeof cycleFormSchema>;

const EMPTY_VALUES: CycleFormValues = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
};

interface CycleFormSheetProps {
  projectId: number;
  cycles: Cycle[];
  cycle: Cycle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CycleFormSheet({
  projectId,
  cycles,
  cycle,
  open,
  onOpenChange,
}: CycleFormSheetProps) {
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const isEdit = cycle !== null;
  const form = useForm<CycleFormValues>({
    resolver: zodResolver(isEdit ? cycleFormSchema : createCycleSchema),
    defaultValues: EMPTY_VALUES,
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  useEffect(() => {
    if (!open) return;
    form.reset(cycle ? {
      name: cycle.name,
      description: cycle.description ?? "",
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    } : EMPTY_VALUES);
  }, [cycle, form, open]);

  const watchedName = form.watch("name");
  const watchedDescription = form.watch("description");
  const watchedStartDate = form.watch("startDate");
  const duplicateName = watchedName.trim() !== "" && cycles.some(
    (item) => item.id !== cycle?.id && item.name.trim().toLowerCase() === watchedName.trim().toLowerCase(),
  );
  const startPickerBounds = planningStartPickerProps({ existingValue: cycle?.startDate });
  const endPickerBounds = planningEndPickerProps({
    mode: "after",
    startDate: watchedStartDate,
    existingValue: cycle?.endDate,
    enforceTodayFloor: !isEdit,
  });

  const handleStartDateChange = useCallback((value: string) => {
    form.setValue("startDate", value, { shouldDirty: true, shouldValidate: true });
    const currentEnd = form.getValues("endDate");
    const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
    if (nextEnd !== currentEnd) {
      form.setValue("endDate", nextEnd, { shouldDirty: true, shouldValidate: true });
    }
  }, [form]);

  const handleEndDateChange = useCallback((value: string) => {
    form.setValue("endDate", value, { shouldDirty: true, shouldValidate: true });
  }, [form]);

  const handleSubmit = useCallback((values: CycleFormValues) => {
    if (cycle) {
      updateCycle.mutate(
        {
          projectId,
          cycleId: cycle.id,
          name: values.name,
          description: values.description,
          startDate: values.startDate,
          endDate: values.endDate,
        },
        {
          onSuccess: () => {
            toast.success("Cycle updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }
    createCycle.mutate(
      { ...values, projectId },
      {
        onSuccess: () => {
          toast.success("Cycle created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [createCycle, cycle, onOpenChange, projectId, updateCycle]);

  const isPending = createCycle.isPending || updateCycle.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{isEdit ? "Edit Cycle" : "Create Cycle"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form id="cycle-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="px-6 py-5 space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cycle 1, Q3 Planning..." {...field} />
                    </FormControl>
                    <FormMessage />
                    {!form.formState.errors.name && duplicateName ? (
                      <p className="text-xs text-status-warning-ink" aria-live="polite">
                        A cycle with this name already exists in this project.
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Description</FormLabel>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {watchedDescription.length}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                    <FormControl>
                      <Textarea rows={3} placeholder="Optional description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={() => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={watchedStartDate}
                          onChange={handleStartDateChange}
                          placeholder="Start date"
                          fromDate={startPickerBounds.fromDate}
                          fromYear={startPickerBounds.fromYear}
                          toYear={startPickerBounds.toYear}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={handleEndDateChange}
                          placeholder="End date"
                          fromDate={endPickerBounds.fromDate}
                          fromYear={endPickerBounds.fromYear}
                          toYear={endPickerBounds.toYear}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SheetBody>
            <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={isPending}
                loadingText={isEdit ? "Saving..." : "Creating..."}
                className="flex-1"
              >
                {isEdit ? "Save Changes" : "Create Cycle"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
