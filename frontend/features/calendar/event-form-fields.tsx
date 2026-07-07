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
import { Tag, Clock, MapPin, Lock, FileText, Video, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationConnection } from "@/hooks/api/integrations";

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#3b82f6",
};

const EVENT_CATEGORIES = [
  "general",
  "meeting",
  "deadline",
  "reminder",
  "leave",
  "project",
  "other",
] as const;

type EventCategory = (typeof EVENT_CATEGORIES)[number];

interface EventFormFieldsProps {
  title: string;
  description: string;
  location: string;
  locationError: string;
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
  onLocationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
}

export function EventFormFields({
  title,
  description,
  location,
  locationError,
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
}: EventFormFieldsProps) {
  const activeConnections = connections.filter((c) => c.status === "active");
  const selectedToolkit = activeConnections.find((c) => String(c.id) === syncConnectionId)?.toolkit;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <Input
            id="ev-title"
            value={title}
            onChange={onTitleChange}
            placeholder="Add Title"
            className="h-9 text-sm border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/60 font-medium"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <DatePicker
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Start date"
            dateFormat="MMM d, yyyy"
            className="h-8 text-xs min-w-[8.5rem]"
          />
          {!allDay && (
            <Input
              type="time"
              className="h-8 text-xs w-[7.5rem] shrink-0"
              value={startTime}
              onChange={onStartTimeChange}
            />
          )}
          {!showEndDate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
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
              fromDate={startDate ? new Date(startDate) : undefined}
              placeholder="End date"
              dateFormat="MMM d, yyyy"
              className={cn("h-8 text-xs min-w-[8.5rem]", dateTimeError && "border-destructive")}
            />
          )}
          {showEndDate && !allDay && (
            <Input
              type="time"
              className={cn(
                "h-8 text-xs w-[7.5rem] shrink-0",
                dateTimeError && "border-destructive",
              )}
              value={endTime}
              onChange={onEndTimeChange}
            />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              id="ev-allday"
              checked={allDay}
              onCheckedChange={onAllDayChange}
            />
            <Label
              htmlFor="ev-allday"
              className="text-xs text-muted-foreground cursor-pointer font-normal select-none"
            >
              All day
            </Label>
          </div>
        </div>

        {dateTimeError && (
          <p className="text-[10px] text-destructive">{dateTimeError}</p>
        )}
      </div>

      <div className="flex items-start gap-2.5">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
        <div className="flex-1 min-w-0 space-y-1">
          <Input
            id="ev-location"
            value={location}
            onChange={onLocationChange}
            placeholder="Room or Location"
            className={cn("h-9 text-xs flex-1 min-w-0", locationError && "border-destructive")}
          />
          {locationError && (
            <p className="text-[10px] text-destructive">{locationError}</p>
          )}
        </div>
      </div>

      {!isEdit && (
        activeConnections.length > 0 ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sync to calendar account</Label>
            <Select value={syncConnectionId} onValueChange={onSyncConnectionChange}>
              <SelectTrigger className="h-9">
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
          <p className="text-xs text-muted-foreground pl-7">Connect an account to sync events</p>
        )
      )}

      <div className="flex items-center gap-2.5">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex flex-1 min-w-0 flex-row gap-2">
          <div className="flex-1 min-w-0">
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-9 w-full text-xs">
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
              <SelectTrigger className="h-9 w-full text-xs">
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

      <div className="flex items-start gap-2.5">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
        <div className="flex-1">
          <Input
            id="ev-desc"
            value={description}
            onChange={onDescriptionChange}
            placeholder="Notes"
            className="h-9 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
