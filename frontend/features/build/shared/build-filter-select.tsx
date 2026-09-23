"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { cn } from "@/lib/utils";

/** One trigger width for every Build list filter: fills its slot, capped on desktop. */
export const BUILD_FILTER_TRIGGER_CLASS = cn(
  FILTER_SELECT_TRIGGER,
  "w-full min-w-0 md:w-40",
);

export interface BuildFilterOption {
  value: string;
  label: string;
}

interface BuildFilterSelectProps {
  /** Accessible name and drawer label. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly BuildFilterOption[];
  disabled?: boolean;
  className?: string;
}

/**
 * The one select a Build list filter uses. Sizing comes from the shared field
 * control, chrome from `FILTER_SELECT_TRIGGER`, and the popup is pinned to at
 * least the trigger width so a long option can never render clipped.
 */
export function BuildFilterSelect({
  label,
  value,
  onValueChange,
  options,
  disabled,
  className,
}: BuildFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        className={cn(BUILD_FILTER_TRIGGER_CLASS, className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
