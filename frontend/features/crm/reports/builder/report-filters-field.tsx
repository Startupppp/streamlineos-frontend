"use client";

import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { EMPTY_FILTER_ROW, type ReportBuilderValues } from "./report-builder-schema";
import { REPORT_MAX_FILTER_BRANCHES } from "./report-query-limits";
import { ReportBuilderSection } from "./report-builder-section";
import { ReportFilterRow } from "./report-filter-row";
import type { ReportFieldOption } from "./report-source-fields";

interface ReportFiltersFieldProps {
  form: UseFormReturn<ReportBuilderValues>;
  options: readonly ReportFieldOption[];
}

export function ReportFiltersField({ form, options }: ReportFiltersFieldProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "filters" });

  function handleAddFilter() {
    append({ ...EMPTY_FILTER_ROW });
  }

  function handleRemoveFilter(index: number) {
    remove(index);
  }

  return (
    <ReportBuilderSection
      title="Filters"
      hint={`${fields.length} / ${REPORT_MAX_FILTER_BRANCHES}`}
      description="Every filter has to hold."
    >
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <ReportFilterRow
            key={field.id}
            form={form}
            index={index}
            options={options}
            onRemove={handleRemoveFilter}
          />
        ))}

        <FormField
          control={form.control}
          name="filters"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={fields.length >= REPORT_MAX_FILTER_BRANCHES}
          onClick={handleAddFilter}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add filter
        </Button>
      </div>
    </ReportBuilderSection>
  );
}
