"use client";

import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  EMPTY_PROJECTION_ROW,
  NO_AGGREGATE,
  type ReportBuilderValues,
} from "./report-builder-schema";
import { REPORT_QUERY_LIMITS } from "./report-query-limits";
import { ReportBuilderSection } from "./report-builder-section";
import { ReportColumnRow } from "./report-column-row";
import { fieldLabel, type ReportFieldOption } from "./report-source-fields";

interface ReportColumnsFieldProps {
  form: UseFormReturn<ReportBuilderValues>;
  options: readonly ReportFieldOption[];
}

export function ReportColumnsField({ form, options }: ReportColumnsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "select" });
  const select = form.watch("select");
  const groupBy = form.watch("groupBy");
  const hasAggregate = select.some((row) => row.aggregate !== NO_AGGREGATE);
  const groupable = [
    ...new Set(
      select.filter((row) => row.aggregate === NO_AGGREGATE && row.field !== "").map((row) => row.field),
    ),
  ];

  function handleAddColumn() {
    append({ ...EMPTY_PROJECTION_ROW });
  }

  /**
   * Removing a column renumbers the sort keys, because a sort names an index
   * into `select` rather than a field. Left alone, deleting column one silently
   * re-points every sort below it at a different column.
   */
  function handleRemoveColumn(index: number) {
    remove(index);
    const kept = form
      .getValues("orderBy")
      .filter((row) => row.select !== index)
      .map((row) => (row.select > index ? { ...row, select: row.select - 1 } : row));
    form.setValue("orderBy", kept, { shouldValidate: true });
  }

  function makeGroupHandler(name: string) {
    return (checked: boolean | "indeterminate") => {
      const current = form.getValues("groupBy");
      const next =
        checked === true
          ? [...current.filter((entry) => entry !== name), name]
          : current.filter((entry) => entry !== name);
      form.setValue("groupBy", next, { shouldValidate: true });
    };
  }

  return (
    <ReportBuilderSection
      title="Columns"
      hint={`${fields.length} / ${REPORT_QUERY_LIMITS.maxSelect}`}
    >
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <ReportColumnRow
            key={field.id}
            form={form}
            index={index}
            options={options}
            canRemove={fields.length > 1}
            onRemove={handleRemoveColumn}
          />
        ))}

        <FormField
          control={form.control}
          name="select"
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
          disabled={fields.length >= REPORT_QUERY_LIMITS.maxSelect}
          onClick={handleAddColumn}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add column
        </Button>
      </div>

      {hasAggregate ? (
        <FormField
          control={form.control}
          name="groupBy"
          render={() => (
            <FormItem>
              <FormLabel>
                Group by ({groupBy.length} / {REPORT_QUERY_LIMITS.maxGroupBy})
              </FormLabel>
              {groupable.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Every column is aggregated, so this report returns a single row.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {groupable.map((name) => (
                    <div key={name} className="flex items-center gap-2">
                      <Checkbox
                        id={`report-group-by-${name}`}
                        checked={groupBy.includes(name)}
                        disabled={
                          !groupBy.includes(name) && groupBy.length >= REPORT_QUERY_LIMITS.maxGroupBy
                        }
                        onCheckedChange={makeGroupHandler(name)}
                      />
                      <Label htmlFor={`report-group-by-${name}`} className="font-normal">
                        {fieldLabel(options, name)}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </ReportBuilderSection>
  );
}
