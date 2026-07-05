"use client";

import { useCallback } from "react";
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
import { LoaderCircleIcon } from "@animateicons/react/lucide";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface MeetStatus {
  connected: boolean;
  authUrl?: string | null;
  googleEmail?: string | null;
}

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
  meetStatus: MeetStatus | undefined;
  isMeetPending: boolean;
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
  onGenerateMeet: () => void;
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
  meetStatus,
  isMeetPending,
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
  onGenerateMeet,
}: EventFormFieldsProps) {
  const handleGenerateMeetClick = useCallback(() => {
    onGenerateMeet();
  }, [onGenerateMeet]);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="ev-title" className="text-xs font-medium">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ev-title"
          value={title}
          onChange={onTitleChange}
          placeholder="Event title"
          className="h-9"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-desc" className="text-xs font-medium">
          Description
        </Label>
        <Input
          id="ev-desc"
          value={description}
          onChange={onDescriptionChange}
          placeholder="Optional description"
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ev-location" className="text-xs font-medium">
          Location / Meet Link
        </Label>
        <div className="flex gap-2">
          <Input
            id="ev-location"
            value={location}
            onChange={onLocationChange}
            placeholder="Room A, Zoom link, https://meet.google.com/..."
            className={cn("h-9 flex-1", locationError && "border-destructive")}
          />
          {meetStatus &&
            (meetStatus.connected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5"
                disabled={isMeetPending}
                onClick={handleGenerateMeetClick}
              >
                {isMeetPending ? (
                  <LoaderCircleIcon size={14} className="animate-spin" />
                ) : (
                  <Video className="h-3.5 w-3.5" />
                )}
                Meet
              </Button>
            ) : meetStatus.authUrl ? (
              <a
                href={location.trim() ? meetStatus.authUrl : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "shrink-0",
                  !location.trim() && "pointer-events-none",
                )}
                aria-disabled={!location.trim()}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={!location.trim()}
                >
                  <Video className="h-3.5 w-3.5" />
                  Connect
                </Button>
              </a>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                disabled
                title="Google Meet not configured"
              >
                <Video className="h-3.5 w-3.5" />
                Connect
              </Button>
            ))}
        </div>
        {locationError && (
          <p className="text-[11px] text-destructive">{locationError}</p>
        )}
        {!locationError && meetStatus?.connected && meetStatus.googleEmail && (
          <p className="text-[11px] text-muted-foreground">
            Google: {meetStatus.googleEmail}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <Switch
          id="ev-allday"
          checked={allDay}
          onCheckedChange={onAllDayChange}
        />
        <Label htmlFor="ev-allday" className="text-sm cursor-pointer">
          All day event
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Start Date</Label>
          <DatePicker
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Start date"
          />
        </div>
        {!allDay && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Start Time</Label>
            <Input
              type="time"
              className="h-9"
              value={startTime}
              onChange={onStartTimeChange}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">End Date</Label>
          <DatePicker
            value={endDate}
            onChange={onEndDateChange}
            fromDate={startDate ? new Date(startDate) : undefined}
            placeholder="End date"
          />
        </div>
        {!allDay && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">End Time</Label>
            <Input
              type="time"
              className="h-9"
              value={endTime}
              onChange={onEndTimeChange}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Category</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <span className="capitalize">{cat}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Color</Label>
          <Select value={color} onValueChange={onColorChange}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_COLORS).map(([key, hex]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
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
    </>
  );
}
