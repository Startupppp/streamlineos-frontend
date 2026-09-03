"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload, ArrowRight, AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useBankAccounts, useCreateBankImport } from "@/hooks/api/accounting/banking";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BankImportResult, CreateBankImportInput } from "@/hooks/api/accounting/banking";
import { parseCsvFile } from "../lib/parse-csv";
import type { ParsedCsv } from "../lib/parse-csv";
import { BankImportStep2 } from "./bank-import-step2";

const MOTION_VARIANTS = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

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

const DEFAULT_MAPPING: ColumnMapping = {
  date: "",
  description: "",
  amountMode: "single",
  amount: "",
  debit: "",
  credit: "",
  reference: "",
  counterparty: "",
};

function StepDot({ step, current }: { step: number; current: number }) {
  const done = step < current;
  const active = step === current;
  return (
    <div
      className={[
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
        done
          ? "bg-primary border-primary text-primary-foreground"
          : active
            ? "bg-background border-primary text-primary"
            : "bg-background border-border text-muted-foreground",
      ].join(" ")}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : step}
    </div>
  );
}

export function BankImportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultAccountId = searchParams.get("bankAccountId") ?? "";

  const [step, setStep] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState("");
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [importResult, setImportResult] = useState<BankImportResult | null>(null);

  const accountsQuery = useBankAccounts();
  const accounts = accountsQuery.data?.data ?? [];
  const importMutation = useCreateBankImport();

  const selectedAccount = accounts.find((a) => String(a.id) === selectedAccountId);
  const step1Valid = selectedAccountId !== "" && parsedCsv !== null;
  const step2Valid = mapping.date !== "" && mapping.description !== "";

  function handleAccountChange(value: string) {
    setSelectedAccountId(value);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const parsed = await parseCsvFile(file);
    setParsedCsv(parsed);
  }

  function handleHeaderToggle(checked: boolean) {
    setHasHeaderRow(checked);
  }

  function handleMappingChange(field: keyof ColumnMapping, value: string) {
    setMapping((prev) => ({ ...prev, [field]: value }));
  }

  function handleDateFormatChange(value: string) {
    setDateFormat(value);
  }

  function handleNext() {
    setStep((s) => Math.min(s + 1, 3));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function handleGoToReconciliation() {
    if (selectedAccountId) {
      router.push(`/accounting/banking/reconciliation?bankAccountId=${selectedAccountId}`);
    } else {
      router.push("/accounting/banking");
    }
  }

  function handleImport() {
    if (!parsedCsv || !selectedAccountId) return;

    const columnMapping: CreateBankImportInput["columnMapping"] =
      mapping.amountMode === "single"
        ? {
            date: mapping.date,
            description: mapping.description,
            amount: mapping.amount || undefined,
            reference: mapping.reference || undefined,
            counterparty: mapping.counterparty || undefined,
          }
        : {
            date: mapping.date,
            description: mapping.description,
            debit: mapping.debit || undefined,
            credit: mapping.credit || undefined,
            reference: mapping.reference || undefined,
            counterparty: mapping.counterparty || undefined,
          };

    importMutation.mutate(
      {
        bankAccountId: parseInt(selectedAccountId, 10),
        fileName,
        columnMapping,
        rows: parsedCsv.rows,
        dateFormat,
        hasHeaderRow,
      },
      {
        onSuccess: (result) => {
          setImportResult(result);
        },
      },
    );
  }

  if (importResult) {
    return (
      <PageWrapper
        title="Import Complete"
        subtitle="Your bank statement has been imported."
        backHref="/accounting/banking"
      >
        <div className="max-w-lg mx-auto mt-6 bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-status-success-surface flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-status-success-ink" />
            </div>
            <div>
              <p className="text-sm font-semibold">Import successful</p>
              <p className="text-xs text-muted-foreground">{fileName}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-lg font-semibold text-foreground">{importResult.importedCount}</p>
              <p className="text-micro text-muted-foreground">Imported</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-lg font-semibold text-muted-foreground">
                {importResult.duplicateCount}
              </p>
              <p className="text-micro text-muted-foreground">Duplicates</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-lg font-semibold text-status-danger-ink">
                {importResult.errors.length}
              </p>
              <p className="text-micro text-muted-foreground">Errors</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-status-danger-surface border border-status-danger-rule rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-status-danger-ink text-xs font-medium mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Import errors
              </div>
              {importResult.errors.slice(0, 5).map((err, i) => (
                <p key={i} className="text-dense text-status-danger-ink">{err}</p>
              ))}
              {importResult.errors.length > 5 && (
                <p className="text-dense text-status-danger-ink">
                  +{importResult.errors.length - 5} more errors
                </p>
              )}
            </div>
          )}

          <Button className="w-full" onClick={handleGoToReconciliation}>
            Go to Reconciliation
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Import Statement"
      subtitle="Upload a CSV bank statement and map columns."
      backHref="/accounting/banking"
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <StepDot step={s} current={step} />
              {s < 3 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
          <div className="ml-3 text-xs text-muted-foreground">Step {step} of 3</div>
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="step1"
                variants={MOTION_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="bg-card border border-border rounded-xl p-6 space-y-4"
              >
                <h2 className="text-sm font-semibold">Account & File</h2>

                <div className="space-y-1.5">
                  <Label className="text-xs">Bank Account</Label>
                  <Select value={selectedAccountId} onValueChange={handleAccountChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}{a.bankName ? ` — ${a.bankName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {accountsQuery.isError && (
                    <p className="text-xs text-destructive" role="alert">
                      Couldn&apos;t load bank accounts: {getErrorMessage(accountsQuery.error)}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">CSV File</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-2">
                      {fileName ? fileName : "Drop your CSV or click to browse"}
                    </p>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        Browse
                      </span>
                      <input
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  {parsedCsv && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-micro">
                        {parsedCsv.rowCount} rows
                      </Badge>
                      <Badge variant="outline" className="text-micro">
                        {parsedCsv.headers.length} columns
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="header-row"
                    checked={hasHeaderRow}
                    onCheckedChange={handleHeaderToggle}
                  />
                  <Label htmlFor="header-row" className="text-xs cursor-pointer">
                    First row is a header
                  </Label>
                </div>

                <Button className="w-full" disabled={!step1Valid} onClick={handleNext}>
                  Next: Map Columns
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {step === 2 && parsedCsv && (
              <motion.div
                key="step2"
                variants={MOTION_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <BankImportStep2
                  parsedCsv={parsedCsv}
                  mapping={mapping}
                  dateFormat={dateFormat}
                  onMappingChange={handleMappingChange}
                  onDateFormatChange={handleDateFormatChange}
                  onBack={handleBack}
                  onNext={handleNext}
                  isValid={step2Valid}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={MOTION_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="bg-card border border-border rounded-xl p-6 space-y-4"
              >
                <h2 className="text-sm font-semibold">Review & Import</h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-medium">{selectedAccount?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">File</span>
                    <span className="font-medium truncate max-w-[200px]">{fileName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Rows to import</span>
                    <span className="font-medium">{parsedCsv?.rowCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Date format</span>
                    <span className="font-medium">{dateFormat}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Amount mode</span>
                    <span className="font-medium capitalize">
                      {mapping.amountMode === "single" ? "Single column" : "Debit / Credit"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Has header row</span>
                    <span className="font-medium">{hasHeaderRow ? "Yes" : "No"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleBack}>
                    Back
                  </Button>
                  <LoadingButton
                    className="flex-1"
                    isPending={importMutation.isPending}
                    loadingText="Importing…"
                    onClick={handleImport}
                  >
                    Import Transactions
                  </LoadingButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
