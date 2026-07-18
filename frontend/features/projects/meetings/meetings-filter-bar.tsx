"use client";

import { useCallback } from "react";
import { ListFilter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PM_CONTROL } from "@/features/projects/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const TYPE_OPTS = [
  { value: "all", label: "All types" },
  { value: "meeting", label: "Meeting" },
  { value: "standup", label: "Standup" },
  { value: "retro", label: "Retro" },
  { value: "planning", label: "Planning" },
  { value: "review", label: "Review" },
];

const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_OPTS = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const ACTION_ITEM_OPTS = [
  { value: "all", label: "Any" },
  { value: "has", label: "Has action items" },
  { value: "unresolved", label: "Has unresolved items" },
];

interface MeetingsFilterBarProps {
  typeFilter: string;
  onTypeChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  dateFilter: string;
  onDateChange: (value: string) => void;
  actionItemFilter: string;
  onActionItemChange: (value: string) => void;
  hostId: string;
  onHostChange: (value: string) => void;
  attendeeId: string;
  onAttendeeChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  memberOptions: ComboboxOption[];
  showMemberFilters: boolean;
  isFiltered: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
}

function FilterSelects({
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  dateFilter,
  onDateChange,
  actionItemFilter,
  onActionItemChange,
  hostId,
  onHostChange,
  attendeeId,
  onAttendeeChange,
  memberOptions,
  showMemberFilters,
  stacked,
}: {
  typeFilter: string;
  onTypeChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  dateFilter: string;
  onDateChange: (value: string) => void;
  actionItemFilter: string;
  onActionItemChange: (value: string) => void;
  hostId: string;
  onHostChange: (value: string) => void;
  attendeeId: string;
  onAttendeeChange: (value: string) => void;
  memberOptions: ComboboxOption[];
  showMemberFilters: boolean;
  stacked?: boolean;
}) {
  const triggerClass = stacked
    ? "w-full"
    : "w-[7.5rem] shrink-0";
  const dateTriggerClass = stacked
    ? "w-full"
    : "w-[6.5rem] shrink-0";
  const actionTriggerClass = stacked
    ? "w-full"
    : "w-[8.5rem] shrink-0";
  const comboboxClass = stacked
    ? "w-full"
    : "w-[7rem] shrink-0";

  return (
    <>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className={triggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className={triggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={onDateChange}>
        <SelectTrigger className={dateTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={actionItemFilter} onValueChange={onActionItemChange}>
        <SelectTrigger className={actionTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_ITEM_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showMemberFilters ? (
        <Combobox
          options={memberOptions}
          value={hostId}
          onChange={onHostChange}
          placeholder="Host…"
          searchPlaceholder="Search hosts…"
          emptyText="No members"
          className={comboboxClass}
        />
      ) : null}
      {showMemberFilters ? (
        <Combobox
          options={memberOptions}
          value={attendeeId}
          onChange={onAttendeeChange}
          placeholder="Attendee…"
          searchPlaceholder="Search attendees…"
          emptyText="No members"
          className={comboboxClass}
        />
      ) : null}
    </>
  );
}

export function MeetingsFilterBar({
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  dateFilter,
  onDateChange,
  actionItemFilter,
  onActionItemChange,
  hostId,
  onHostChange,
  attendeeId,
  onAttendeeChange,
  search,
  onSearchChange,
  memberOptions,
  showMemberFilters,
  isFiltered,
  activeFilterCount,
  onClearFilters,
}: MeetingsFilterBarProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onSearchChange(value);
    },
    [onSearchChange],
  );

  const selectProps = {
    typeFilter,
    onTypeChange,
    statusFilter,
    onStatusChange,
    dateFilter,
    onDateChange,
    actionItemFilter,
    onActionItemChange,
    hostId,
    onHostChange,
    attendeeId,
    onAttendeeChange,
    memberOptions,
    showMemberFilters,
  };

  return (
    <div className={cn(FILTER_TOOLBAR_ROW)}>
        <div className="min-w-0 flex-1 sm:max-w-[11rem] sm:flex-none sm:shrink-0">
          <SearchInput
            value={search}
            onValueChange={handleSearchChange}
            placeholder="Search meetings…"
            className={PM_CONTROL}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-1.5 px-2.5 text-xs sm:hidden"
            >
              <ListFilter className="h-3.5 w-3.5 shrink-0" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-3">
            <div className="flex flex-col gap-2">
              <FilterSelects {...selectProps} stacked />
              {isFiltered ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-start text-xs"
                  onClick={onClearFilters}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        <div className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-hide sm:flex sm:flex-nowrap [&>*]:shrink-0">
          <FilterSelects {...selectProps} />
          {isFiltered ? (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-xs"
              onClick={onClearFilters}
            >
              Clear
            </Button>
          ) : null}
        </div>
    </div>
  );
}
