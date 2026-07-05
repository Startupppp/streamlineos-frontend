"use client";

import { memo, useCallback } from "react";
import { format } from "date-fns";
import { Users, PlusCircle, Activity } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import type { BigCalEvent } from "./big-calendar-wrapper";
import { EVENT_COLORS } from "./use-event-prop-getter";

interface SidebarMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}

interface CalendarSidebarProps {
  currentDate: Date;
  members: SidebarMember[];
  checkedAttendees: Record<string, boolean>;
  todayActivities: BigCalEvent[];
  onDateSelect: (date: Date) => void;
  onAttendeeChange: (memberId: string, checked: boolean) => void;
  onOpenCreate: () => void;
  onSelectActivity: (id: string) => void;
}

interface ActivityItemProps {
  activity: BigCalEvent;
  onSelect: (id: string) => void;
}

const ActivityItem = memo(function ActivityItem({
  activity,
  onSelect,
}: ActivityItemProps) {
  const eventColor =
    EVENT_COLORS[activity.resource?.color ?? "blue"] ?? EVENT_COLORS.blue;

  const handleClick = useCallback(
    () => onSelect(String(activity.id)),
    [activity.id, onSelect],
  );

  return (
    <div
      onClick={handleClick}
      className="rounded-lg border bg-card p-2.5 hover:bg-muted/40 cursor-pointer transition-all duration-200 shadow-xs border-l-4"
      style={{ borderLeftColor: eventColor }}
    >
      <h5 className="text-xs font-semibold text-foreground truncate">
        {activity.title}
      </h5>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {activity.allDay
          ? "All day"
          : `${format(activity.start, "h:mm a")} - ${format(activity.end, "h:mm a")}`}
      </p>
    </div>
  );
});

interface AttendeeItemProps {
  member: SidebarMember;
  checked: boolean;
  onAttendeeChange: (memberId: string, checked: boolean) => void;
}

const AttendeeItem = memo(function AttendeeItem({
  member,
  checked,
  onAttendeeChange,
}: AttendeeItemProps) {
  const mName = member.firstName
    ? `${member.firstName} ${member.lastName ?? ""}`.trim()
    : (member.name ?? member.email ?? "");

  const handleChange = useCallback(
    (c: boolean | "indeterminate") => onAttendeeChange(member.id, !!c),
    [member.id, onAttendeeChange],
  );

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`attendee-check-${member.id}`}
        checked={checked}
        onCheckedChange={handleChange}
      />
      <label
        htmlFor={`attendee-check-${member.id}`}
        className="text-xs text-foreground cursor-pointer truncate font-medium flex-1 select-none"
      >
        {mName}
      </label>
      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
    </div>
  );
});

export const CalendarSidebar = memo(function CalendarSidebar({
  currentDate,
  members,
  checkedAttendees,
  todayActivities,
  onDateSelect,
  onAttendeeChange,
  onOpenCreate,
  onSelectActivity,
}: CalendarSidebarProps) {
  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (date) onDateSelect(date);
    },
    [onDateSelect],
  );

  return (
    <div className="w-[300px] shrink-0 border-l border-border px-3 space-y-5 hidden xl:block select-none overflow-y-auto">
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Calendar
          mode="single"
          compact
          selected={currentDate}
          onSelect={handleDateSelect}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-violet-500" />
            Attendees
          </span>
          <button
            type="button"
            onClick={onOpenCreate}
            className="text-violet-600 hover:text-violet-700 flex items-center gap-1 hover:underline"
          >
            <PlusCircle className="h-3 w-3" />
            Add
          </button>
        </div>
        <div className="rounded-lg border bg-card p-3 space-y-2.5 max-h-48 overflow-y-auto shadow-sm">
          {members.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No members found
            </p>
          ) : (
            members.map((member) => (
              <AttendeeItem
                key={member.id}
                member={member}
                checked={checkedAttendees[member.id] !== false}
                onAttendeeChange={onAttendeeChange}
              />
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-violet-500" />
          My Activities
        </h4>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {todayActivities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              No events scheduled for today
            </div>
          ) : (
            todayActivities.map((act) => (
              <ActivityItem
                key={act.id}
                activity={act}
                onSelect={onSelectActivity}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
});
