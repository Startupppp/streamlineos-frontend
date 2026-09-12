"use client";

import type { ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { REPORTING_SORT_DIRECTIONS, type ReportingSortDirection } from "@/types/crm/reporting";
import { NO_AGGREGATE, type ReportBuilderValues } from "./report-builder-schema";
import { REPORT_AGGREGATE_LABELS, REPORT_QUERY_LIMITS } from "./report-query-limits";
import { ReportBuilderSection } from "./report-builder-section";
import { fieldLabel, type ReportFieldOption } from "./report-source-fields";

function isSortDirection(value: string): value is ReportingSortDirection {
  return REPORTING_SORT_DIRECTIONS.some((entry) => entry === value);
}

interface ReportOutputFieldProps {
  form: UseFormReturn<ReportBuilderValues>;
  options: readonly ReportFieldOption[];
}

export function ReportOutputField({ form, options }: ReportOutputFieldProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "orderBy" });
  const select = form.watch("select");

  function columnLabel(index: number): string {
    const row = select[index];
    if (!row) return `Column ${index + 1}`;
    if (row.aggregate === NO_AGGREGATE) return fieldLabel(options, row.field);
    if (row.field === "") return "Count of rows";
    return `${REPORT_AGGREGATE_LABELS[row.aggregate]} of ${fieldLabel(options, row.field)}`;
  }

  function handleAddSort() {
    append({ select: 0, direction: "desc" });
  }

  function makeRemoveHandler(index: number) {
    return () => remove(index);
  }

  return (
    <ReportBuilderSection
      title="Output"
      description="A sort names a column this report returns — the server refuses one it does not."
    >
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <FormField
                control={form.control}
                name={`orderBy.${index}.select`}
                render={({ field: controllerField }) => {
                  function handleColumnChange(next: string) {
                    controllerField.onChange(Number(next));
                  }
                  return (
                    <FormItem>
                      <Select value={String(controllerField.value)} onValueChange={handleColumnChange}>
                        <FormControl>
                          <SelectTrigger aria-label={`Sort ${index + 1} column`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                          {select.map((_, columnIndex) => (
                            <SelectItem key={columnIndex} value={String(columnIndex)}>
                              {columnLabel(columnIndex)}
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
                name={`orderBy.${index}.direction`}
                render={({ field: controllerField }) => {
                  function handleDirectionChange(next: string) {
                    if (isSortDirection(next)) controllerField.onChange(next);
                  }
                  return (
                    <FormItem>
                      <Select value={controllerField.value} onValueChange={handleDirectionChange}>
                        <FormControl>
                          <SelectTrigger aria-label={`Sort ${index + 1} direction`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
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
              aria-label={`Remove sort ${index + 1}`}
              onClick={makeRemoveHandler(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={fields.length >= REPORT_QUERY_LIMITS.maxOrderBy}
          onClick={handleAddSort}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add sort ({fields.length} / {REPORT_QUERY_LIMITS.maxOrderBy})
        </Button>
      </div>

      <FormField
        control={form.control}
        name="limit"
        render={({ field }) => {
          function handleLimitChange(event: ChangeEvent<HTMLInputElement>) {
            field.onChange(event.target.valueAsNumber);
          }
          return (
            <FormItem>
              <FormLabel>Rows per run</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={REPORT_QUERY_LIMITS.maxLimit}
                  step={1}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  onChange={handleLimitChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </ReportBuilderSection>
  );
}
