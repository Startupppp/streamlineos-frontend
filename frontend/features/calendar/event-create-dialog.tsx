"use client";

import type { CalendarListItem } from "@/hooks/api/calendar";
import { useEventCreateDialog } from "./use-event-create-dialog";
import { EventCreateForm } from "./event-create-form";
import { EventSeriesScopeDialog } from "./event-series-scope-dialog";

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSlot?: { start: Date; end: Date } | null;
  event?: CalendarListItem | null;
}

export function EventCreateDialog({
  open,
  onOpenChange,
  defaultSlot,
  event,
}: EventCreateDialogProps) {
  const {
    form,
    titleError,
    dateTimeError,
    showEndDate,
    members,
    connections,
    linkedTicket,
    existingEntityId,
    ticketPickerOpen,
    setTicketPickerOpen,
    isPending,
    isMobile,
    isEdit,
    seriesScopeOpen,
    seriesPending,
    handleClose,
    handleTitleChange,
    handleDescriptionChange,
    handleLocationChange,
    handleAllDayChange,
    handleStartDateChange,
    handleStartTimeChange,
    handleEndDateChange,
    handleEndTimeChange,
    handleCategoryChange,
    handleColorChange,
    handleSyncConnectionChange,
    handleAddConferenceChange,
    handleShowEndDate,
    toggleAttendee,
    handleOpenTicketPicker,
    handleTicketSelect,
    handleRemoveLinkedTicket,
    handleSave,
    handleRecurrenceChange,
    handleSeriesScopeConfirm,
    handleSeriesScopeOpenChange,
  } = useEventCreateDialog({ open, onOpenChange, defaultSlot, event });

  return (
    <>
      <EventCreateForm
        open={open}
        onOpenChange={onOpenChange}
        isMobile={isMobile}
        isEdit={isEdit}
        form={form}
        titleError={titleError}
        dateTimeError={dateTimeError}
        showEndDate={showEndDate}
        members={members}
        connections={connections}
        linkedTicket={linkedTicket}
        existingEntityId={existingEntityId}
        ticketPickerOpen={ticketPickerOpen}
        isPending={isPending}
        onClose={handleClose}
        onTitleChange={handleTitleChange}
        onDescriptionChange={handleDescriptionChange}
        onLocationChange={handleLocationChange}
        onAllDayChange={handleAllDayChange}
        onStartDateChange={handleStartDateChange}
        onStartTimeChange={handleStartTimeChange}
        onEndDateChange={handleEndDateChange}
        onEndTimeChange={handleEndTimeChange}
        onCategoryChange={handleCategoryChange}
        onColorChange={handleColorChange}
        onSyncConnectionChange={handleSyncConnectionChange}
        onAddConferenceChange={handleAddConferenceChange}
        onShowEndDate={handleShowEndDate}
        onToggleAttendee={toggleAttendee}
        onOpenTicketPicker={handleOpenTicketPicker}
        onTicketSelect={handleTicketSelect}
        onRemoveLinkedTicket={handleRemoveLinkedTicket}
        onTicketPickerChange={setTicketPickerOpen}
        onSave={handleSave}
        recurrence={form.recurrence}
        onRecurrenceChange={handleRecurrenceChange}
      />
      <EventSeriesScopeDialog
        open={seriesScopeOpen}
        onOpenChange={handleSeriesScopeOpenChange}
        onConfirm={handleSeriesScopeConfirm}
        isPending={seriesPending}
      />
    </>
  );
}
