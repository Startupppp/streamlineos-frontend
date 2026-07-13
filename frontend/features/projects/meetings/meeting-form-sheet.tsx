"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Combobox } from "@/components/ui/combobox";
import { Sparkles, ChevronDown } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import type {
  Meeting,
  MeetingType,
  CreateMeetingInput,
  UpdateMeetingInput,
  RecurrenceRule,
  ProjectMemberRecord,
} from "@/types/projects";
import type { AgendaSource } from "./generate-agenda";

const SYMBOL_ONLY_RE = /^[^a-zA-Z0-9]+$/;

const meetingSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be 200 characters or fewer")
      .transform((v) => v.trim())
      .refine((v) => v.length > 0, "Title cannot be blank or whitespace only")
      .refine((v) => !SYMBOL_ONLY_RE.test(v), "Title must contain at least one letter or number"),
    type: z.enum(["meeting", "standup", "retro", "planning", "review"] as const),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"] as const),
    agenda: z.string(),
    scheduledAt: z.string(),
    endAt: z.string(),
    durationMinutes: z.string(),
    timezone: z.string(),
    recurrenceEnabled: z.boolean(),
    recurrenceFrequency: z.enum(["daily", "weekly", "biweekly", "custom"] as const),
    recurrenceEndDate: z.string(),
  })
  .refine(
    (data) => {
      if (data.scheduledAt && data.endAt) {
        return new Date(data.endAt) > new Date(data.scheduledAt);
      }
      return true;
    },
    { message: "End time must be after start time", path: ["endAt"] },
  )
  .refine(
    (data) => {
      if (data.scheduledAt) {
        return new Date(data.scheduledAt) >= new Date(Date.now() - 60_000);
      }
      return true;
    },
    { message: "Meeting cannot be scheduled in the past", path: ["scheduledAt"] },
  );

type MeetingFormValues = z.infer<typeof meetingSchema>;

interface MeetingTemplate {
  type: MeetingType;
  label: string;
  duration: number;
  agenda: string;
}

function getDefaultStart(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5, 0, 0);
  return d.toISOString().slice(0, 16);
}

function getDefaultEnd(startStr: string, durationMin: number): string {
  if (!startStr) return "";
  const d = new Date(startStr);
  d.setMinutes(d.getMinutes() + durationMin);
  return d.toISOString().slice(0, 16);
}

const CREATE_DEFAULTS: MeetingFormValues = {
  title: "",
  type: "meeting",
  status: "scheduled",
  agenda: "",
  scheduledAt: "",
  endAt: "",
  durationMinutes: "30",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  recurrenceEnabled: false,
  recurrenceFrequency: "weekly",
  recurrenceEndDate: "",
};

function meetingToFormValues(m: Meeting): MeetingFormValues {
  return {
    title: m.title,
    type: m.type,
    status: m.status,
    agenda: m.agenda ?? "",
    scheduledAt: m.scheduledAt ? m.scheduledAt.slice(0, 16) : "",
    endAt: m.endAt ? m.endAt.slice(0, 16) : "",
    durationMinutes: m.durationMinutes != null ? String(m.durationMinutes) : "",
    timezone: m.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrenceEnabled: !!m.recurrenceRule,
    recurrenceFrequency: m.recurrenceRule?.frequency ?? "weekly",
    recurrenceEndDate: m.recurrenceRule?.endDate ?? "",
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

  const availableMembers = useMemo(
    () => projectMembers.filter((m) => !selectedAttendees.includes(m.id)),
    [projectMembers, selectedAttendees],
  );

  const comboboxOptions = useMemo(
    () =>
      availableMembers.map((m) => ({
        value: m.id,
        label: getUserDisplayName(m),
        sublabel: m.email,
      })),
    [availableMembers],
  );

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
        id: defaultValues.id,
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

  const recurrenceEnabled = form.watch("recurrenceEnabled");
  const tz = form.watch("timezone");

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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex-1 px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Sprint 12 Planning" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        </FormControl>
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
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" placeholder="30" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="UTC" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {tz && (
                <p className="text-[11px] text-muted-foreground -mt-2">
                  Timezone: <span className="font-medium">{tz}</span>
                </p>
              )}

              <FormField
                control={form.control}
                name="agenda"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Agenda (optional)</FormLabel>
                      {onGenerateAgenda && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] gap-1 text-primary hover:text-primary/80 px-2"
                            >
                              <Sparkles className="h-3 w-3" />
                              Generate
                              <ChevronDown className="h-2.5 w-2.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            {hasActiveSprint && (
                              <DropdownMenuItem
                                onClick={() => field.onChange(onGenerateAgenda(["sprint"]))}
                              >
                                From current sprint tickets
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => field.onChange(onGenerateAgenda(["overdue"]))}
                            >
                              Overdue tickets
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => field.onChange(onGenerateAgenda(["blocked"]))}
                            >
                              Blocked tickets
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => field.onChange(onGenerateAgenda(["recently_completed"]))}
                            >
                              Recently completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                field.onChange(
                                  onGenerateAgenda([
                                    ...(hasActiveSprint ? (["sprint"] as AgendaSource[]) : []),
                                    "overdue",
                                    "blocked",
                                    "open_action_items",
                                  ]),
                                )
                              }
                            >
                              All sources
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="Meeting agenda…" className="text-sm resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurrence-toggle"
                    checked={recurrenceEnabled}
                    onChange={(e) => form.setValue("recurrenceEnabled", e.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="recurrence-toggle" className="text-sm font-medium cursor-pointer">
                    Recurring meeting
                  </label>
                </div>

                {recurrenceEnabled && (
                  <div className="pl-5 space-y-3">
                    <FormField
                      control={form.control}
                      name="recurrenceFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Repeat</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Biweekly</SelectItem>
                              <SelectItem value="custom">Custom weekday</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recurrenceEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">End date (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="h-8 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {mode === "create" && projectMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attendees (optional)</p>

                  {selectedAttendees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAttendees.map((userId) => {
                        const member = projectMembers.find((m) => m.id === userId);
                        return (
                          <Badge key={userId} variant="secondary" className="gap-1.5 pl-0.5 pr-1.5 py-0.5">
                            <Avatar className="h-4 w-4 shrink-0">
                              <AvatarImage src={resolveImageUrl(member?.image)} />
                              <AvatarFallback className="text-[7px]">
                                {getUserInitials(member)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] truncate max-w-[120px]">
                              {getUserDisplayName(member)}
                            </span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive ml-0.5"
                              onClick={() => handleRemoveAttendee(userId)}
                              aria-label={`Remove ${getUserDisplayName(member)}`}
                            >
                              <span className="text-xs font-bold">&times;</span>
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {availableMembers.length > 0 && (
                    <Combobox
                      options={comboboxOptions}
                      value={attendeeComboValue}
                      onChange={handleAddAttendee}
                      placeholder="+ Add attendee…"
                      searchPlaceholder="Search members…"
                      emptyText="No members available."
                      className="h-8 w-full text-xs bg-card border-border"
                    />
                  )}
                </div>
              )}
            </div>
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
