"use client";

import { useCallback, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import type { AcceptFormValues } from "./opportunity-accept-schema";

function idSelectValue(id: number | undefined) {
  return id !== undefined ? String(id) : "";
}

export interface NumericItem {
  id: number;
  label: string;
}
type NumericFieldName = "goalId" | "projectId" | "epicTicketId" | "releaseId";

interface FieldSelectProps {
  form: UseFormReturn<AcceptFormValues>;
  name: NumericFieldName;
  label: string;
  items: NumericItem[];
  placeholder?: string;
  testId?: string;
  onChangeSideEffect?: () => void;
  onSearchChange?: (search: string) => void;
  footer?: React.ReactNode;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

export function FieldSelect({
  form,
  name,
  label,
  items,
  placeholder,
  testId,
  onChangeSideEffect,
  onSearchChange,
  footer,
  isError,
  error,
  onRetry,
}: FieldSelectProps) {
  const handleChange = useCallback(
    (v: string) => {
      form.setValue(name, v ? Number(v) : undefined, { shouldValidate: true });
      onChangeSideEffect?.();
    },
    [form, name, onChangeSideEffect],
  );

  const comboOptions = useMemo(
    () => items.map((i) => ({ value: String(i.id), label: i.label })),
    [items],
  );

  return (
    <FormField
      control={form.control}
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
          return (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <Combobox
                options={comboOptions}
                value={idSelectValue(field.value)}
                onChange={handleChange}
                placeholder={placeholder}
                onSearchChange={onSearchChange}
                aria-label={label}
                footer={footer}
              />
              <FormMessage />
            </FormItem>
          );
        }
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select value={idSelectValue(field.value)} onValueChange={handleChange}>
              <FormControl>
                <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid={testId}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.label}
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
