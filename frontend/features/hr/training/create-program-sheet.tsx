"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { useCreateTrainingProgram } from "@/hooks/api/hr/training";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createProgramSchema,
  type CreateProgramFormValues,
} from "./create-program-schema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateProgramSheet({ open, onOpenChange }: Props) {
  const createProgram = useCreateTrainingProgram();
  const form = useForm<CreateProgramFormValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "MANDATORY",
      format: "CLASSROOM",
      startDate: "",
      endDate: "",
      venue: "",
      virtualLink: "",
      maxCapacity: "",
      isMandatory: false,
    },
  });

  const watchedStartDate = form.watch("startDate");
  const startBounds = planningStartPickerProps();
  const endBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "after",
  });

  function handleStartDateChange(value: string) {
    form.setValue("startDate", value, { shouldValidate: true });
    const currentEnd = form.getValues("endDate") ?? "";
    const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
    if (nextEnd !== currentEnd) {
      form.setValue("endDate", nextEnd, { shouldValidate: true });
    }
  }

  const onSubmit = useCallback(
    (data: CreateProgramFormValues) => {
      const maxCapacityNum = data.maxCapacity ? parseInt(data.maxCapacity, 10) : undefined;
      createProgram.mutate(
        {
          name: data.name,
          description: data.description || undefined,
          type: data.type,
          format: data.format,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          venue: data.venue || undefined,
          virtualLink: data.virtualLink || undefined,
          maxCapacity: Number.isNaN(maxCapacityNum) ? undefined : maxCapacityNum,
          isMandatory: data.isMandatory,
          status: "SCHEDULED",
        },
        {
          onSuccess: () => {
            toast.success("Training program created");
            form.reset();
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createProgram, form, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Training Program"
      description="Schedule a new training session for your team"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Create Program"
      isPending={createProgram.isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Program Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Safety & Compliance 2026" className="text-sm" {...field} />
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
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Description{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief overview of the training program"
                    className="text-sm resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Type
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANDATORY">Mandatory</SelectItem>
                      <SelectItem value="OPTIONAL">Optional</SelectItem>
                      <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Format
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CLASSROOM">Classroom</SelectItem>
                      <SelectItem value="VIRTUAL">Virtual</SelectItem>
                      <SelectItem value="BLENDED">Blended</SelectItem>
                      <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    Start Date
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ?? ""}
                      onChange={handleStartDateChange}
                      placeholder="Pick a date"
                      className="text-sm"
                      fromDate={startBounds.fromDate}
                      fromYear={startBounds.fromYear}
                      toYear={startBounds.toYear}
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
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    End Date{" "}
                    <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                      className="text-sm"
                      fromDate={endBounds.fromDate}
                      fromYear={endBounds.fromYear}
                      toYear={endBounds.toYear}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="venue"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Venue{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Conference Room A, Floor 3" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="virtualLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Virtual Link{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://meet.google.com/..." className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Max Capacity{" "}
                  <span className="normal-case font-normal text-muted-foreground tracking-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input type="number" min={1} placeholder="e.g. 30" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isMandatory"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider cursor-pointer">
                    Mandatory Attendance
                  </FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}
