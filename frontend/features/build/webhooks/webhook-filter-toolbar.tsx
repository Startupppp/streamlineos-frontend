"use client";

import type { ChangeEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { WEBHOOK_EVENTS } from "@/features/build/webhooks/webhook-form-sheet";

const STATE_OPTIONS = [
  { value: "all", label: "All states" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const EVENT_OPTIONS = [
  { value: "all", label: "All events" },
  ...WEBHOOK_EVENTS,
];

interface WebhookFilterToolbarProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  search: string;
  state: string | null;
  event: string | undefined;
  from: string | undefined;
  to: string | undefined;
  density: "compact" | "comfortable";
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onStateChange: (value: string) => void;
  onEventChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onDensityToggle: () => void;
}

export function WebhookFilterToolbar({
  searchInputRef,
  search,
  state,
  event,
  from,
  to,
  density,
  onSearchChange,
  onStateChange,
  onEventChange,
  onFromChange,
  onToChange,
  onDensityToggle,
}: WebhookFilterToolbarProps) {
  function handleSearchValueChange(value: string) {
    onSearchChange({
      target: { value },
      currentTarget: { value },
    } as ChangeEvent<HTMLInputElement>);
  }

  return (
    <BuildListToolbar
      className="mb-3"
      search={{
        value: search,
        onValueChange: handleSearchValueChange,
        placeholder: "Search by URL…",
        label: "Search webhooks",
        inputRef: searchInputRef,
      }}
      filters={[
        {
          id: "state",
          label: "State",
          active: state !== null && state !== "all",
          control: (
            <BuildFilterSelect
              label="Filter by state"
              value={state ?? "all"}
              onValueChange={onStateChange}
              options={STATE_OPTIONS}
            />
          ),
        },
        {
          id: "event",
          label: "Event",
          active: event !== undefined && event !== "all",
          control: (
            <BuildFilterSelect
              label="Filter by event"
              value={event ?? "all"}
              onValueChange={onEventChange}
              options={EVENT_OPTIONS}
            />
          ),
        },
        {
          id: "from",
          label: "From date",
          active: Boolean(from),
          control: (
            <DatePicker
              ariaLabel="Filter from date"
              clearable
              value={from ?? ""}
              onChange={onFromChange}
              placeholder="From date"
              className="w-full min-w-40 md:w-40"
            />
          ),
        },
        {
          id: "to",
          label: "To date",
          active: Boolean(to),
          control: (
            <DatePicker
              ariaLabel="Filter to date"
              clearable
              value={to ?? ""}
              onChange={onToChange}
              placeholder="To date"
              className="w-full min-w-40 md:w-40"
            />
          ),
        },
      ]}
      trailing={
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          aria-pressed={density === "comfortable"}
          onClick={onDensityToggle}
        >
          {density === "comfortable" ? "Comfortable" : "Compact"}
        </Button>
      }
    />
  );
}
