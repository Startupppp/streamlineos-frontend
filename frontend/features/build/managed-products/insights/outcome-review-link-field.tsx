"use client";

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
import type { ScheduleOutcomeReviewValues } from "./outcome-review-form-schema";

const NOT_LINKED = "__none__";

interface OutcomeReviewLinkFieldProps {
  control: Control<ScheduleOutcomeReviewValues>;
  name: "opportunityId" | "goalId";
  label: string;
  options: ReadonlyArray<{ id: number; title: string }>;
}

export function OutcomeReviewLinkField({ control, name, label, options }: OutcomeReviewLinkFieldProps) {
  if (options.length === 0) return null;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value ? String(field.value) : NOT_LINKED}
            onValueChange={(v) => field.onChange(v === NOT_LINKED ? undefined : Number(v))}
          >
            <FormControl>
              <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid={`${name === "goalId" ? "goal" : "opportunity"}-select`}>
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
      )}
    />
  );
}
