"use client";

import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Ticket, Link as LinkIcon, MapPin } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { LoadingButton } from "@/components/ui/loading-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { CalendarListItem, CalendarOrgMember } from "@/hooks/api/calendar";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import type { TicketSearchResult } from "@/hooks/api/build";
import { EventFormFields } from "./event-form-fields";
import { TicketPickerDialog } from "./ticket-picker-dialog";
import type { FormState, RecurrenceState } from "./event-form-state";

type EventCreateFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  isEdit: boolean;
  event?: CalendarListItem | null;
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
  onDescriptionChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
  onSave: () => void;
  recurrence: RecurrenceState;
  onRecurrenceChange: (next: RecurrenceState) => void;
};

const DialogCloseButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function DialogCloseButton({ className, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return <button ref={ref} {...hoverHandlers} className={className} {...props}><XIcon ref={iconRef} size={16} /></button>;
  },
);

const RemoveTicketButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function RemoveTicketButton({ className, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return <button ref={ref} {...hoverHandlers} className={className} {...props}><XIcon ref={iconRef} size={14} /></button>;
  },
);

export function EventCreateForm({
  open,
  onOpenChange,
  isMobile,
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
  const displayLinkedKey = linkedTicket ? `${linkedTicket.projectKey}-${linkedTicket.ticketNumber}` : existingEntityId ? `#${existingEntityId}` : null;
  const displayLinkedTitle = linkedTicket?.title ?? null;

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  }, [onSave]);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
        <DrawerContent className={cn("flex flex-col gap-0 p-0 pb-0 overflow-hidden shadow-2xl border bg-card", isMobile ? "w-full max-h-[min(92dvh,48rem)] rounded-t-xl" : "h-full w-full md:w-1/2 md:max-w-2xl lg:max-w-3xl")}>
          <DrawerHeader className="px-4 py-2.5 border-b flex flex-row items-center justify-between shrink-0 select-none">
            <DrawerTitle className="text-base font-semibold text-foreground">{isEdit ? "Edit Event" : "New Event"}</DrawerTitle>
            <DialogCloseButton type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors" title="Close" aria-label="Close" />
          </DrawerHeader>
          <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 py-2 space-y-2">
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
                      <RemoveTicketButton type="button" onClick={onRemoveLinkedTicket} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0" aria-label="Remove linked ticket" />
                    </div>
                  ) : (
                    <button type="button" onClick={onOpenTicketPicker} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg px-3 py-1.5 w-full transition-colors hover:border-primary/50"><Ticket className="h-3.5 w-3.5" />Link a ticket…</button>
                  )}
                </div>
              </div>
            </ScrollArea>
            <div className="px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="text-xs px-3 font-normal text-muted-foreground hover:text-foreground" onClick={onClose} disabled={isPending}>Discard</Button>
              <LoadingButton type="submit" size="sm" className="text-xs px-4 font-medium" disabled={!form.title.trim()} isPending={isPending} loadingText={isEdit ? "Saving…" : "Creating…"}>Save</LoadingButton>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
      <TicketPickerDialog open={ticketPickerOpen} onOpenChange={onTicketPickerChange} onSelect={onTicketSelect} />
    </>
  );
}
