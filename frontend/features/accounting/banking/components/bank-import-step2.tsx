"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DATE_FORMAT_OPTIONS } from "../lib/parse-csv";
import type { ParsedCsv } from "../lib/parse-csv";

interface ColumnMapping {
  date: string;
  description: string;
  amountMode: "single" | "debit-credit";
  amount: string;
  debit: string;
  credit: string;
  reference: string;
  counterparty: string;
}

interface Props {
  parsedCsv: ParsedCsv;
  mapping: ColumnMapping;
  dateFormat: string;
  onMappingChange: (field: keyof ColumnMapping, value: string) => void;
  onDateFormatChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  isValid: boolean;
}

interface CsvPreviewRow {
  [key: string]: string | number;
  _rowIdx: number;
}

export function BankImportStep2({
  parsedCsv,
  mapping,
  dateFormat,
  onMappingChange,
  onDateFormatChange,
  onBack,
  onNext,
  isValid,
}: Props) {
  const columnOptions = parsedCsv.headers.map((h, i) => ({
    value: String(i),
    label: h || `Col ${i + 1}`,
  }));
  const previewRows = parsedCsv.rows.slice(0, 5);
  const dateColIndex = parseInt(mapping.date, 10);
  const descColIndex = parseInt(mapping.description, 10);

  const csvTableData = useMemo<CsvPreviewRow[]>(
    () => previewRows.map((row, ri) => {
      const obj: CsvPreviewRow = { _rowIdx: ri };
      parsedCsv.headers.forEach((_, ci) => {
        obj[String(ci)] = row[ci] ?? "";
      });
      return obj;
    }),
    [previewRows, parsedCsv.headers],
  );

  const csvTableColumns = useMemo<DataTableColumn<CsvPreviewRow>[]>(
    () =>
      parsedCsv.headers.map((h, i) => {
        const isMapped = i === dateColIndex || i === descColIndex;
        return {
          key: String(i),
          header: h || `Col ${i + 1}`,
          cell: (row) => (
            <span className="truncate max-w-[120px] block">{row[String(i)]}</span>
          ),
          className: isMapped ? "bg-blue-50/50 dark:bg-blue-500/10 px-2 py-1" : "px-2 py-1",
          headerClassName: isMapped ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300" : "",
        };
      }),
    [parsedCsv.headers, dateColIndex, descColIndex],
  );

  function handleAmountModeSelect(mode: "single" | "debit-credit") {
    onMappingChange("amountMode", mode);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold">Column Mapping</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Date column *</Label>
          <Select
            value={mapping.date}
            onValueChange={(v) => onMappingChange("date", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columnOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Date format *</Label>
          <Select value={dateFormat} onValueChange={onDateFormatChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs">Description column *</Label>
          <Select
            value={mapping.description}
            onValueChange={(v) => onMappingChange("description", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columnOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Amount columns</Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleAmountModeSelect("single")}
            className={[
              "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
              mapping.amountMode === "single"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
                : "bg-transparent text-muted-foreground border-border",
            ].join(" ")}
          >
            Single amount
          </button>
          <button
            type="button"
            onClick={() => handleAmountModeSelect("debit-credit")}
            className={[
              "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
              mapping.amountMode === "debit-credit"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
                : "bg-transparent text-muted-foreground border-border",
            ].join(" ")}
          >
            Debit / Credit
          </button>
        </div>

        {mapping.amountMode === "single" ? (
          <Select
            value={mapping.amount}
            onValueChange={(v) => onMappingChange("amount", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Amount column" />
            </SelectTrigger>
            <SelectContent>
              {columnOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={mapping.debit}
              onValueChange={(v) => onMappingChange("debit", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Debit column" />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={mapping.credit}
              onValueChange={(v) => onMappingChange("credit", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Credit column" />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Reference (optional)</Label>
          <Select
            value={mapping.reference}
            onValueChange={(v) => onMappingChange("reference", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {columnOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Counterparty (optional)</Label>
          <Select
            value={mapping.counterparty}
            onValueChange={(v) => onMappingChange("counterparty", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {columnOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {previewRows.length > 0 && (
        <div className="overflow-x-auto">
          <DataTable
            data={csvTableData}
            columns={csvTableColumns}
            getRowKey={(row) => row._rowIdx}
            className="text-[11px]"
            minWidth={`${parsedCsv.headers.length * 120}px`}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button className="flex-1" disabled={!isValid} onClick={onNext}>
          Next: Review
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
