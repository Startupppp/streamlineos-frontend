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
import { Button } from "@/components/ui/button";
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
  /** Saving and explaining are separate keys from running; the page resolves them. */
  canSave: boolean;
  canExplain: boolean;
  onSubmit: (values: ReportBuilderValues) => void;
  onSave: (values: ReportBuilderValues) => void;
  onExplain: (values: ReportBuilderValues) => void;
  onSourceChange: (sourceKey: string) => void;
}

export function ReportBuilderForm({
  form,
  sources,
  isRunning,
  canSave,
  canExplain,
  onSubmit,
  onSave,
  onExplain,
  onSourceChange,
}: ReportBuilderFormProps) {
  const sourceKey = form.watch("source");
  const source = sources.find((entry) => entry.key === sourceKey);
  const options = sourceFieldOptions(source);
  const handleSubmit = form.handleSubmit(onSubmit);
  /*
    Both secondary actions run the same validation the submit does. Offering to
    save a description the compiler would refuse only moves the refusal to the
    server, and offering to explain one produces a 400 where the point of the
    button is to show a statement.
  */
  const handleSave = form.handleSubmit(onSave);
  const handleExplain = form.handleSubmit(onExplain);

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

        <div className="flex shrink-0 flex-col gap-2">
          <LoadingButton
            type="submit"
            className="w-full"
            isPending={isRunning}
            loadingText="Running…"
            disabled={!source}
          >
            Run report
          </LoadingButton>

          {source && (canSave || canExplain) ? (
            <div className="flex items-center gap-2">
              {canSave ? (
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleSave}>
                  Save report
                </Button>
              ) : null}
              {canExplain ? (
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleExplain}>
                  Show SQL
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
