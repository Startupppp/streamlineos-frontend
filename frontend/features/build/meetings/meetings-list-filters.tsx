"use client";

import { useCallback } from "react";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { Combobox } from "@/components/ui/combobox";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";

const TYPE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All types" },
  { value: "meeting", label: "Meeting" },
  { value: "standup", label: "Standup" },
  { value: "retro", label: "Retro" },
  { value: "planning", label: "Planning" },
  { value: "review", label: "Review" },
];

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Any date" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const ACTION_ITEM_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Any" },
  { value: "has", label: "Has action items" },
  { value: "unresolved", label: "Has unresolved items" },
];

const MEETING_TYPES = ["meeting", "standup", "retro", "planning", "review"] as const;
const MEETING_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
const DATE_FILTER_VALUES = ["today", "this_week", "upcoming", "past"] as const;
const ACTION_ITEM_VALUES = ["has", "unresolved"] as const;

export const FILTER_DEFINITIONS = [
  { param: "type", options: MEETING_TYPES },
  { param: "status", options: MEETING_STATUSES },
  { param: "date", options: DATE_FILTER_VALUES },
  { param: "actionItem", options: ACTION_ITEM_VALUES },
  { param: "host" },
  { param: "attendee" },
] as const;

interface ListFilters {
  value: (param: string) => string;
  setValue: (param: string, value: string) => void;
  isActive: (param: string) => boolean;
  isFiltered: boolean;
  clearAll: () => void;
  search: string;
  setSearch: (v: string) => void;
}

interface MeetingsListFiltersProps {
  listFilters: ListFilters;
  memberOptions: Array<{ value: string; label: string; sublabel?: string }>;
}

export function MeetingsListFilters({ listFilters, memberOptions }: MeetingsListFiltersProps) {
  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");
  const dateValue = listFilters.value("date");
  const actionItemValue = listFilters.value("actionItem");
  const hostId = listFilters.value("host");
  const attendeeId = listFilters.value("attendee");

  const handleTypeChange = useCallback(
    (value: string) => listFilters.setValue("type", value),
    [listFilters],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleDateChange = useCallback(
    (value: string) => listFilters.setValue("date", value),
    [listFilters],
  );

  const handleActionItemChange = useCallback(
    (value: string) => listFilters.setValue("actionItem", value),
    [listFilters],
  );

  const handleHostChange = useCallback(
    (value: string) => listFilters.setValue("host", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const handleAttendeeChange = useCallback(
    (value: string) => listFilters.setValue("attendee", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const hostComboValue = hostId !== BUILD_FILTER_ALL ? hostId : "";
  const attendeeComboValue = attendeeId !== BUILD_FILTER_ALL ? attendeeId : "";

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search meetings…",
        label: "Search meetings",
      }}
      filters={[
        {
          id: "type",
          label: "Type",
          active: listFilters.isActive("type"),
          control: (
            <BuildFilterSelect
              label="Type"
              value={typeValue}
              onValueChange={handleTypeChange}
              options={TYPE_OPTIONS}
            />
          ),
        },
        {
          id: "status",
          label: "Status",
          active: listFilters.isActive("status"),
          control: (
            <BuildFilterSelect
              label="Status"
              value={statusValue}
              onValueChange={handleStatusChange}
              options={STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "date",
          label: "Date",
          active: listFilters.isActive("date"),
          control: (
            <BuildFilterSelect
              label="Date"
              value={dateValue}
              onValueChange={handleDateChange}
              options={DATE_OPTIONS}
            />
          ),
        },
        {
          id: "actionItem",
          label: "Action items",
          active: listFilters.isActive("actionItem"),
          control: (
            <BuildFilterSelect
              label="Action items"
              value={actionItemValue}
              onValueChange={handleActionItemChange}
              options={ACTION_ITEM_OPTIONS}
            />
          ),
        },
        ...(memberOptions.length > 0
          ? [
              {
                id: "host",
                label: "Host",
                active: listFilters.isActive("host"),
                control: (
                  <Combobox
                    options={memberOptions}
                    value={hostComboValue}
                    onChange={handleHostChange}
                    placeholder="Host…"
                    searchPlaceholder="Search hosts…"
                    emptyText="No members"
                    className="w-full md:w-40"
                  />
                ),
              },
              {
                id: "attendee",
                label: "Attendee",
                active: listFilters.isActive("attendee"),
                control: (
                  <Combobox
                    options={memberOptions}
                    value={attendeeComboValue}
                    onChange={handleAttendeeChange}
                    placeholder="Attendee…"
                    searchPlaceholder="Search attendees…"
                    emptyText="No members"
                    className="w-full md:w-40"
                  />
                ),
              },
            ]
          : []),
      ]}
      onClearAll={listFilters.clearAll}
    />
  );
}
