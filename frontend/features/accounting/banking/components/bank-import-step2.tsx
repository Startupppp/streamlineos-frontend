"use client";

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
                ? "bg-blue-50 text-blue-700 border-blue-200"
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
                ? "bg-blue-50 text-blue-700 border-blue-200"
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
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead className="bg-muted/40">
              <tr>
                {parsedCsv.headers.map((h, i) => (
                  <th
                    key={i}
                    className={[
                      "px-2 py-1.5 text-left font-medium text-muted-foreground",
                      i === dateColIndex || i === descColIndex
                        ? "bg-blue-50 text-blue-700"
                        : "",
                    ].join(" ")}
                  >
                    {h || `Col ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri} className="border-t border-border/50">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={[
                        "px-2 py-1 text-foreground truncate max-w-[120px]",
                        ci === dateColIndex || ci === descColIndex
                          ? "bg-blue-50/50"
                          : "",
                      ].join(" ")}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
