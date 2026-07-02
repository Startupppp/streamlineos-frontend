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
import { Checkbox } from "@/components/ui/checkbox";
import { Video, Loader2, Tag, Clock, MapPin, Lock, Circle, FileText, ArrowRight } from "lucide-react";
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
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex items-center gap-3">
        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <Input
            id="ev-title"
            value={title}
            onChange={onTitleChange}
            placeholder="Add Title"
            className="h-10 text-sm border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/60 font-medium"
            autoFocus
          />
        </div>
      </div>

      {/* Date Time Row */}
      <div className="flex items-start gap-3">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <DatePicker
              value={startDate}
              onChange={onStartDateChange}
              placeholder="Start date"
              className="h-8 text-xs max-w-[120px]"
            />
            {!allDay && (
              <Input
                type="time"
                className="h-8 text-xs w-[85px] px-2"
                value={startTime}
                onChange={onStartTimeChange}
              />
            )}
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            {!allDay && (
              <Input
                type="time"
                className="h-8 text-xs w-[85px] px-2"
                value={endTime}
                onChange={onEndTimeChange}
              />
            )}
            <DatePicker
              value={endDate}
              onChange={onEndDateChange}
              fromDate={startDate ? new Date(startDate) : undefined}
              placeholder="End date"
              className="h-8 text-xs max-w-[120px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ev-allday"
              checked={allDay}
              onCheckedChange={(checked) => onAllDayChange(!!checked)}
            />
            <Label htmlFor="ev-allday" className="text-xs text-muted-foreground cursor-pointer font-normal select-none">
              All day
            </Label>
          </div>
        </div>
      </div>

      {/* Location / Video conference Row */}
      <div className="flex items-start gap-3">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <Input
              id="ev-location"
              value={location}
              onChange={onLocationChange}
              placeholder="Room or Location"
              className={cn("h-9 text-xs flex-1", locationError && "border-destructive")}
            />
            {meetStatus &&
              (meetStatus.connected ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold px-2"
                  disabled={isMeetPending}
                  onClick={handleGenerateMeetClick}
                >
                  {isMeetPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  + Video conference
                </Button>
              ) : (
                <a
                  href={meetStatus.authUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("shrink-0", !meetStatus.authUrl && "pointer-events-none")}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold px-2"
                    disabled={!meetStatus.authUrl}
                  >
                    <Video className="h-3.5 w-3.5" />
                    + Video conference
                  </Button>
                </a>
              ))}
          </div>
          {locationError && (
            <p className="text-[10px] text-destructive">{locationError}</p>
          )}
          {!locationError && meetStatus?.connected && meetStatus.googleEmail && (
            <p className="text-[10px] text-muted-foreground px-1">
              Google Calendar linked: {meetStatus.googleEmail}
            </p>
          )}
        </div>
      </div>

      {/* Visibility / Privacy Select */}
      <div className="flex items-center gap-3">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 text-xs w-full max-w-[200px]">
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
      </div>

      {/* Busy / Free Select */}
      <div className="flex items-center gap-3">
        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <Select value={color} onValueChange={onColorChange}>
            <SelectTrigger className="h-9 text-xs w-full max-w-[200px]">
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

      {/* Notes / Description Row */}
      <div className="flex items-start gap-3">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
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
