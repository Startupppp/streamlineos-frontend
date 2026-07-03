"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, addHours, differenceInMinutes } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useCalendarOrgMembers,
  useGoogleMeetStatus,
  useCreateMeetLink,
  useEventAttendees,
  extractEventNumericId,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { EventAttendeesPicker } from "@/features/calendar/event-attendees-picker";

const NO_ENTITY_TYPE = "none";

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

const COLOR_OPTIONS = [
  { value: "blue" as const },
  { value: "green" as const },
  { value: "red" as const },
  { value: "yellow" as const },
  { value: "purple" as const },
];

const COLOR_BG_CLASSES: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-amber-500",
  purple: "bg-purple-500",
};

const COLOR_RING_CLASSES: Record<string, string> = {
  blue: "ring-blue-500",
  green: "ring-green-500",
  red: "ring-red-500",
  yellow: "ring-yellow-500",
  purple: "ring-purple-500",
};

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
  const shouldReduceMotion = useReducedMotion();

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
  const { data: meetStatus } = useGoogleMeetStatus();
  const createMeetLink = useCreateMeetLink();
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

  const handleGenerateMeetLink = useCallback(async () => {
    try {
      const result = await createMeetLink.mutateAsync();
      form.setValue("location", result.meetLink);
    } catch {
      toast.error("Failed to generate Meet link");
    }
  }, [createMeetLink, form]);

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
    } catch {
      toast.error(isEdit ? "Failed to update meeting" : "Failed to create meeting");
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

        <ScrollArea className="flex-1 min-h-0">
          <form id="crm-event-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[13px] font-medium text-foreground">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Meeting title"
                {...form.register("title")}
                className={cn(
                  "h-9",
                  form.formState.errors.title && "border-destructive focus-visible:ring-destructive",
                )}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-foreground">Category</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">All Day</p>
                <p className="text-xs text-muted-foreground">Event spans the entire day</p>
              </div>
              <Controller
                control={form.control}
                name="allDay"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-[13px] font-medium text-foreground">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("startDate")}
                  className={cn(
                    "h-9",
                    form.formState.errors.startDate && "border-destructive",
                  )}
                />
                {form.formState.errors.startDate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
              </div>
              {!allDay && (
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-[13px] font-medium text-foreground">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...form.register("startTime")}
                    className="h-9"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-[13px] font-medium text-foreground">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                  className={cn(
                    "h-9",
                    form.formState.errors.endDate && "border-destructive",
                  )}
                />
                {form.formState.errors.endDate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.endDate.message}
                  </p>
                )}
              </div>
              {!allDay && (
                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-[13px] font-medium text-foreground">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...form.register("endTime")}
                    className="h-9"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-[13px] font-medium text-foreground">
                Location
              </Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  placeholder="Add location or meeting link"
                  {...form.register("location")}
                  className="h-9 flex-1"
                />
                {meetStatus?.connected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateMeetLink}
                    disabled={createMeetLink.isPending}
                    className="h-9 shrink-0 gap-1.5 text-xs"
                  >
                    {createMeetLink.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Video className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    Meet
                  </Button>
                )}
                {!meetStatus?.connected && meetStatus?.authUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-9 shrink-0 gap-1.5 text-xs"
                  >
                    <a href={meetStatus.authUrl} target="_blank" rel="noopener noreferrer">
                      <Video className="h-3.5 w-3.5" />
                      Connect
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[13px] font-medium text-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Add a description..."
                rows={3}
                {...form.register("description")}
                className="resize-none text-sm"
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground">Color</Label>
              <div className="flex gap-2.5">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    data-color={color.value}
                    onClick={handleColorButtonClick}
                    className={cn(
                      "h-7 w-7 rounded-full transition-all duration-150",
                      COLOR_BG_CLASSES[color.value],
                      watchedColor === color.value &&
                        `ring-2 ring-offset-1 ${COLOR_RING_CLASSES[color.value]}`,
                    )}
                    aria-label={`Select ${color.value} color`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/40 px-4 py-4">
              <p className="text-[13px] font-medium text-foreground">CRM Entity</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Entity Type</Label>
                <Controller
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 bg-card">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ENTITY_TYPE}>None</SelectItem>
                        <SelectItem value="LEAD">Lead</SelectItem>
                        <SelectItem value="DEAL">Deal</SelectItem>
                        <SelectItem value="CONTACT">Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {watchedEntityType && watchedEntityType !== NO_ENTITY_TYPE && (
                <div className="space-y-1.5">
                  <Label htmlFor="entityId" className="text-xs text-muted-foreground">
                    Entity ID
                  </Label>
                  <Input
                    id="entityId"
                    placeholder="Enter entity ID"
                    {...form.register("entityId")}
                    className="h-9 bg-card"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground">Attendees</Label>
              <EventAttendeesPicker
                members={members}
                selectedIds={watchedAttendeeIds}
                onToggle={handleToggleAttendee}
              />
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="shrink-0 px-6 py-4 border-t flex flex-row gap-2 justify-end">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}>
            <Button type="submit" form="crm-event-form" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Meeting"}
            </Button>
          </motion.div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
