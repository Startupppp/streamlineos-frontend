"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateCycle, useUpdateCycle } from "@/hooks/api/build/cycles";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
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
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Cycle } from "@/types/projects";
import {
  cycleFormSchema,
  createCycleSchema,
  type CycleFormValues,
  EMPTY_CYCLE_FORM_VALUES,
  buildCycleConflictDiffs,
} from "./cycle-form-schema";
import { CycleFormFields } from "./cycle-form-fields";

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
  const isOnline = useOnlineStatus();
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const isEdit = cycle !== null;
  const [conflictFields, setConflictFields] = useState<
    TicketConflictFieldDiff[] | null
  >(null);
  const form = useForm<CycleFormValues>({
    resolver: zodResolver(isEdit ? cycleFormSchema : createCycleSchema),
    defaultValues: EMPTY_CYCLE_FORM_VALUES,
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
        : EMPTY_CYCLE_FORM_VALUES,
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
      if (!isOnline) {
        toast.warning(
          "You're offline — your draft is kept here and nothing was sent.",
        );
        return;
      }
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
    [createCycle, cycle, isOnline, onOpenChange, projectId, queryClient, updateCycle],
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
                <CycleFormFields
                  form={form}
                  isEdit={isEdit}
                  watchedDescription={watchedDescription}
                  watchedStartDate={watchedStartDate}
                  duplicateName={duplicateName}
                  startPickerBounds={startPickerBounds}
                  endPickerBounds={endPickerBounds}
                  handleStartDateChange={handleStartDateChange}
                  handleEndDateChange={handleEndDateChange}
                />
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
