"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { MeetingAttendeePicker } from "./meeting-attendees-picker";
import { MeetingBasicFields } from "./meeting-basic-fields";
import { MeetingSchedulingFields } from "./meeting-scheduling-fields";
import { MeetingAgendaField } from "./meeting-agenda-field";
import { MeetingRecurrenceFields } from "./meeting-recurrence-fields";
import {
  meetingSchema,
  CREATE_DEFAULTS,
  getDefaultStart,
  getDefaultEnd,
  meetingToFormValues,
  type MeetingFormValues,
} from "./meeting-form-schema";
import type { MeetingTemplate } from "./new-meeting-button";
import type {
  Meeting,
  CreateMeetingInput,
  UpdateMeetingInput,
  RecurrenceRule,
  ProjectMemberRecord,
} from "@/types/projects";
import type { AgendaSource } from "./generate-agenda";

interface MeetingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Meeting;
  onSubmitCreate: (input: CreateMeetingInput) => void;
  onSubmitEdit: (input: UpdateMeetingInput) => void;
  isPending: boolean;
  projectMembers?: ProjectMemberRecord[];
  selectedTemplate?: MeetingTemplate | null;
  onGenerateAgenda?: (sources: AgendaSource[]) => string;
  hasActiveSprint?: boolean;
}

export function MeetingFormSheet({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmitCreate,
  onSubmitEdit,
  isPending,
  projectMembers = [],
  selectedTemplate,
  onGenerateAgenda,
  hasActiveSprint = false,
}: MeetingFormSheetProps) {
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [attendeeComboValue, setAttendeeComboValue] = useState("");

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  const watchScheduledAt = form.watch("scheduledAt");
  const watchDuration = form.watch("durationMinutes");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && defaultValues) {
        form.reset(meetingToFormValues(defaultValues));
        setSelectedAttendees([]);
      } else if (selectedTemplate) {
        const start = getDefaultStart();
        const end = getDefaultEnd(start, selectedTemplate.duration);
        form.reset({
          ...CREATE_DEFAULTS,
          title: selectedTemplate.label === "Ad-hoc Meeting" ? "" : selectedTemplate.label,
          type: selectedTemplate.type,
          agenda: selectedTemplate.agenda,
          durationMinutes: String(selectedTemplate.duration),
          scheduledAt: start,
          endAt: end,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setSelectedAttendees([]);
      } else {
        form.reset(CREATE_DEFAULTS);
        setSelectedAttendees([]);
      }
    }
  }, [open, mode, defaultValues, selectedTemplate, form]);

  useEffect(() => {
    if (watchScheduledAt && watchDuration) {
      const duration = parseInt(watchDuration, 10);
      if (!isNaN(duration) && duration > 0) {
        const current = form.getValues("endAt");
        if (!current) {
          form.setValue("endAt", getDefaultEnd(watchScheduledAt, duration), { shouldValidate: false });
        }
      }
    }
  }, [watchScheduledAt, watchDuration, form]);

  const handleAddAttendee = useCallback(
    (userId: string) => {
      if (!userId) return;
      setSelectedAttendees((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      setAttendeeComboValue("");
    },
    [],
  );

  const handleRemoveAttendee = useCallback((userId: string) => {
    setSelectedAttendees((prev) => prev.filter((id) => id !== userId));
  }, []);

  function handleSubmit(values: MeetingFormValues) {
    const durationMinutes = values.durationMinutes ? parseInt(values.durationMinutes, 10) : undefined;
    const scheduledAt = values.scheduledAt || undefined;
    const endAt = values.endAt || undefined;
    const agenda = values.agenda || undefined;
    const timezone = values.timezone || undefined;

    const recurrenceRule: RecurrenceRule | undefined =
      values.recurrenceEnabled
        ? {
            frequency: values.recurrenceFrequency,
            endDate: values.recurrenceEndDate || undefined,
          }
        : undefined;

    if (mode === "edit" && defaultValues) {
      onSubmitEdit({
        meetingId: defaultValues.id,
        title: values.title,
        type: values.type,
        status: values.status,
        agenda: agenda ?? null,
        scheduledAt: scheduledAt ?? null,
        endAt: endAt ?? null,
        durationMinutes: durationMinutes ?? null,
        timezone: timezone ?? null,
        recurrenceRule: recurrenceRule ?? null,
      });
    } else {
      onSubmitCreate({
        title: values.title,
        type: values.type,
        status: values.status,
        agenda,
        scheduledAt,
        endAt,
        durationMinutes: isNaN(durationMinutes ?? NaN) ? undefined : durationMinutes,
        timezone,
        recurrenceRule,
        attendeeUserIds: selectedAttendees.length > 0 ? selectedAttendees : undefined,
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{mode === "edit" ? "Edit Meeting" : "New Meeting"}</SheetTitle>
          <SheetDescription>
            {mode === "edit" ? "Update meeting details." : "Schedule a new meeting for this project."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <MeetingBasicFields />
              <MeetingSchedulingFields />
              <MeetingAgendaField
                onGenerateAgenda={onGenerateAgenda}
                hasActiveSprint={hasActiveSprint}
              />
              <MeetingRecurrenceFields />
              {mode === "create" && projectMembers.length > 0 && (
                <MeetingAttendeePicker
                  projectMembers={projectMembers}
                  selectedAttendees={selectedAttendees}
                  comboValue={attendeeComboValue}
                  onAdd={handleAddAttendee}
                  onRemove={handleRemoveAttendee}
                />
              )}
            </SheetBody>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving…">
                  {mode === "edit" ? "Save Changes" : "Create Meeting"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
