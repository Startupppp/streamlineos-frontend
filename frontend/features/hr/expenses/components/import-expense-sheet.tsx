"use client";

import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Download, X, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrSheet } from "@/components/shared/hr-sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImportValidationPreview } from "@/features/hr/expenses/import-validation-preview";
import { useImportExpenses } from "@/hooks/api/use-import-expenses";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyUploadIllustration } from "@/components/illustrations/illustration-image";
import { activationProps } from "@/lib/keyboard-activation";

/**
 * One declaration of the import contract: what the parser reads, what the
 * template writes, and what the instructions below list.
 *
 * The template used to be generated from a private list with Title Case headers
 * ("Payment Method") while the instructions documented snake_case, and it
 * carried no rows at all although the copy beside it promised "sample rows to
 * guide you". Keeping the three in one place is what stops them drifting again.
 */
const TEMPLATE_COLUMNS = [
  { key: "category", hint: "Travel, Food, Software, …", sample: "Travel" },
  { key: "amount", hint: "Positive number", sample: "450" },
  { key: "description", hint: "Text (optional)", sample: "Cab to client site" },
  { key: "merchant", hint: "Vendor name (optional)", sample: "City Cabs" },
  { key: "payment_method", hint: "Cash, UPI, Company Card, … (optional)", sample: "CASH" },
  { key: "expense_date", hint: "YYYY-MM-DD", sample: "2026-09-20" },
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
  const [autoApprove, setAutoApprove] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean; count: number; skipped: number;
    skippedReasons?: Array<{ row: number; reason: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setCategoryMapping({});
    setAutoApprove(false);
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
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ["text/csv", "application/vnd.ms-excel"];
    const validExtension = selectedFile.name.endsWith(".csv");

    if (!validTypes.includes(selectedFile.type) && !validExtension) {
      toast.error("Please select a CSV file");
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
    parseFile(selectedFile);
  }, [parseFile]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      await downloadXlsx(`expense_import_template_${format(new Date(), "yyyy-MM-dd")}.xlsx`, [{
        name: "Expenses",
        // snake_case, exactly as the instructions below document it and as the
        // parser reads it. The header used to be Title Cased here and
        // snake_case in the docs, so a file built from one did not match the
        // other's description.
        columns: TEMPLATE_COLUMNS.map((col) => ({ header: col.key, key: col.key, width: 18 })),
        // One filled row, because the copy beside this button promises one.
        rows: [Object.fromEntries(TEMPLATE_COLUMNS.map((col) => [col.key, col.sample]))],
      }]);
      toast.success("Template downloaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  const importMutation = useImportExpenses();

  const handleImport = useCallback(async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await importMutation.mutateAsync({
        file,
        autoApprove,
      });
      setImportResult({
        success: true,
        count: result.count ?? 0,
        skipped: result.skipped ?? 0,
        skippedReasons: Array.isArray(result.skippedReasons) ? result.skippedReasons : [],
      });
      toast.success(`Imported ${result.count ?? 0} expense(s) successfully`);
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setImportResult(null);
    } finally {
      setIsImporting(false);
    }
  }, [file, autoApprove, onSuccess, importMutation]);

  const validCount = parsedRows.filter((r) => r.valid).length;

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title="Import Expenses"
      description="Upload a CSV file to bulk-import expenses. Download the template below to get the correct column format."
      onSubmit={importResult ? handleCancel : handleImport}
      submitLabel={
        importResult
          ? "Close"
          : isImporting
            ? "Importing..."
            : file === null
              ? "Choose a file to import"
              : isParsing
                ? "Reading file..."
                : validCount === 0
                  ? "No valid rows to import"
                  : `Import (${validCount} ${validCount === 1 ? "row" : "rows"})`
      }
      isPending={isImporting || isParsing}
      // Import used to be clickable with no file chosen: the handler returned
      // early and the click did nothing at all, with no message. The button now
      // says what it is waiting for.
      submitDisabled={!importResult && (file === null || isParsing || validCount === 0)}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
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
                  {TEMPLATE_COLUMNS.map((col) => (
                    <p key={col.key}>
                      <span className="font-medium text-foreground">{col.key}</span> —{" "}
                      {col.key === "category" ? ALLOWED_CATEGORIES.join(", ") : col.hint}
                    </p>
                  ))}
                  <p className="pt-1">
                    Headers are matched case-insensitively, so{" "}
                    <span className="font-medium text-foreground">payment_method</span>,{" "}
                    <span className="font-medium text-foreground">Payment Method</span> and{" "}
                    <span className="font-medium text-foreground">paymentMethod</span> all work.
                  </p>
                </div>
              </details>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
              <Label className="text-sm font-semibold">Upload File</Label>
            </div>

            {!file ? (
              <div
                className="pl-8 cursor-pointer min-h-[92px]"
                {...activationProps(handleClickUploadArea, "Choose a CSV file to import")}
              >
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <div className="mb-2 h-16 w-16">
                    <EmptyUploadIllustration className="h-full w-full" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV — Max 5MB</p>
                </div>
              </div>
            ) : (
              <div className="pl-8 space-y-2 min-h-[92px]">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <FileText className="w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <TruncatedText text={file.name} className="text-sm font-medium" />
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 shrink-0" onClick={resetState} aria-label="Remove file">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleClickUploadArea}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Replace file
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
              aria-label="Upload expense file"
            />
          </div>

          <div className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Approval Setting</p>
                <p className="text-xs text-muted-foreground">
                  Choose whether imported expenses should be approved immediately.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-approve-expenses"
                  checked={autoApprove}
                  onCheckedChange={(checked) => setAutoApprove(checked === true)}
                />
                <Label htmlFor="auto-approve-expenses" className="text-sm">
                  Auto-approve imported expenses
                </Label>
              </div>
            </div>
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
                ? "border-status-success-rule bg-status-success-surface"
                : "border-destructive bg-destructive/10",
            )}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-status-success-ink" />
                <div>
                  <p className="text-sm font-medium">Successfully imported {importResult.count} expense(s)</p>
                  {importResult.skipped > 0 && (
                    <p className="text-xs text-muted-foreground">{importResult.skipped} row(s) skipped due to validation errors</p>
                  )}
                </div>
              </div>
              {importResult.skipped > 0 && (importResult.skippedReasons?.length ?? 0) > 0 && (
                <details className="mt-3 border-t border-status-success-rule pt-3 text-xs">
                  <summary className="cursor-pointer font-medium text-foreground">
                    View skipped row reasons
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto space-y-1 rounded-md bg-background/60 p-2">
                    {importResult.skippedReasons?.map((item, idx) => (
                      <p key={`${item.row}-${idx}`} className="text-muted-foreground">
                        Row {item.row}: {item.reason}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

      </div>
    </HrSheet>
  );
}
