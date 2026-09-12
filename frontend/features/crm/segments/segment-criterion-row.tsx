"use client";

import type { UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  REPORTING_COMPARISON_OPERATORS,
  type ReportingComparisonOperator,
} from "@/types/crm/reporting";
import type { SegmentFieldType, SegmentSourceField } from "@/types/crm/segments";
import {
  SEGMENT_OPERATORS_FOR_TYPE,
  SEGMENT_OPERATOR_LABELS,
  segmentOperatorArity,
} from "./segment-criteria";
import type { SegmentFormValues } from "./segment-schema";

/**
 * One criterion: a field, a comparison, and whatever the comparison needs.
 *
 * The value control is shaped like the value — a date field gets a date picker,
 * a boolean gets true/false, a membership test gets a textarea — because a text
 * box that accepts anything and then reports "Enter a date" has taught nobody
 * anything. `is empty` renders no value control at all, which is how `= NULL`,
 * the classic source of a silently empty result, stays unwritable rather than
 * merely discouraged.
 */

function isComparisonOperator(value: string): value is ReportingComparisonOperator {
  return REPORTING_COMPARISON_OPERATORS.some((entry) => entry === value);
}

function inputTypeFor(fieldType: SegmentFieldType | ""): string {
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  if (fieldType === "timestamp") return "datetime-local";
  return "text";
}

interface SegmentCriterionRowProps {
  form: UseFormReturn<SegmentFormValues>;
  index: number;
  fields: readonly SegmentSourceField[];
  onRemove: (index: number) => void;
}

export function SegmentCriterionRow({
  form,
  index,
  fields,
  onRemove,
}: SegmentCriterionRowProps) {
  const row = form.watch(`criteria.${index}`);
  const fieldType = row?.fieldType ?? "";
  const operators =
    fieldType === "" ? REPORTING_COMPARISON_OPERATORS : SEGMENT_OPERATORS_FOR_TYPE[fieldType];
  const arity = row ? segmentOperatorArity(row.operator) : "binary";

  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={`criteria.${index}.field`}
            render={({ field }) => {
              function handleFieldChange(next: string) {
                const chosen = fields.find((option) => option.name === next);
                field.onChange(next);
                form.setValue(`criteria.${index}.fieldType`, chosen?.type ?? "");
                /**
                 * Changing the field can strand the operator on a type that does
                 * not accept it — `contains` on an enum is a compile-time
                 * refusal, not a slow query. Resetting to `is` keeps the row in
                 * a state the server would accept rather than leaving an error
                 * the person did not cause.
                 */
                const current = form.getValues(`criteria.${index}.operator`);
                if (chosen && !SEGMENT_OPERATORS_FOR_TYPE[chosen.type].includes(current))
                  form.setValue(`criteria.${index}.operator`, "eq", { shouldValidate: true });
              }
              return (
                <FormItem>
                  <Select value={field.value} onValueChange={handleFieldChange}>
                    <FormControl>
                      <SelectTrigger
                        aria-label={`Criterion ${index + 1} field`}
                        className="w-full"
                      >
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {fields.map((option) => (
                        <SelectItem key={option.name} value={option.name}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name={`criteria.${index}.operator`}
            render={({ field }) => {
              function handleOperatorChange(next: string) {
                if (isComparisonOperator(next)) field.onChange(next);
              }
              return (
                <FormItem>
                  <Select value={field.value} onValueChange={handleOperatorChange}>
                    <FormControl>
                      <SelectTrigger
                        aria-label={`Criterion ${index + 1} comparison`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {operators.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {SEGMENT_OPERATOR_LABELS[operator]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label={`Remove criterion ${index + 1}`}
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {arity === "binary" ? (
        <FormField
          control={form.control}
          name={`criteria.${index}.value`}
          render={({ field }) => (
            <FormItem>
              {fieldType === "boolean" ? (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger
                      aria-label={`Criterion ${index + 1} value`}
                      className="w-full"
                    >
                      <SelectValue placeholder="Value" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <FormControl>
                  <Input
                    {...field}
                    type={inputTypeFor(fieldType)}
                    aria-label={`Criterion ${index + 1} value`}
                    placeholder="Value"
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {arity === "list" ? (
        <FormField
          control={form.control}
          name={`criteria.${index}.values`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  aria-label={`Criterion ${index + 1} values`}
                  placeholder="One value per line"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
