"use client";

import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { STATEMENT_DATE_FORMATS } from "@/types/accounting/accounting-banking";
import { useStatementMappingPresets } from "@/hooks/api/accounting/banking";
import { DATE_FORMAT_SAMPLES } from "../lib/date-format-samples";
import { sniffCsvColumns } from "../lib/csv-header";
import type { StatementImportFormValues } from "./statement-import-schema";

interface ColumnMappingFieldsProps {
  form: UseFormReturn<StatementImportFormValues>;
  fileContent: string;
}

const warningTone = statusToneClasses("warning");

const COLUMN_FIELDS = [
  { name: "dateColumn", label: "Date column", required: true },
  { name: "descriptionColumn", label: "Description column", required: false },
  { name: "referenceColumn", label: "Reference column", required: false },
  { name: "amountColumn", label: "One signed amount column", required: false },
  { name: "debitColumn", label: "Money out column", required: false },
  { name: "creditColumn", label: "Money in column", required: false },
] as const;

export function ColumnMappingFields({
  form,
  fileContent,
}: ColumnMappingFieldsProps) {
  const presetsQuery = useStatementMappingPresets();
  const delimiter = form.watch("delimiter") || ",";
  const skipRowsRaw = form.watch("skipRows");
  const dateFormat = form.watch("dateFormat");

  const detectedColumns = useMemo(() => {
    const skip = Number(skipRowsRaw);
    return sniffCsvColumns(
      fileContent,
      delimiter,
      Number.isFinite(skip) ? skip : 0,
    );
  }, [fileContent, delimiter, skipRowsRaw]);

  function handlePresetChange(code: string): void {
    form.setValue("presetCode", code === "none" ? "" : code);
    const preset = (presetsQuery.data?.presets ?? []).find(
      (entry) => entry.code === code,
    );
    if (!preset) return;
    form.setValue("dateColumn", preset.mapping.dateColumn ?? "");
    form.setValue("descriptionColumn", preset.mapping.descriptionColumn ?? "");
    form.setValue("referenceColumn", preset.mapping.referenceColumn ?? "");
    form.setValue("amountColumn", preset.mapping.amountColumn ?? "");
    form.setValue("debitColumn", preset.mapping.debitColumn ?? "");
    form.setValue("creditColumn", preset.mapping.creditColumn ?? "");
    if (preset.mapping.dateFormat)
      form.setValue("dateFormat", preset.mapping.dateFormat);
    if (preset.mapping.delimiter)
      form.setValue("delimiter", preset.mapping.delimiter);
    if (preset.mapping.decimalSeparator)
      form.setValue("decimalSeparator", preset.mapping.decimalSeparator);
  }

  const sample = dateFormat ? DATE_FORMAT_SAMPLES[dateFormat] : undefined;

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="presetCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start from a known layout</FormLabel>
            <Select
              value={field.value || "none"}
              onValueChange={handlePresetChange}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                <SelectItem value="none">Set the columns myself</SelectItem>
                {(presetsQuery.data?.presets ?? []).map((preset) => (
                  <SelectItem key={preset.code} value={preset.code}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              A layout is only a starting point — every column below can still
              be changed.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="delimiter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Between fields</FormLabel>
              <FormControl>
                <Input {...field} maxLength={1} className="font-mono" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="decimalSeparator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decimal mark</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  <SelectItem value=".">1234.56</SelectItem>
                  <SelectItem value=",">1234,56</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="skipRows"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rows above the header</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="numeric"
                  className="tabular-nums"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COLUMN_FIELDS.map((column) => (
          <FormField
            key={column.name}
            control={form.control}
            name={column.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{column.label}</FormLabel>
                {detectedColumns.length > 0 ? (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a column" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      <SelectItem value="none">Not in this file</SelectItem>
                      {detectedColumns.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Column heading"
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <FormField
        control={form.control}
        name="dateFormat"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How the dates in this file are written</FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Pick the date layout" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {STATEMENT_DATE_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format} — {DATE_FORMAT_SAMPLES[format].sample}{" "}
                    {DATE_FORMAT_SAMPLES[format].meaning}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <p
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-label",
          warningTone.surface,
          warningTone.ink,
          warningTone.rule,
        )}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {sample
            ? `With this setting, ${sample.sample} in the file ${sample.meaning}. Get this wrong and money moves into the wrong month.`
            : "03/04/2026 is 3 April in Mumbai and 4 March in Denver. Nothing here guesses — say which one this file means."}
        </span>
      </p>

      <FormField
        control={form.control}
        name="rememberMapping"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <FormLabel>Remember this for the account</FormLabel>
              <FormDescription>
                Next import starts from these settings.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
