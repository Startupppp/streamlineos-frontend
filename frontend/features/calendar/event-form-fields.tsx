"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tag, Clock, Lock, FileText, Video, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import type { CalendarOrgMember } from "@/hooks/api/calendar";
import { EventAttendeesPicker } from "./event-attendees-picker";
import { CalendarConnectInline } from "./calendar-connect-inline";
import { EVENT_COLORS, EVENT_CATEGORIES } from "./calendar-event-constants";
import type { EventCategory, RecurrenceState } from "./event-form-state";
import { RecurrenceEditor } from "./event-recurrence-editor";

interface EventFormFieldsProps {
  title: string;
  titleError?: string;
  description: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  category: EventCategory;
  color: string;
  connections: IntegrationConnection[];
  syncConnectionId: string;
  addConference: boolean;
  isEdit: boolean;
  showEndDate: boolean;
  dateTimeError: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAllDayChange: (v: boolean) => void;
  onStartDateChange: (v: string) => void;
  onStartTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (v: string) => void;
  onEndTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSyncConnectionChange: (v: string) => void;
  onAddConferenceChange: (v: boolean) => void;
  onShowEndDate: () => void;
  recurrence: RecurrenceState;
  onRecurrenceChange: (next: RecurrenceState) => void;
  members: Pick<
    CalendarOrgMember,
    "id" | "firstName" | "lastName" | "name" | "email" | "image"
  >[];
  attendeeIds: string[];
  onToggleAttendee: (id: string) => void;
}

export function EventFormFields({
  title,
  titleError,
  description,
  allDay,
  startDate,
  startTime,
  endDate,
  endTime,
  category,
  color,
  connections,
  syncConnectionId,
  addConference,
  isEdit,
  showEndDate,
  dateTimeError,
  onTitleChange,
  onDescriptionChange,
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
  recurrence,
  onRecurrenceChange,
  members,
  attendeeIds,
  onToggleAttendee,
}: EventFormFieldsProps) {
  const activeConnections = connections.filter((c) => c.status === "active");
  const selectedToolkit = activeConnections.find((c) => String(c.id) === syncConnectionId)?.toolkit;
  const startBounds = planningStartPickerProps({
    existingValue: isEdit ? startDate : undefined,
  });
  const endBounds = planningEndPickerProps({
    startDate,
    mode: "onOrAfter",
    existingValue: isEdit ? endDate : undefined,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5">
        <Tag className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
        <div className="flex-1 space-y-1">
          <Input
            id="ev-title"
            value={title}
            onChange={onTitleChange}
            placeholder="Add Title"
            className={cn(
              "text-sm border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/60 font-medium",
              titleError && "border-destructive",
            )}
            autoFocus
            aria-required
          />
          {titleError && (
            <p className="text-micro text-destructive">{titleError}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-start gap-2.5">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                value={startDate}
                onChange={onStartDateChange}
                placeholder="Start date"
                dateFormat="MMM d, yyyy"
                className="min-w-0 flex-1 text-xs"
                fromDate={startBounds.fromDate}
                fromYear={startBounds.fromYear}
                toYear={startBounds.toYear}
              />
              {!allDay && (
                <Input
                  type="time"
                  className="w-[5.5rem] min-w-[5.5rem] shrink-0 text-xs"
                  value={startTime}
                  onChange={onStartTimeChange}
                />
              )}
              {!showEndDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={onShowEndDate}
                  aria-label="Add end date"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
              {showEndDate && (
                <DatePicker
                  value={endDate}
                  onChange={onEndDateChange}
                  fromDate={endBounds.fromDate}
                  fromYear={endBounds.fromYear}
                  toYear={endBounds.toYear}
                  placeholder="End date"
                  dateFormat="MMM d, yyyy"
                  className={cn("min-w-0 flex-1 text-xs", dateTimeError && "border-destructive")}
                />
              )}
              {showEndDate && !allDay && (
                <Input
                  type="time"
                  className={cn(
                    "h-8 w-[5.5rem] min-w-[5.5rem] shrink-0 text-xs",
                    dateTimeError && "border-destructive",
                  )}
                  value={endTime}
                  onChange={onEndTimeChange}
                />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                id="ev-allday"
                checked={allDay}
                onCheckedChange={onAllDayChange}
              />
              <Label
                htmlFor="ev-allday"
                className="shrink-0 cursor-pointer select-none text-xs font-normal text-muted-foreground"
              >
                All day
              </Label>
            </div>
          </div>
        </div>

        {dateTimeError && (
          <p className="text-micro text-destructive pl-6">{dateTimeError}</p>
        )}
      </div>

      <div className="flex items-start gap-2.5">
        <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1">
          <EventAttendeesPicker
            members={members}
            selectedIds={attendeeIds}
            onToggle={onToggleAttendee}
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex flex-1 min-w-0 flex-row gap-2">
          <div className="flex-1 min-w-0">
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select privacy / category" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <Select value={color} onValueChange={onColorChange}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select busy status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_COLORS).map(([key, hex]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="capitalize">{key}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!isEdit && (
        <RecurrenceEditor
          state={recurrence}
          onChange={onRecurrenceChange}
          startDate={startDate}
        />
      )}

      <div className="flex items-start gap-2.5">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
        <div className="flex-1">
          <Input
            id="ev-desc"
            value={description}
            onChange={onDescriptionChange}
            placeholder="Notes"
            className="text-xs"
          />
        </div>
      </div>

      {!isEdit && (
        activeConnections.length > 0 ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sync to calendar account</Label>
            <Select value={syncConnectionId} onValueChange={onSyncConnectionChange}>
              <SelectTrigger className="">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Don&apos;t sync</SelectItem>
                {activeConnections.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.accountEmail ?? c.accountLabel ?? c.toolkit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {syncConnectionId !== "none" && (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    {selectedToolkit === "outlook" ? "Add Teams meeting link" : "Add Google Meet link"}
                  </span>
                </div>
                <Switch checked={addConference} onCheckedChange={onAddConferenceChange} />
              </div>
            )}
          </div>
        ) : (
          <div className="pl-7">
            <CalendarConnectInline />
          </div>
        )
      )}
    </div>
  );
}
