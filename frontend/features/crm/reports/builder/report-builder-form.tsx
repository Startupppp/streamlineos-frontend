"use client";

import type { UseFormReturn } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import type { ReportingSource } from "@/types/crm/reporting";
import type { ReportBuilderValues } from "./report-builder-schema";
import { ReportBuilderSection } from "./report-builder-section";
import { ReportColumnsField } from "./report-columns-field";
import { ReportFiltersField } from "./report-filters-field";
import { ReportOutputField } from "./report-output-field";
import { sourceFieldOptions } from "./report-source-fields";

interface ReportBuilderFormProps {
  form: UseFormReturn<ReportBuilderValues>;
  sources: readonly ReportingSource[];
  isRunning: boolean;
  onSubmit: (values: ReportBuilderValues) => void;
  onSourceChange: (sourceKey: string) => void;
}

export function ReportBuilderForm({
  form,
  sources,
  isRunning,
  onSubmit,
  onSourceChange,
}: ReportBuilderFormProps) {
  const sourceKey = form.watch("source");
  const source = sources.find((entry) => entry.key === sourceKey);
  const options = sourceFieldOptions(source);
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <ReportBuilderSection title="Source">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={onSourceChange}>
                    <FormControl>
                      <SelectTrigger aria-label="Report source" className="w-full">
                        <SelectValue placeholder="Pick something to report on" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {sources.map((entry) => (
                        <SelectItem key={entry.key} value={entry.key}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </ReportBuilderSection>

          {source ? (
            <>
              <Separator />
              <ReportColumnsField form={form} options={options} />
              <Separator />
              <ReportFiltersField form={form} options={options} />
              <Separator />
              <ReportOutputField form={form} options={options} />
            </>
          ) : null}
        </div>

        <LoadingButton
          type="submit"
          className="w-full shrink-0"
          isPending={isRunning}
          loadingText="Running…"
          disabled={!source}
        >
          Run report
        </LoadingButton>
      </form>
    </Form>
  );
}
