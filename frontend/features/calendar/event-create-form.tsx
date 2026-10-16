"use client";

import React, { useCallback } from "react";
import { AppSheet } from "@/components/shared/app-sheet";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Ticket, Link as LinkIcon, MapPin } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { CalendarOrgMember } from "@/hooks/api/calendar";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import type { TicketSearchResult } from "@/types/projects";
import { EventFormFields } from "./event-form-fields";
import { TicketPickerDialog } from "./ticket-picker-dialog";
import type { FormState, RecurrenceState } from "./event-form-state";

type EventCreateFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  form: FormState;
  titleError: string;
  dateTimeError: string;
  showEndDate: boolean;
  members: Pick<CalendarOrgMember, "id" | "firstName" | "lastName" | "name" | "email" | "image">[];
  connections: IntegrationConnection[];
  linkedTicket: TicketSearchResult | null;
  existingEntityId: string | null;
  ticketPickerOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onLocationChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAllDayChange: (value: boolean) => void;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (value: string) => void;
  onEndTimeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSyncConnectionChange: (value: string) => void;
  onAddConferenceChange: (value: boolean) => void;
  onShowEndDate: () => void;
  onToggleAttendee: (memberId: string) => void;
  onOpenTicketPicker: () => void;
  onTicketSelect: (ticket: TicketSearchResult) => void;
  onRemoveLinkedTicket: () => void;
  onTicketPickerChange: (open: boolean) => void;
  onSave: (times: { startTime?: string; endTime?: string }) => void;
  recurrence: RecurrenceState;
  onRecurrenceChange: (next: RecurrenceState) => void;
};

export function EventCreateForm({
  open,
  onOpenChange,
  isEdit,
  form,
  titleError,
  dateTimeError,
  showEndDate,
  members,
  connections,
  linkedTicket,
  existingEntityId,
  ticketPickerOpen,
  isPending,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onLocationChange,
  onAllDayChange,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  onCategoryChange,
  onColorChange,
  onSyncConnectionChange,
  onAddConferenceChange,
  onShowEndDate,
  onToggleAttendee,
  onOpenTicketPicker,
  onTicketSelect,
  onRemoveLinkedTicket,
  onTicketPickerChange,
  onSave,
  recurrence,
  onRecurrenceChange,
}: EventCreateFormProps) {
  const formId = React.useId();
  const displayLinkedKey = linkedTicket ? `${linkedTicket.projectKey}-${linkedTicket.ticketNumber}` : existingEntityId ? `#${existingEntityId}` : null;
  const displayLinkedTitle = linkedTicket?.title ?? null;

  const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    onSave({
      ...(values.has("startTime") ? { startTime: String(values.get("startTime")) } : {}),
      ...(values.has("endTime") ? { endTime: String(values.get("endTime")) } : {}),
    });
  }, [onSave]);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Event" : "New Event"}
      className="sm:max-w-2xl"
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onClose} disabled={isPending}>Discard</Button>
          <LoadingButton form={formId} type="submit" size="sm" className="w-full" disabled={!form.title.trim()} isPending={isPending} loadingText={isEdit ? "Saving…" : "Creating…"}>Save</LoadingButton>
        </div>
      }
    >
      <form id={formId} onSubmit={handleFormSubmit} className="space-y-2">
        <EventFormFields
                title={form.title} titleError={titleError} description={form.description} allDay={form.allDay}
                startDate={form.startDate} startTime={form.startTime} endDate={form.endDate} endTime={form.endTime}
                category={form.category} color={form.color} connections={connections} syncConnectionId={form.syncConnectionId}
                addConference={form.addConference} isEdit={isEdit} showEndDate={showEndDate} dateTimeError={dateTimeError}
                onTitleChange={onTitleChange} onDescriptionChange={onDescriptionChange} onAllDayChange={onAllDayChange}
                onStartDateChange={onStartDateChange} onStartTimeChange={onStartTimeChange} onEndDateChange={onEndDateChange}
                onEndTimeChange={onEndTimeChange} onCategoryChange={onCategoryChange} onColorChange={onColorChange}
                onSyncConnectionChange={onSyncConnectionChange} onAddConferenceChange={onAddConferenceChange}
                onShowEndDate={onShowEndDate} members={members} attendeeIds={form.attendeeIds} onToggleAttendee={onToggleAttendee}
                recurrence={recurrence} onRecurrenceChange={onRecurrenceChange}
        />
        <div className="flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
          <div className="flex-1 min-w-0 space-y-1">
            <Input id="ev-location" value={form.location} onChange={onLocationChange} placeholder="Room or Location" className={cn("h-8 text-xs flex-1 min-w-0", form.locationError && "border-destructive")} />
            {form.locationError && <p className="text-micro text-destructive">{form.locationError}</p>}
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Linked work item</p>
            {displayLinkedKey ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
                <Ticket className="h-3.5 w-3.5 text-primary shrink-0" /><span className="font-mono text-dense text-primary shrink-0">{displayLinkedKey}</span>
                {displayLinkedTitle && <TruncatedText text={displayLinkedTitle} className="text-xs flex-1" />}
                <AnimatedIconButton icon={XIcon} iconSize={14} type="button" variant="ghost" size="icon" onClick={onRemoveLinkedTicket} className="h-6 w-6 shrink-0" aria-label="Remove linked ticket" />
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={onOpenTicketPicker} className="w-full justify-start border-dashed text-muted-foreground hover:text-foreground">
                <Ticket className="size-4" />
                Link a ticket…
              </Button>
            )}
          </div>
        </div>
      </form>
      <TicketPickerDialog open={ticketPickerOpen} onOpenChange={onTicketPickerChange} onSelect={onTicketSelect} />
    </AppSheet>
  );
}
