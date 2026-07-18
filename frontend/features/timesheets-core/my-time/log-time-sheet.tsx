"use client";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppSheet } from "@/components/shared/app-sheet";
import { ProjectTicketSelect } from "./project-ticket-select";
import {
  useCreateTimesheetEntry,
  useUpdateTimesheetEntry,
} from "@/hooks/api/timesheets-core";
import type { TimesheetEntry } from "@/features/timesheets-core";

const logTimeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z
    .string()
    .min(1, "Hours is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid number (e.g. 1.5)"),
  projectId: z.number().nullable(),
  ticketId: z.number().nullable(),
  description: z.string(),
  isBillable: z.boolean(),
});

type LogTimeValues = z.infer<typeof logTimeSchema>;

export interface LogTimeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultProjectId?: number | null;
  defaultTicketId?: number | null;
  entry?: TimesheetEntry;
}

export function LogTimeSheet({
  open,
  onOpenChange,
  defaultDate,
  defaultProjectId = null,
  defaultTicketId = null,
  entry,
}: LogTimeSheetProps) {
  const isEdit = !!entry;
  const createEntry = useCreateTimesheetEntry();
  const updateEntry = useUpdateTimesheetEntry();

  const defaultValues = useMemo<LogTimeValues>(
    () => ({
      date: entry?.date ?? defaultDate ?? format(new Date(), "yyyy-MM-dd"),
      hours: entry?.hours ?? "",
      projectId: entry?.projectId ?? defaultProjectId,
      ticketId: entry?.ticketId ?? defaultTicketId,
      description: entry?.description ?? "",
      isBillable: entry?.isBillable ?? true,
    }),
    [entry, defaultDate, defaultProjectId, defaultTicketId],
  );

  const form = useForm<LogTimeValues>({
    resolver: zodResolver(logTimeSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, form, defaultValues]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleProjectChange = useCallback(
    (id: number | null) => form.setValue("projectId", id),
    [form],
  );

  const handleTicketChange = useCallback(
    (id: number | null) => form.setValue("ticketId", id),
    [form],
  );

  const handleFormSubmit = useCallback(
    (values: LogTimeValues) => {
      const hours = Number(values.hours);
      if (isEdit && entry) {
        updateEntry.mutate(
          {
            entryId: entry.id,
            data: {
              hours,
              description: values.description || undefined,
              isBillable: values.isBillable,
            },
          },
          { onSuccess: handleClose },
        );
      } else {
        createEntry.mutate(
          {
            date: values.date,
            hours,
            projectId: values.projectId ?? undefined,
            ticketId: values.ticketId ?? undefined,
            description: values.description || undefined,
            isBillable: values.isBillable,
            source: "MANUAL",
          },
          { onSuccess: handleClose },
        );
      }
    },
    [isEdit, entry, createEntry, updateEntry, handleClose],
  );

  const isPending = createEntry.isPending || updateEntry.isPending;
  const handleSubmitClick = form.handleSubmit(handleFormSubmit);

  const footer = (
    <>
      <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
        Cancel
      </Button>
      <LoadingButton size="sm" onClick={handleSubmitClick} isPending={isPending} loadingText="Saving…">
        {isEdit ? "Save changes" : "Log time"}
      </LoadingButton>
    </>
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit time entry" : "Log time"}
      footer={footer}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-9 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.25"
                    step="0.25"
                    placeholder="0.0"
                    {...field}
                    className="h-9 text-sm"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel className="text-xs">Project &amp; Ticket</FormLabel>
            <ProjectTicketSelect
              projectId={form.watch("projectId")}
              ticketId={form.watch("ticketId")}
              onProjectChange={handleProjectChange}
              onTicketChange={handleTicketChange}
            />
          </FormItem>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="What did you work on?"
                    {...field}
                    className="h-9 text-sm"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isBillable"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-xs !mt-0 cursor-pointer">Billable</FormLabel>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </AppSheet>
  );
}
