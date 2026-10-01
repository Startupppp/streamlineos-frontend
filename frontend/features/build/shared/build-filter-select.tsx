"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { cn } from "@/lib/utils";

export const BUILD_FILTER_TRIGGER_CLASS = cn(
  FILTER_SELECT_TRIGGER,
  "w-full min-w-0 md:w-fit md:min-w-40 md:max-w-80",
);

export interface BuildFilterOption {
  value: string;
  label: string;
}

const CLEARED_FILTER_ITEM_VALUE = "__build-filter-cleared__";

function toItemValue(value: string): string {
  return value === "" ? CLEARED_FILTER_ITEM_VALUE : value;
}

function fromItemValue(value: string): string {
  return value === CLEARED_FILTER_ITEM_VALUE ? "" : value;
}

interface BuildFilterSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly BuildFilterOption[];
  disabled?: boolean;
  className?: string;
}

export function BuildFilterSelect({
  label,
  value,
  onValueChange,
  options,
  disabled,
  className,
}: BuildFilterSelectProps) {
  const hasMatch = options.some((option) => option.value === value);
  const handleValueChange = (next: string) => onValueChange(fromItemValue(next));
  return (
    <Select
      value={hasMatch ? toItemValue(value) : undefined}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(BUILD_FILTER_TRIGGER_CLASS, className)}
      >
        <SelectValue placeholder={label} className="font-normal" />
      </SelectTrigger>
      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={toItemValue(option.value)}
            className="font-normal"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
