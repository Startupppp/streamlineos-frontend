"use client";

import { useCallback, useMemo } from "react";
import {
  FileSpreadsheet, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ALLOWED_CATEGORIES = [
  "Travel", "Food", "Office Supplies", "Software", "Hardware", "Marketing",
  "Entertainment", "Utilities", "Rent", "Insurance", "Salary", "Miscellaneous", "Other",
];

interface ParsedRow {
  category: string;
  amount: number;
  description: string;
  merchant: string;
  paymentMethod: string;
  expenseDate: string;
  valid: boolean;
  error?: string;
}

interface ParsedRowWithIndex extends ParsedRow {
  _index: number;
}

interface CategoryMappingRowProps {
  original: string;
  mapped: string;
  onValueChange: (original: string, value: string) => void;
}

function CategoryMappingRow({ original, mapped, onValueChange }: CategoryMappingRowProps) {
  const handleChange = useCallback(
    (v: string) => onValueChange(original, v),
    [original, onValueChange],
  );
  return (
    <div className="flex items-center gap-2">
      <TruncatedText text={`"${original}"`} className="text-xs text-muted-foreground w-24" />
      <span className="text-xs text-muted-foreground">→</span>
      <Select value={mapped} onValueChange={handleChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {ALLOWED_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ImportValidationPreviewProps {
  parsedRows: ParsedRow[];
  isParsing: boolean;
  categoryMapping: Record<string, string>;
  onCategoryMappingChange: (original: string, value: string) => void;
}

export function ImportValidationPreview({
  parsedRows,
  isParsing,
  categoryMapping,
  onCategoryMappingChange,
}: ImportValidationPreviewProps) {
  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  const displayRows = useMemo<ParsedRowWithIndex[]>(
    () => parsedRows.slice(0, 50).map((row, idx) => ({ ...row, _index: idx })),
    [parsedRows],
  );

  const columns = useMemo<DataTableColumn<ParsedRowWithIndex>[]>(() => [
    {
      key: "num",
      header: "#",
      cell: (row) => <span className="text-muted-foreground">{row._index + 1}</span>,
    },
    {
      key: "expenseDate",
      header: "Date",
      cell: (row) => <span>{row.expenseDate || "—"}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => <span>{row.category}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span className="font-medium">
          {row.amount > 0 ? `₹${row.amount.toLocaleString("en-IN")}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) =>
        row.valid ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <span className="text-destructive" title={row.error}>
            <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
            {row.error}
          </span>
        ),
    },
  ], []);

  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          3
        </div>
        <Label className="text-sm font-semibold">Validation Preview</Label>
      </div>

      {isParsing ? (
        <div className="pl-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Parsing file...
        </div>
      ) : (
        <>
          <div className="pl-8 flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <FileSpreadsheet className="h-3 w-3" />
              {parsedRows.length} rows
            </Badge>
            <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              {validCount} valid
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} invalid
              </Badge>
            )}
          </div>

          {Object.keys(categoryMapping).length > 0 && (
            <div className="pl-8 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Category Mapping</Label>
              <p className="text-xs text-muted-foreground">
                Some categories in your file don&apos;t match. Map them below:
              </p>
              {Object.entries(categoryMapping).map(([original, mapped]) => (
                <CategoryMappingRow
                  key={original}
                  original={original}
                  mapped={mapped}
                  onValueChange={onCategoryMappingChange}
                />
              ))}
            </div>
          )}

          <div className="pl-8">
            <DataTable
              data={displayRows}
              columns={columns}
              getRowKey={(row) => row._index}
              className="h-48 text-xs"
              rowClassName={(row) => row.valid ? "" : "bg-destructive/5"}
            />
            {parsedRows.length > 50 && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Showing first 50 of {parsedRows.length} rows
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
