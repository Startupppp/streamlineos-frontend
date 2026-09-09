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
  type ReportingFieldType,
} from "@/types/crm/reporting";
import type { ReportBuilderValues } from "./report-builder-schema";
import {
  operatorArity,
  REPORT_OPERATOR_LABELS,
  REPORT_OPERATORS_FOR_TYPE,
  REPORT_QUERY_LIMITS,
} from "./report-query-limits";
import { ReportFieldSelect } from "./report-field-select";
import type { ReportFieldOption } from "./report-source-fields";

function isComparisonOperator(value: string): value is ReportingComparisonOperator {
  return REPORTING_COMPARISON_OPERATORS.some((entry) => entry === value);
}

/** A control shaped like the value, so a date is a date picker and not a hope. */
function inputTypeFor(fieldType: ReportingFieldType | ""): string {
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  if (fieldType === "timestamp") return "datetime-local";
  return "text";
}

interface ReportFilterRowProps {
  form: UseFormReturn<ReportBuilderValues>;
  index: number;
  options: readonly ReportFieldOption[];
  onRemove: (index: number) => void;
}

export function ReportFilterRow({ form, index, options, onRemove }: ReportFilterRowProps) {
  const row = form.watch(`filters.${index}`);
  const fieldType = row?.fieldType ?? "";
  const operators =
    fieldType === "" ? REPORTING_COMPARISON_OPERATORS : REPORT_OPERATORS_FOR_TYPE[fieldType];
  const arity = row ? operatorArity(row.operator) : "binary";

  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={`filters.${index}.field`}
            render={({ field }) => {
              function handleFieldChange(option: ReportFieldOption | null) {
                field.onChange(option?.name ?? "");
                form.setValue(`filters.${index}.fieldType`, option?.type ?? "");
                const current = form.getValues(`filters.${index}.operator`);
                if (option && !REPORT_OPERATORS_FOR_TYPE[option.type].includes(current))
                  form.setValue(`filters.${index}.operator`, "eq", { shouldValidate: true });
              }
              return (
                <FormItem>
                  <ReportFieldSelect
                    value={field.value}
                    options={options}
                    ariaLabel={`Filter ${index + 1} field`}
                    onFieldChange={handleFieldChange}
                  />
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name={`filters.${index}.operator`}
            render={({ field }) => {
              function handleOperatorChange(next: string) {
                if (isComparisonOperator(next)) field.onChange(next);
              }
              return (
                <FormItem>
                  <Select value={field.value} onValueChange={handleOperatorChange}>
                    <FormControl>
                      <SelectTrigger
                        aria-label={`Filter ${index + 1} comparison`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {operators.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {REPORT_OPERATOR_LABELS[operator]}
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
          aria-label={`Remove filter ${index + 1}`}
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {arity === "binary" ? (
        <FormField
          control={form.control}
          name={`filters.${index}.value`}
          render={({ field }) => (
            <FormItem>
              {fieldType === "boolean" ? (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label={`Filter ${index + 1} value`} className="w-full">
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
                    aria-label={`Filter ${index + 1} value`}
                    placeholder="Value"
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {arity === "range" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={`filters.${index}.from`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type={inputTypeFor(fieldType)}
                    aria-label={`Filter ${index + 1} lower bound`}
                    placeholder="From"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`filters.${index}.to`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type={inputTypeFor(fieldType)}
                    aria-label={`Filter ${index + 1} upper bound`}
                    placeholder="To"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}

      {arity === "list" ? (
        <FormField
          control={form.control}
          name={`filters.${index}.values`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  aria-label={`Filter ${index + 1} values`}
                  placeholder={`One value per line, up to ${REPORT_QUERY_LIMITS.maxInValues}`}
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
