"use client";

import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  Upload, Download, FileSpreadsheet, X, Loader2, CheckCircle2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImportValidationPreview } from "./_components/import-validation-preview";

const TEMPLATE_COLUMNS = [
  "category", "amount", "description", "merchant", "payment_method", "expense_date",
] as const;

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

interface ImportExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportExpenseSheet({ open, onOpenChange, onSuccess }: ImportExpenseSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean; count: number; skipped: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setCategoryMapping({});
    setImportResult(null);
    setIsImporting(false);
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSheetOpenChange = useCallback((o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  }, [resetState, onOpenChange]);

  const handleClickUploadArea = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCancel = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleCategoryMappingChange = useCallback((original: string, value: string) => {
    setCategoryMapping((prev) => ({ ...prev, [original]: value }));
  }, []);

  const parseFile = useCallback(async (selectedFile: File) => {
    setIsParsing(true);
    try {
      const text = await selectedFile.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("File must have a header and at least one data row");
        setFile(null);
        setIsParsing(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
      const dataLines = lines.slice(1);
      const allowedSet = new Set(ALLOWED_CATEGORIES.map((c) => c.toLowerCase()));
      const unmappedCategories = new Set<string>();

      const parsed: ParsedRow[] = dataLines.map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const record: Record<string, string> = {};
        headers.forEach((h, i) => { record[h] = values[i] || ""; });

        const rawCategory = record.category || "Other";
        const amount = parseFloat(record.amount);
        const description = record.description || "";
        const merchant = record.merchant || "";
        const paymentMethod = record.paymentmethod || record["payment_method"] || record["payment method"] || "";
        const expenseDate = record.expensedate || record["expense_date"] || record["expense date"] || record.date || "";

        const errors: string[] = [];
        if (isNaN(amount) || amount <= 0) errors.push("Invalid amount");
        if (!rawCategory) errors.push("Missing category");
        if (!allowedSet.has(rawCategory.toLowerCase())) unmappedCategories.add(rawCategory);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) errors.push("Invalid date (use YYYY-MM-DD)");

        return {
          category: rawCategory,
          amount: isNaN(amount) ? 0 : amount,
          description,
          merchant,
          paymentMethod,
          expenseDate,
          valid: errors.length === 0,
          error: errors.length > 0 ? errors.join("; ") : undefined,
        };
      });

      setParsedRows(parsed);

      const mapping: Record<string, string> = {};
      unmappedCategories.forEach((cat) => {
        const lower = cat.toLowerCase();
        const match = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === lower);
        mapping[cat] = match || "Other";
      });
      setCategoryMapping(mapping);
    } catch {
      toast.error("Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const validExtension =
      selectedFile.name.endsWith(".csv") ||
      selectedFile.name.endsWith(".xlsx") ||
      selectedFile.name.endsWith(".xls");

    if (!validTypes.includes(selectedFile.type) && !validExtension) {
      toast.error("Please select a CSV or Excel (.xlsx) file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
    if (selectedFile.name.endsWith(".csv")) {
      parseFile(selectedFile);
    } else {
      setParsedRows([]);
    }
  }, [parseFile]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      await downloadXlsx(`expense_import_template_${format(new Date(), "yyyy-MM-dd")}.xlsx`, [{
        name: "Expenses",
        columns: TEMPLATE_COLUMNS.map((col) => ({
          header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          key: col,
          width: 18,
        })),
        rows: [],
      }]);
      toast.success("Template downloaded");
    } catch {
      toast.error("Failed to download template");
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (Object.keys(categoryMapping).length > 0) {
        formData.append("categoryMapping", JSON.stringify(categoryMapping));
      }
      const response = await fetch("/api/expenses/import", { method: "POST", body: formData });
      const result = await response.json();
      if (response.ok && result.success) {
        setImportResult({ success: true, count: result.count ?? 0, skipped: result.skipped ?? 0 });
        toast.success(`Imported ${result.count ?? 0} expense(s) successfully`);
        onSuccess();
      } else {
        toast.error(result.error || "Failed to import expenses");
        setImportResult(null);
      }
    } catch {
      toast.error("Failed to import expenses");
    } finally {
      setIsImporting(false);
    }
  }, [file, categoryMapping, onSuccess]);

  const validCount = parsedRows.filter((r) => r.valid).length;

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-lg">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-gold" />
            Import Expenses
          </SheetTitle>
          <SheetDescription>
            Upload a CSV file to bulk-import expenses. All data (including previous months) will be stored.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">1</div>
              <Label className="text-sm font-semibold">Download Template</Label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Download the Excel template to ensure your data is in the correct format.
              The template includes sample rows to guide you.
            </p>
            <div className="pl-8">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5" />
                Download Template (.xlsx)
              </Button>
            </div>
            <div className="pl-8">
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors">View required columns</summary>
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                  <p><span className="font-medium text-foreground">category</span> — {ALLOWED_CATEGORIES.join(", ")}</p>
                  <p><span className="font-medium text-foreground">amount</span> — Positive number</p>
                  <p><span className="font-medium text-foreground">description</span> — Text (optional)</p>
                  <p><span className="font-medium text-foreground">merchant</span> — Vendor name (optional)</p>
                  <p><span className="font-medium text-foreground">payment_method</span> — Cash, UPI, Company Card, etc. (optional)</p>
                  <p><span className="font-medium text-foreground">expense_date</span> — YYYY-MM-DD format</p>
                </div>
              </details>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">2</div>
              <Label className="text-sm font-semibold">Upload File</Label>
            </div>

            {!file ? (
              <div className="pl-8 cursor-pointer" onClick={handleClickUploadArea}>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-gold/50 hover:bg-gold/5">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium text-foreground">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV or Excel (.xlsx, .xls) — Max 5MB</p>
                </div>
              </div>
            ) : (
              <div className="pl-8">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <FileText className="h-8 w-8 text-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={resetState} aria-label="Remove file">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              aria-label="Upload expense file"
            />
          </div>

          {file && parsedRows.length > 0 && (
            <ImportValidationPreview
              parsedRows={parsedRows}
              isParsing={isParsing}
              categoryMapping={categoryMapping}
              onCategoryMappingChange={handleCategoryMappingChange}
            />
          )}

          {importResult && (
            <div className={cn(
              "rounded-lg border p-4",
              importResult.success
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                : "border-destructive bg-destructive/10",
            )}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Successfully imported {importResult.count} expense(s)</p>
                  {importResult.skipped > 0 && (
                    <p className="text-xs text-muted-foreground">{importResult.skipped} row(s) skipped due to validation errors</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                className="flex-1 bg-gold hover:bg-gold/90 text-white"
                disabled={!file || isImporting || isParsing}
                onClick={handleImport}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validCount > 0 ? `(${validCount} rows)` : ""}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
