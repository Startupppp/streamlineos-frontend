"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import {
  usePayrollCalendar,
  useGenerateCalendarMonth,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from "@/hooks/api/payroll/calendar";
import type { PayrollCalendarEvent } from "@/types/payroll/reports";

interface CalendarManagerProps {
  month: string;
}

const EVENT_TYPES = [
  { value: "ATTENDANCE_CUTOFF", label: "Attendance Cutoff" },
  { value: "REIMBURSEMENT_CUTOFF", label: "Reimbursement Cutoff" },
  { value: "TAX_DECLARATION_CUTOFF", label: "Tax Declaration Cutoff" },
  { value: "PAYROLL_PREVIEW", label: "Payroll Preview" },
  { value: "APPROVAL_DEADLINE", label: "Approval Deadline" },
  { value: "PAYMENT_DATE", label: "Payment Date" },
  { value: "PAYSLIP_PUBLISH", label: "Payslip Publish" },
];

const EVENT_STATUS_CLASS: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  due: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
};

const eventSchema = z.object({
  type: z.string().min(1, "Type is required"),
  date: z.string().min(1, "Date is required"),
  title: z.string().min(1, "Title is required"),
  month: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

function getDateRange(selectedMonth: string): { from: string; to: string } {
  const parts = selectedMonth.split("-");
  const year = parseInt(parts[0] ?? "2025", 10);
  const mon = parseInt(parts[1] ?? "1", 10);
  const startDate = new Date(year, mon - 1 - 3, 1);
  const endDate = new Date(year, mon - 1 + 4, 0);
  return {
    from: startDate.toISOString().slice(0, 10),
    to: endDate.toISOString().slice(0, 10),
  };
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface EventFormProps {
  editing: PayrollCalendarEvent | null;
  defaultMonth: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function EventForm({ editing, defaultMonth, onSuccess, onCancel }: EventFormProps) {
  const create = useCreateCalendarEvent();
  const update = useUpdateCalendarEvent();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: editing?.type ?? "",
      date: editing?.date ?? "",
      title: editing?.title ?? "",
      month: editing?.month ?? defaultMonth,
    },
  });

  function onSubmit(values: EventFormValues) {
    const input = {
      type: values.type,
      date: values.date,
      title: values.title,
      month: values.month || undefined,
    };

    if (editing) {
      update.mutate(
        { eventId: editing.id, ...input },
        {
          onSuccess: () => { toast.success("Event updated"); onSuccess(); },
          onError: () => toast.error("Failed to update event"),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => { toast.success("Event created"); onSuccess(); form.reset(); },
        onError: () => toast.error("Failed to create event"),
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Event Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} className="h-8 text-xs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Title</FormLabel>
              <FormControl>
                <Input {...field} className="h-8 text-xs" placeholder="Event title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="month"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Month (YYYY-MM, optional)</FormLabel>
              <FormControl>
                <Input {...field} className="h-8 text-xs" placeholder="e.g. 2025-04" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            size="sm"
            className="h-7 text-xs"
            disabled={create.isPending || update.isPending}
          >
            {editing ? "Update" : "Add Event"}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function CalendarManager({ month }: CalendarManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PayrollCalendarEvent | null>(null);

  const range = useMemo(() => getDateRange(month), [month]);
  const { data: events = [], isLoading } = usePayrollCalendar(range);
  const generate = useGenerateCalendarMonth();
  const deleteEvent = useDeleteCalendarEvent();

  function handleGenerate() {
    generate.mutate(
      { month },
      {
        onSuccess: () => toast.success("Calendar generated for " + month),
        onError: () => toast.error("Failed to generate calendar"),
      },
    );
  }

  function handleEdit(event: PayrollCalendarEvent) {
    setEditingEvent(event);
    setShowForm(true);
  }

  function handleDelete(eventId: number) {
    deleteEvent.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Event deleted"),
        onError: () => toast.error("Failed to delete event"),
      },
    );
  }

  function handleAddNew() {
    setEditingEvent(null);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setEditingEvent(null);
    setShowForm(false);
  }

  function handleFormCancel() {
    setEditingEvent(null);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground">Payroll Calendar</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleGenerate}
            disabled={generate.isPending}
          >
            Generate Calendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleAddNew}
          >
            <Plus className="h-3 w-3" />
            Add Event
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-md border border-border p-3 bg-muted/30">
          <p className="text-[11px] font-medium text-foreground mb-3">
            {editingEvent ? "Edit Event" : "New Event"}
          </p>
          <EventForm
            editing={editingEvent}
            defaultMonth={month}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-[12px] text-muted-foreground py-4 text-center">Loading events…</div>
      ) : events.length === 0 ? (
        <EmptyState
          compact
          illustration={<EmptyCalendarIllustration />}
          title="No calendar events"
          description='Click "Generate Calendar" to auto-create events for this month.'
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-medium truncate">{event.title}</span>
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                      EVENT_STATUS_CLASS[event.status] ?? "bg-slate-100 text-slate-600 border-slate-200",
                    )}
                  >
                    {event.status}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {formatEventDate(event.date)} · {event.type.replace(/_/g, " ")}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleEdit(event)}
                  aria-label="Edit event"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(event.id)}
                  aria-label="Delete event"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
