"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Meeting, CreateMeetingInput, UpdateMeetingInput } from "@/types/projects";

const meetingSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  type: z.enum(["meeting", "standup", "retro", "planning", "review"]),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  agenda: z.string(),
  scheduledAt: z.string(),
  durationMinutes: z.string(),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

const CREATE_DEFAULTS: MeetingFormValues = {
  title: "",
  type: "meeting",
  status: "scheduled",
  agenda: "",
  scheduledAt: "",
  durationMinutes: "",
};

function meetingToFormValues(m: Meeting): MeetingFormValues {
  return {
    title: m.title,
    type: m.type,
    status: m.status,
    agenda: m.agenda ?? "",
    scheduledAt: m.scheduledAt ? m.scheduledAt.slice(0, 16) : "",
    durationMinutes: m.durationMinutes != null ? String(m.durationMinutes) : "",
  };
}

interface MeetingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Meeting;
  onSubmitCreate: (input: CreateMeetingInput) => void;
  onSubmitEdit: (input: UpdateMeetingInput) => void;
  isPending: boolean;
}

export function MeetingFormSheet({
  open, onOpenChange, mode, defaultValues, onSubmitCreate, onSubmitEdit, isPending,
}: MeetingFormSheetProps) {
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(mode === "edit" && defaultValues ? meetingToFormValues(defaultValues) : CREATE_DEFAULTS);
    }
  }, [open, mode, defaultValues, form]);

  function handleSubmit(values: MeetingFormValues) {
    const durationMinutes = values.durationMinutes ? parseInt(values.durationMinutes, 10) : undefined;
    const scheduledAt = values.scheduledAt || undefined;
    const agenda = values.agenda || undefined;
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({
        id: defaultValues.id,
        title: values.title,
        type: values.type,
        status: values.status,
        agenda: agenda ?? null,
        scheduledAt: scheduledAt ?? null,
        durationMinutes: durationMinutes ?? null,
      });
    } else {
      onSubmitCreate({ title: values.title, type: values.type, status: values.status, agenda, scheduledAt, durationMinutes });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{mode === "edit" ? "Edit Meeting" : "New Meeting"}</SheetTitle>
          <SheetDescription>
            {mode === "edit" ? "Update meeting details." : "Schedule a new meeting for this project."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex-1 px-6 py-5 space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Sprint 12 Planning" className="h-8 text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="standup">Standup</SelectItem>
                        <SelectItem value="retro">Retro</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled At</FormLabel>
                    <FormControl><Input {...field} type="datetime-local" className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl><Input {...field} type="number" min="1" placeholder="30" className="h-8 text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="agenda" render={({ field }) => (
                <FormItem>
                  <FormLabel>Agenda (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={4} placeholder="Meeting agenda…" className="text-sm resize-none" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Meeting"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
