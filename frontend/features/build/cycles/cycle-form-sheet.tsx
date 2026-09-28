"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCreateCycle, useUpdateCycle } from "@/hooks/api/build/advanced";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
import { TicketConflictDialog } from "@/features/build/ticket-details/ticket-conflict-dialog";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
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
const GOAL_MAX = 500;
const CAPACITY_MAX = 100_000;

const cycleFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .transform((value) => value.trim())
      .pipe(
        z
          .string()
          .min(2, "Name must be at least 2 characters")
          .max(100, "Name must be 100 characters or fewer")
          .regex(
            /[A-Za-z0-9]/,
            "Name must contain at least one letter or number",
          ),
      ),
    description: z
      .string()
      .max(
        DESCRIPTION_MAX,
        `Description must be ${DESCRIPTION_MAX} characters or fewer`,
      ),
    goal: z
      .string()
      .max(GOAL_MAX, `Goal must be ${GOAL_MAX} characters or fewer`),
    capacity: z
      .string()
      .refine(
        (value) => value === "" || /^\d+$/.test(value),
        "Capacity must be a whole number of points",
      )
      .refine(
        (value) => value === "" || Number(value) <= CAPACITY_MAX,
        `Capacity must be ${CAPACITY_MAX} or fewer`,
      ),
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
  refineNotBeforeToday(
    data.startDate,
    context,
    "startDate",
    "Start date cannot be in the past",
  );
  refineNotBeforeToday(
    data.endDate,
    context,
    "endDate",
    "End date cannot be in the past",
  );
});

type CycleFormValues = z.infer<typeof cycleFormSchema>;

const EMPTY_VALUES: CycleFormValues = {
  name: "",
  description: "",
  goal: "",
  capacity: "",
  startDate: "",
  endDate: "",
};

function buildCycleConflictDiffs(
  formValues: CycleFormValues,
  serverCycle: Cycle,
): TicketConflictFieldDiff[] {
  const capacity =
    formValues.capacity === "" ? null : Number(formValues.capacity);
  const fmt = (v: unknown): string =>
    v === null || v === undefined || v === "" ? "—" : String(v);
  const diffs: TicketConflictFieldDiff[] = [];
  if (formValues.name !== serverCycle.name)
    diffs.push({
      key: "name",
      label: "Name",
      serverValue: fmt(serverCycle.name),
      pendingValue: fmt(formValues.name),
    });
  if (formValues.description !== (serverCycle.description ?? ""))
    diffs.push({
      key: "description",
      label: "Description",
      serverValue: fmt(serverCycle.description),
      pendingValue: fmt(formValues.description),
    });
  if (formValues.goal !== (serverCycle.goal ?? ""))
    diffs.push({
      key: "goal",
      label: "Goal",
      serverValue: fmt(serverCycle.goal),
      pendingValue: fmt(formValues.goal),
    });
  if (capacity !== serverCycle.capacity)
    diffs.push({
      key: "capacity",
      label: "Capacity",
      serverValue: fmt(serverCycle.capacity),
      pendingValue: fmt(capacity),
    });
  if (formValues.startDate !== serverCycle.startDate)
    diffs.push({
      key: "startDate",
      label: "Start date",
      serverValue: fmt(serverCycle.startDate),
      pendingValue: fmt(formValues.startDate),
    });
  if (formValues.endDate !== serverCycle.endDate)
    diffs.push({
      key: "endDate",
      label: "End date",
      serverValue: fmt(serverCycle.endDate),
      pendingValue: fmt(formValues.endDate),
    });
  return diffs;
}

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
  const queryClient = useQueryClient();
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const isEdit = cycle !== null;
  const [conflictFields, setConflictFields] = useState<
    TicketConflictFieldDiff[] | null
  >(null);
  const form = useForm<CycleFormValues>({
    resolver: zodResolver(isEdit ? cycleFormSchema : createCycleSchema),
    defaultValues: EMPTY_VALUES,
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  useEffect(() => {
    if (!open) return;
    form.reset(
      cycle
        ? {
            name: cycle.name,
            description: cycle.description ?? "",
            goal: cycle.goal ?? "",
            capacity: cycle.capacity === null ? "" : String(cycle.capacity),
            startDate: cycle.startDate,
            endDate: cycle.endDate,
          }
        : EMPTY_VALUES,
    );
  }, [cycle, form, open]);

  const watchedName = form.watch("name");
  const watchedDescription = form.watch("description");
  const watchedStartDate = form.watch("startDate");
  const duplicateName =
    watchedName.trim() !== "" &&
    cycles.some(
      (item) =>
        item.id !== cycle?.id &&
        item.name.trim().toLowerCase() === watchedName.trim().toLowerCase(),
    );
  const startPickerBounds = planningStartPickerProps({
    existingValue: cycle?.startDate,
  });
  const endPickerBounds = planningEndPickerProps({
    mode: "after",
    startDate: watchedStartDate,
    existingValue: cycle?.endDate,
    enforceTodayFloor: !isEdit,
  });

  const handleStartDateChange = useCallback(
    (value: string) => {
      form.setValue("startDate", value, {
        shouldDirty: true,
        shouldValidate: true,
      });
      const currentEnd = form.getValues("endDate");
      const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
      if (nextEnd !== currentEnd) {
        form.setValue("endDate", nextEnd, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    [form],
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      form.setValue("endDate", value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  const handleSubmit = useCallback(
    (values: CycleFormValues) => {
      const capacity = values.capacity === "" ? null : Number(values.capacity);
      if (cycle) {
        updateCycle.mutate(
          {
            projectId,
            cycleId: cycle.id,
            version: cycle.version,
            name: values.name,
            description: values.description,
            goal: values.goal || undefined,
            capacity,
            startDate: values.startDate,
            endDate: values.endDate,
          },
          {
            onSuccess: () => {
              toast.success("Cycle updated");
              onOpenChange(false);
            },
            onError: (error) => {
              if (
                isApiError(error) &&
                getApiErrorCode(error) === "PROJECTS_TICKET_CONFLICT"
              ) {
                void queryClient.invalidateQueries({
                  queryKey: buildWorkQueryKeys.projects.cycles(projectId),
                });
                const diffs = cycle
                  ? buildCycleConflictDiffs(form.getValues(), cycle)
                  : [];
                setConflictFields(
                  diffs.length > 0
                    ? diffs
                    : [
                        {
                          key: "version",
                          label: "Version",
                          serverValue: "Updated by another user",
                          pendingValue: "Your edit",
                        },
                      ],
                );
                return;
              }
              toast.error(getErrorMessage(error));
            },
          },
        );
        return;
      }
      createCycle.mutate(
        {
          projectId,
          name: values.name,
          description: values.description,
          ...(capacity === null ? {} : { capacity }),
          startDate: values.startDate,
          endDate: values.endDate,
        },
        {
          onSuccess: () => {
            toast.success("Cycle created");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [createCycle, cycle, onOpenChange, projectId, queryClient, updateCycle],
  );

  const isPending = createCycle.isPending || updateCycle.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-md p-0 flex flex-col gap-0"
        >
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>{isEdit ? "Edit Cycle" : "Create Cycle"}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              id="cycle-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <SheetBody className="px-6 py-5 space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Cycle 1, Q3 Planning..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {!form.formState.errors.name && duplicateName ? (
                        <p
                          className="text-xs text-status-warning-ink-strong"
                          aria-live="polite"
                        >
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
                        <Textarea
                          rows={3}
                          placeholder="Optional description..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isEdit ? (
                  <FormField
                    control={form.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="What should this cycle achieve?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="Story points this cycle can absorb"
                          {...field}
                        />
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
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => onOpenChange(false)}
                >
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
      <TicketConflictDialog
        open={conflictFields !== null}
        fields={conflictFields ?? []}
        onKeepMine={() => setConflictFields(null)}
        onDiscard={() => {
          setConflictFields(null);
          onOpenChange(false);
        }}
      />
    </>
  );
}
