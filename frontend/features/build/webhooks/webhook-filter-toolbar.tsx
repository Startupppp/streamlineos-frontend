"use client";

import type { ChangeEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WEBHOOK_EVENTS } from "@/features/build/webhooks/webhook-form-sheet";

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
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <Input
        ref={searchInputRef}
        placeholder="Search by URL…"
        value={search}
        onChange={onSearchChange}
        className="w-48 shrink-0"
        aria-label="Search webhooks"
      />
      <Select value={state ?? "all"} onValueChange={onStateChange}>
        <SelectTrigger className="w-36 shrink-0" aria-label="Filter by state">
          <SelectValue placeholder="All states" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Select value={event ?? "all"} onValueChange={onEventChange}>
        <SelectTrigger className="w-44 shrink-0" aria-label="Filter by event">
          <SelectValue placeholder="All events" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All events</SelectItem>
          {WEBHOOK_EVENTS.map((ev) => (
            <SelectItem key={ev.value} value={ev.value}>
              {ev.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DatePicker
        ariaLabel="Filter from date"
        clearable
        value={from ?? ""}
        onChange={onFromChange}
        placeholder="From date"
        className="w-40 shrink-0"
      />
      <DatePicker
        ariaLabel="Filter to date"
        clearable
        value={to ?? ""}
        onChange={onToChange}
        placeholder="To date"
        className="w-40 shrink-0"
      />
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        aria-pressed={density === "comfortable"}
        onClick={onDensityToggle}
      >
        {density === "comfortable" ? "Comfortable" : "Compact"}
      </Button>
    </div>
  );
}
