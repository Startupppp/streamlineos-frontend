"use client";

import { useCallback } from "react";
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
}

export function FieldSelect({
  form,
  name,
  label,
  items,
  placeholder,
  testId,
  onChangeSideEffect,
}: FieldSelectProps) {
  const handleChange = useCallback(
    (v: string) => {
      form.setValue(name, v ? Number(v) : undefined, { shouldValidate: true });
      onChangeSideEffect?.();
    },
    [form, name, onChangeSideEffect],
  );
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
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
      )}
    />
  );
}
