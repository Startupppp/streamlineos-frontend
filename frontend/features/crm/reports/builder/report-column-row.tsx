"use client";

import type { UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { REPORTING_AGGREGATES } from "@/types/crm/reporting";
import { NO_AGGREGATE, type ReportBuilderValues } from "./report-builder-schema";
import { REPORT_AGGREGATE_LABELS, REPORT_AGGREGATES_FOR_TYPE } from "./report-query-limits";
import { ReportFieldSelect } from "./report-field-select";
import type { ReportFieldOption } from "./report-source-fields";

type AggregateChoice = ReportBuilderValues["select"][number]["aggregate"];

function isAggregateChoice(value: string): value is AggregateChoice {
  return value === NO_AGGREGATE || REPORTING_AGGREGATES.some((entry) => entry === value);
}

interface ReportColumnRowProps {
  form: UseFormReturn<ReportBuilderValues>;
  index: number;
  options: readonly ReportFieldOption[];
  canRemove: boolean;
  onRemove: (index: number) => void;
}

export function ReportColumnRow({
  form,
  index,
  options,
  canRemove,
  onRemove,
}: ReportColumnRowProps) {
  const row = form.watch(`select.${index}`);
  const fieldType = row?.fieldType ?? "";
  const allowedAggregates =
    fieldType === "" ? REPORTING_AGGREGATES : REPORT_AGGREGATES_FOR_TYPE[fieldType];

  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="flex items-start gap-2">
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={`select.${index}.aggregate`}
          render={({ field }) => {
            function handleAggregateChange(next: string) {
              if (isAggregateChoice(next)) field.onChange(next);
            }
            return (
              <FormItem>
                <Select value={field.value} onValueChange={handleAggregateChange}>
                  <FormControl>
                    <SelectTrigger aria-label={`Column ${index + 1} aggregate`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value={NO_AGGREGATE}>No aggregate</SelectItem>
                    {allowedAggregates.map((aggregate) => (
                      <SelectItem key={aggregate} value={aggregate}>
                        {REPORT_AGGREGATE_LABELS[aggregate]}
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
          name={`select.${index}.field`}
          render={({ field }) => {
            function handleFieldChange(option: ReportFieldOption | null) {
              field.onChange(option?.name ?? "");
              form.setValue(`select.${index}.fieldType`, option?.type ?? "", {
                shouldValidate: true,
              });
            }
            return (
              <FormItem>
                <ReportFieldSelect
                  value={field.value}
                  options={options}
                  ariaLabel={`Column ${index + 1} field`}
                  allowRowCount={row?.aggregate === "count"}
                  onFieldChange={handleFieldChange}
                />
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
        aria-label={`Remove column ${index + 1}`}
        disabled={!canRemove}
        onClick={handleRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
