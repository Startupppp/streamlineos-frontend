"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingButton } from "@/components/ui/loading-button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { PageState } from "@/components/shared/page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useBankAccounts,
  useImportBankStatement,
  useSaveCsvMapping,
} from "@/hooks/api/accounting/banking";
import type { CsvColumnMapping, StatementImportResult } from "@/types/accounting-banking";
import { ColumnMappingFields } from "./column-mapping-fields";
import { ImportResultPanel } from "./import-result-panel";
import { textOrUndefined } from "../lib/form-values";
import { statementImportSchema, type StatementImportFormValues } from "./statement-import-schema";

const MAX_FILE_BYTES = 8_000_000;

export function StatementImportPage() {
  const canManage = useCan("accounting:banking:manage");

  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<StatementImportResult | null>(null);

  const accountsQuery = useBankAccounts({ page: 1, pageSize: 100 });

  const pageState = usePageState({
    permission: "accounting:banking:import",
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    error: accountsQuery.error,
  });
  const importStatement = useImportBankStatement();
  const saveCsvMapping = useSaveCsvMapping();

  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      (accountsQuery.data?.items ?? [])
        .filter((account) => account.isActive)
        .map((account) => ({
          value: account.id,
          label: account.displayName,
          sublabel: `${account.bankName ?? account.accountName} · ${account.currency}`,
        })),
    [accountsQuery.data],
  );

  const form = useForm<StatementImportFormValues>({
    resolver: zodResolver(statementImportSchema),
    defaultValues: {
      bankProfileId: "",
      periodStart: "",
      periodEnd: "",
      opening: "",
      closing: "",
      presetCode: "",
      dateColumn: "",
      descriptionColumn: "",
      referenceColumn: "",
      amountColumn: "",
      debitColumn: "",
      creditColumn: "",
      dateFormat: undefined,
      skipRows: "0",
      delimiter: ",",
      decimalSeparator: ".",
      rememberMapping: false,
    },
  });

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is too large. Split the statement into smaller periods.");
      return;
    }
    const text = await file.text();
    setFileContent(text);
    setFileName(file.name);
  }

  function handleSubmit(values: StatementImportFormValues): void {
    if (!fileContent) {
      toast.error("Choose the statement file first");
      return;
    }
    if (!values.dateFormat) {
      toast.error("Say how the dates in this file are written");
      return;
    }

    const mapping: CsvColumnMapping = {
      dateColumn: values.dateColumn.trim(),
      descriptionColumn: textOrUndefined(values.descriptionColumn),
      referenceColumn: textOrUndefined(values.referenceColumn),
      amountColumn: textOrUndefined(values.amountColumn),
      debitColumn: textOrUndefined(values.debitColumn),
      creditColumn: textOrUndefined(values.creditColumn),
      dateFormat: values.dateFormat,
      skipRows: Number(values.skipRows),
      delimiter: values.delimiter,
      decimalSeparator: values.decimalSeparator,
    };

    importStatement.mutate(
      {
        bankProfileId: values.bankProfileId,
        content: fileContent,
        fileName: fileName || undefined,
        mapping,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        opening: values.opening.trim(),
        closing: values.closing.trim(),
      },
      {
        onSuccess: (imported) => {
          toast.success("Statement brought in");
          setResult(imported);
          if (values.rememberMapping && canManage) {
            saveCsvMapping.mutate({
              bankAccountId: values.bankProfileId,
              input: { mapping },
            });
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleImportAnother(): void {
    setResult(null);
    setFileContent("");
    setFileName("");
    form.reset();
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Bring in a statement" backHref="/accounting/banking" backLabel="Back to banking">
        <PageState resolution={pageState} loading={null} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Bring in a statement"
      subtitle="A CSV from the bank, read exactly the way you tell us to read it."
      backHref="/accounting/banking"
      backLabel="Back to banking"
    >
      <div className="mx-auto w-full max-w-3xl">
        {result ? (
          <ImportResultPanel result={result} onImportAnother={handleImportAnother} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <Card>
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-sm font-semibold">The file and the period</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <FormField
                    control={form.control}
                    name="bankProfileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Which account</FormLabel>
                        <FormControl>
                          <Combobox
                            options={accountOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Choose a bank account"
                            searchPlaceholder="Search accounts…"
                            emptyText="No bank account set up yet."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Statement file</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".csv,text/csv,text/plain"
                        onChange={(event) => void handleFileChange(event)}
                      />
                    </FormControl>
                    {fileName ? (
                      <p className="text-label text-muted-foreground">Reading {fileName}</p>
                    ) : null}
                  </FormItem>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="periodStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period from</FormLabel>
                          <FormControl>
                            <DatePicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="periodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period to</FormLabel>
                          <FormControl>
                            <DatePicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="opening"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Balance the statement opens at</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" className="tabular-nums" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="closing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Balance the statement closes at</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="decimal" className="tabular-nums" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-sm font-semibold">
                    How to read the columns
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ColumnMappingFields form={form} fileContent={fileContent} />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <LoadingButton type="submit" isPending={importStatement.isPending}>
                  Bring it in
                </LoadingButton>
              </div>
            </form>
          </Form>
        )}
      </div>
    </PageWrapper>
  );
}
