"use client";

import { useMemo } from "react";
import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { Combobox } from "@/components/ui/combobox";
import { ErrorState } from "@/components/shared/error-state";
import type { ScheduleOutcomeReviewValues } from "./outcome-review-form-schema";

const NOT_LINKED = "__none__";

interface OutcomeReviewLinkFieldProps {
  control: Control<ScheduleOutcomeReviewValues>;
  name: "opportunityId" | "goalId";
  label: string;
  options: ReadonlyArray<{ id: number; title: string }>;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onSearchChange?: (search: string) => void;
  footer?: React.ReactNode;
}

export function OutcomeReviewLinkField({
  control,
  name,
  label,
  options,
  isError,
  error,
  onRetry,
  onSearchChange,
  footer,
}: OutcomeReviewLinkFieldProps) {
  const comboOptions = useMemo(
    () => options.map((o) => ({ value: String(o.id), label: o.title })),
    [options],
  );

  if (!isError && options.length === 0) return null;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        if (isError) {
          return (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <ErrorState compact onRetry={onRetry} error={error} />
            </FormItem>
          );
        }
        if (onSearchChange) {
          function handleComboChange(v: string) {
            field.onChange(v ? Number(v) : undefined);
          }
          return (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <Combobox
                options={comboOptions}
                value={field.value ? String(field.value) : ""}
                onChange={handleComboChange}
                onSearchChange={onSearchChange}
                aria-label={label}
                footer={footer}
              />
              <FormMessage />
            </FormItem>
          );
        }
        function handleValueChange(v: string) {
          field.onChange(v === NOT_LINKED ? undefined : Number(v));
        }
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select
              value={field.value ? String(field.value) : NOT_LINKED}
              onValueChange={handleValueChange}
            >
              <FormControl>
                <SelectTrigger
                  className={FIELD_CONTROL_CLASS}
                  data-testid={`${name === "goalId" ? "goal" : "opportunity"}-select`}
                >
                  <SelectValue placeholder="Not linked" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NOT_LINKED}>Not linked</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
