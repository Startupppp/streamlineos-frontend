"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, addHours, differenceInMinutes } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useCalendarOrgMembers,
  useEventAttendees,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { EventAttendeesPicker } from "@/features/calendar/event-attendees-picker";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CrmEventFormFields,
  NO_ENTITY_TYPE,
  type CrmEventFieldValues,
} from "./crm-event-form-fields";

const eventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  location: z.string().max(500, "Location too long").optional(),
  allDay: z.boolean(),
  startDate: z.string().min(1, "Start date required"),
  startTime: z.string().optional(),
  endDate: z.string().min(1, "End date required"),
  endTime: z.string().optional(),
  category: z.enum(["meeting", "call", "demo", "general", "other"]),
  color: z.enum(["blue", "green", "red", "yellow", "purple"]),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT", "", "none"]).optional(),
  entityId: z.string().optional(),
  attendeeIds: z.array(z.string()),
});

type EventFormValues = z.infer<typeof eventSchema>;

function buildDefaults(date?: Date | null): EventFormValues {
  const start = date ?? new Date();
  const end = addHours(start, 1);
  return {
    title: "",
    description: "",
    location: "",
    allDay: false,
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    category: "meeting",
    color: "blue",
    entityType: NO_ENTITY_TYPE,
    entityId: "",
    attendeeIds: [],
  };
}

function buildEditValues(event: CalendarListItem): EventFormValues {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    allDay: event.allDay ?? false,
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    category: (event.category as EventFormValues["category"]) ?? "meeting",
    color: (event.color as EventFormValues["color"]) ?? "blue",
    entityType: (event.entityType as EventFormValues["entityType"]) ?? NO_ENTITY_TYPE,
    entityId: event.entityId ?? "",
    attendeeIds: [],
  };
}

interface CrmEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  event?: CalendarListItem | null;
}

export function CrmEventDialog({
  open,
  onOpenChange,
  defaultDate,
  event,
}: CrmEventDialogProps) {
  const isEdit = !!event;

  const numericId = useMemo(
    () => (isEdit && event?.id ? extractEventNumericId(event.id) : null),
    [isEdit, event?.id],
  );

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: buildDefaults(defaultDate),
  });

  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const { data: members = [] } = useCalendarOrgMembers();
  const { data: existingAttendees } = useEventAttendees(
    isEdit && open ? numericId : null,
  );

  const allDay = form.watch("allDay");
  const watchedAttendeeIds = form.watch("attendeeIds");
  const watchedEntityType = form.watch("entityType");
  const watchedColor = form.watch("color");

  useEffect(() => {
    if (open) {
      if (isEdit && event) {
        form.reset(buildEditValues(event));
      } else {
        form.reset(buildDefaults(defaultDate));
      }
    }
  }, [open, defaultDate, event, isEdit, form]);

  useEffect(() => {
    if (open && isEdit && existingAttendees && existingAttendees.length > 0) {
      const ids = existingAttendees
        .map((a) => a.user?.id)
        .filter((id): id is string => !!id);
      form.setValue("attendeeIds", ids);
    }
  }, [open, isEdit, existingAttendees, form]);

  useEffect(() => {
    if (!watchedEntityType || watchedEntityType === NO_ENTITY_TYPE) {
      form.setValue("entityId", "");
    }
  }, [watchedEntityType, form]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleColorButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const color = e.currentTarget.dataset.color as EventFormValues["color"] | undefined;
      if (color) form.setValue("color", color);
    },
    [form],
  );

  const handleToggleAttendee = useCallback(
    (id: string) => {
      const current = form.getValues("attendeeIds");
      const updated = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      form.setValue("attendeeIds", updated);
    },
    [form],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    const startISO = values.allDay
      ? parseISO(`${values.startDate}T12:00:00`)
      : parseISO(`${values.startDate}T${values.startTime}`);
    const endISO = values.allDay
      ? parseISO(`${values.endDate}T12:00:00`)
      : parseISO(`${values.endDate}T${values.endTime}`);

    if (endISO <= startISO) {
      toast.error("End time must be after start time");
      return;
    }
    if (!values.allDay && differenceInMinutes(endISO, startISO) < 15) {
      toast.error("Event duration must be at least 15 minutes");
      return;
    }

    const payload = {
      title: values.title.trim(),
      description: values.description || undefined,
      location: values.location || undefined,
      startDate: startISO.toISOString(),
      endDate: endISO.toISOString(),
      allDay: values.allDay,
      color: values.color,
      category: values.category,
      entityType:
        values.entityType && values.entityType !== NO_ENTITY_TYPE
          ? values.entityType
          : undefined,
      entityId: values.entityId || undefined,
      attendeeIds: values.attendeeIds,
    };

    try {
      if (isEdit && numericId !== null) {
        await updateEvent.mutateAsync({ id: numericId, ...payload });
        toast.success("Meeting updated");
      } else {
        await createEvent.mutateAsync(payload);
        toast.success("Meeting created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  const isPending = createEvent.isPending || updateEvent.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0 w-full sm:max-w-[520px]"
      >
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Meeting" : "New Meeting"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <form id="crm-event-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <CrmEventFormFields
              control={form.control}
              register={form.register}
              errors={form.formState.errors}
              allDay={allDay}
              watchedColor={watchedColor}
              watchedEntityType={watchedEntityType}
              onColorClick={handleColorButtonClick}
            />

            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground">Attendees</Label>
              <EventAttendeesPicker
                members={members}
                selectedIds={watchedAttendeeIds}
                onToggle={handleToggleAttendee}
              />
            </div>
          </form>
        </div>

        <SheetFooter className="shrink-0 px-6 py-4 border-t flex flex-row gap-2 justify-end">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="crm-event-form"
            isPending={isPending}
            loadingText={isEdit ? "Saving..." : "Creating..."}
          >
            {isEdit ? "Save Changes" : "Create Meeting"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
