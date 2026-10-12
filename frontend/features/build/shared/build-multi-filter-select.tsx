"use client";

import { useCallback } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BUILD_FILTER_TRIGGER_CLASS, type BuildFilterOption } from "./build-filter-select";

export interface BuildMultiFilterSelectProps {
  label: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: readonly BuildFilterOption[];
  disabled?: boolean;
  className?: string;
}

export function BuildMultiFilterSelect({
  label,
  values,
  onValuesChange,
  options,
  disabled,
  className,
}: BuildMultiFilterSelectProps) {
  const toggle = useCallback(
    (value: string) => {
      if (values.includes(value)) {
        onValuesChange(values.filter((v) => v !== value));
      } else {
        onValuesChange([...values, value]);
      }
    },
    [values, onValuesChange],
  );

  const triggerLabel =
    values.length === 0
      ? label
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? values[0])
        : `${label} (${values.length})`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${label} filter`}
          disabled={disabled}
          className={cn(BUILD_FILTER_TRIGGER_CLASS, "justify-between gap-2", className)}
        >
          <span className="truncate font-normal">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="menuitemcheckbox"
              aria-checked={checked}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              onClick={() => toggle(option.value)}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                  checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
                aria-hidden="true"
              >
                {checked ? <Check className="size-3" /> : null}
              </span>
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
