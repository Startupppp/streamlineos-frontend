"use client";

import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Template columns ─── */

const TEMPLATE_COLUMNS = [
  "category",
  "amount",
  "description",
  "merchant",
  "payment_method",
  "expense_date",
] as const;

const ALLOWED_CATEGORIES = [
  "Travel",
  "Food",
  "Office Supplies",
  "Software",
  "Hardware",
  "Marketing",
  "Entertainment",
  "Utilities",
  "Rent",
  "Insurance",
  "Salary",
  "Miscellaneous",
  "Other",
];

const SAMPLE_ROWS = [
  ["Travel", "1500", "Flight to Mumbai", "IndiGo", "Company Card", "2026-01-15"],
  ["Food", "350", "Team lunch", "Barbeque Nation", "UPI", "2026-01-20"],
  ["Software", "2999", "Annual Figma subscription", "Figma Inc", "Company Card", "2026-02-01"],
  ["Office Supplies", "800", "Printer paper and toner", "Amazon", "Personal Card", "2026-02-10"],
  ["Marketing", "5000", "Social media ads", "Meta Ads", "Bank Transfer", "2026-03-05"],
];

/* ─── Parsed row type ─── */

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

export function ImportExpenseSheet({
  open,
  onOpenChange,
  onSuccess,
}: ImportExpenseSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count: number;
    skipped: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Reset state ─── */
  const resetState = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setCategoryMapping({});
    setImportResult(null);
    setIsImporting(false);
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  /* ─── Download Excel template ─── */
  const handleDownloadTemplate = async () => {
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
  };

  /* ─── Parse uploaded file (client-side preview) ─── */
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
        headers.forEach((h, i) => {
          record[h] = values[i] || "";
        });

        const rawCategory = record.category || "Other";
        const amount = parseFloat(record.amount);
        const description = record.description || "";
        const merchant = record.merchant || "";
        const paymentMethod =
          record.paymentmethod || record["payment_method"] || record["payment method"] || "";
        const expenseDate =
          record.expensedate || record["expense_date"] || record["expense date"] || record.date || "";

        const errors: string[] = [];
        if (isNaN(amount) || amount <= 0) errors.push("Invalid amount");
        if (!rawCategory) errors.push("Missing category");
        if (!allowedSet.has(rawCategory.toLowerCase())) {
          unmappedCategories.add(rawCategory);
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(expenseDate)) errors.push("Invalid date (use YYYY-MM-DD)");

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

      // Pre-fill category mapping for unmapped categories
      const mapping: Record<string, string> = {};
      unmappedCategories.forEach((cat) => {
        // Try to find a close match
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

  /* ─── Handle file selection ─── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Only parse CSV client-side for preview; xlsx will be sent directly
    if (selectedFile.name.endsWith(".csv")) {
      parseFile(selectedFile);
    } else {
      // For xlsx, we can't easily parse client-side; show basic info
      setParsedRows([]);
    }
  };

  /* ─── Upload & import ─── */
  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Send category mapping as JSON if we have any
      if (Object.keys(categoryMapping).length > 0) {
        formData.append("categoryMapping", JSON.stringify(categoryMapping));
      }

      const response = await fetch("/api/expenses/import", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setImportResult({
          success: true,
          count: result.count ?? 0,
          skipped: result.skipped ?? 0,
        });
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
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#bd882c]" />
            Import Expenses
          </SheetTitle>
          <SheetDescription>
            Upload a CSV file to bulk-import expenses. All data (including previous months) will be stored.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* ─── Step 1: Download Template ─── */}
          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                1
              </div>
              <Label className="text-sm font-semibold">Download Template</Label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Download the Excel template to ensure your data is in the correct format.
              The template includes sample rows to guide you.
            </p>
            <div className="pl-8">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-3.5 w-3.5" />
                Download Template (.xlsx)
              </Button>
            </div>
            <div className="pl-8">
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors">
                  View required columns
                </summary>
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

          {/* ─── Step 2: Upload File ─── */}
          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                2
              </div>
              <Label className="text-sm font-semibold">Upload File</Label>
            </div>

            {!file ? (
              <div
                className="pl-8 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-gold/50 hover:bg-gold/5">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV or Excel (.xlsx, .xls) — Max 5MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="pl-8">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <FileText className="h-8 w-8 text-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      resetState();
                    }}
                    aria-label="Remove file"
                  >
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

          {/* ─── Step 3: Validation Preview (CSV only) ─── */}
          {file && parsedRows.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
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
                  {/* Stats */}
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

                  {/* Category Mapping (if unmapped) */}
                  {Object.keys(categoryMapping).length > 0 && (
                    <div className="pl-8 space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Category Mapping
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Some categories in your file don&apos;t match. Map them below:
                      </p>
                      {Object.entries(categoryMapping).map(([original, mapped]) => (
                        <div key={original} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate w-24">
                            &quot;{original}&quot;
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Select
                            value={mapped}
                            onValueChange={(v) =>
                              setCategoryMapping((prev) => ({
                                ...prev,
                                [original]: v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALLOWED_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat} className="text-xs">
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Row preview table */}
                  <div className="pl-8">
                    <ScrollArea className="h-48 rounded-md border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-2 py-1.5 text-left font-medium">#</th>
                            <th className="px-2 py-1.5 text-left font-medium">Date</th>
                            <th className="px-2 py-1.5 text-left font-medium">Category</th>
                            <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                            <th className="px-2 py-1.5 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.slice(0, 50).map((row, idx) => (
                            <tr
                              key={idx}
                              className={cn(
                                "border-b",
                                !row.valid && "bg-destructive/5"
                              )}
                            >
                              <td className="px-2 py-1 text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td className="px-2 py-1">{row.expenseDate || "—"}</td>
                              <td className="px-2 py-1">{row.category}</td>
                              <td className="px-2 py-1 text-right font-medium">
                                {row.amount > 0 ? `₹${row.amount.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="px-2 py-1">
                                {row.valid ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <span
                                    className="text-destructive"
                                    title={row.error}
                                  >
                                    <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                                    {row.error}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                    {parsedRows.length > 50 && (
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Showing first 50 of {parsedRows.length} rows
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Import Result ─── */}
          {importResult && (
            <div
              className={cn(
                "rounded-lg border p-4",
                importResult.success
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                  : "border-destructive bg-destructive/10"
              )}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">
                    Successfully imported {importResult.count} expense(s)
                  </p>
                  {importResult.skipped > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {importResult.skipped} row(s) skipped due to validation errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Actions ─── */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
            >
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
