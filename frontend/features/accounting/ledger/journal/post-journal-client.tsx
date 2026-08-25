"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import {
  useAccountingBook,
  usePostableAccounts,
  usePostJournal,
} from "@/hooks/api/accounting/ledger";
import { getApiErrorCode, isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayString } from "@/lib/date-utils";
import { lineMinor, journalTotals, readLineIndex } from "./journal-totals";
import { JournalLineRows } from "./journal-line-rows";
import { JournalTotalsBar } from "./journal-totals-bar";
import {
  EMPTY_JOURNAL_LINE,
  journalFormSchema,
  type JournalFormValues,
} from "./journal-schema";

function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export function PostJournalClient() {
  const router = useRouter();
  const canPost = useCan("accounting:journal:post");
  const { data: book } = useAccountingBook();
  const { data: accounts } = usePostableAccounts();
  const postJournal = usePostJournal();

  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [offendingLineIndex, setOffendingLineIndex] = useState<number | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  const currency = book?.baseCurrency ?? "";

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: {
      journalDate: getTodayString(),
      memo: "",
      lines: [{ ...EMPTY_JOURNAL_LINE }, { ...EMPTY_JOURNAL_LINE, side: "credit" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = form.watch("lines");
  const totals = journalTotals(watchedLines ?? [], currency);

  const accountOptions = useMemo(
    () =>
      (accounts ?? []).map((account) => ({
        value: account.id,
        label: `${account.code} · ${account.name}`,
        sublabel: account.isCash ? "Bank or cash" : undefined,
      })),
    [accounts],
  );

  function handleSubmit(values: JournalFormValues) {
    setRejection(null);
    setOffendingLineIndex(null);

    const lines = values.lines.map((line) => {
      const minor = lineMinor(line, currency);
      return {
        accountId: line.accountId,
        debitMinor: line.side === "debit" ? (minor ?? 0) : 0,
        creditMinor: line.side === "credit" ? (minor ?? 0) : 0,
        description: line.description === "" ? undefined : line.description,
      };
    });

    postJournal.mutate(
      {
        idempotencyKey,
        journalDate: values.journalDate,
        memo: values.memo === "" ? undefined : values.memo,
        sourceType: "manual",
        lines,
      },
      {
        onSuccess: (journal) => {
          toast.success(`Journal ${journal.journalNumber} posted`);
          setIdempotencyKey(newIdempotencyKey());
          router.push(`/accounting/journal/${journal.id}`);
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            const index = readLineIndex(error.details);
            setOffendingLineIndex(index ?? null);
            setRejection(rejectionMessage(getApiErrorCode(error), getErrorMessage(error)));
            setIdempotencyKey(newIdempotencyKey());
            return;
          }
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  if (!canPost) return <NoPermissionState permission="accounting:journal:post" />;

  return (
    <PageWrapper
      title="New journal entry"
      subtitle="Two sides, equal totals. Once posted it can be reversed but never edited."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-h-0 w-full flex-1 flex-col gap-3"
        >
          <Card className="py-0">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="journalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is this for?</FormLabel>
                    <FormControl>
                      <Input placeholder="Month-end accrual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {rejection ? (
            <div
              role="alert"
              className="rounded-xl border border-status-danger-rule bg-status-danger-surface p-4"
            >
              <p className="text-sm font-semibold text-status-danger-ink">
                The ledger refused this entry
              </p>
              <p className="mt-1 text-label text-foreground/80">{rejection}</p>
            </div>
          ) : null}

          <JournalLineRows
            form={form}
            accountOptions={accountOptions}
            fields={fields}
            offendingLineIndex={offendingLineIndex}
            onRemove={remove}
          />

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ ...EMPTY_JOURNAL_LINE })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add line
            </Button>
            {form.formState.errors.lines?.root ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.lines.root.message}
              </p>
            ) : null}
          </div>

          <JournalTotalsBar totals={totals} currency={currency} />

          {totals.invalidLineIndexes.length > 0 ? (
            <p className="text-xs text-destructive" role="alert">
              Some amounts are not valid {currency || "currency"} figures. Use numbers only, with
              at most the usual number of decimal places.
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pb-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isPending={postJournal.isPending}
              disabled={!totals.balanced || totals.invalidLineIndexes.length > 0}
            >
              Post entry
            </LoadingButton>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}

function rejectionMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "UNBALANCED":
      return "Debits and credits are not equal, so this entry cannot be posted.";
    case "PERIOD_LOCKED":
      return "The accounting period covering this date is locked. Pick a later date, or ask someone with reopen rights to unlock it.";
    case "ACCOUNT_IS_HEADER":
      return "One of the accounts on this entry is a grouping row. Grouping rows organise the chart and can never be posted to — pick the account underneath it.";
    case "ACCOUNT_INACTIVE":
      return "One of the accounts on this entry has been switched off. Turn it back on in the chart of accounts, or pick another account.";
    case "ACCOUNT_CURRENCY_RESTRICTED":
      return "One of the accounts on this entry only accepts a different currency.";
    case "PERIOD_NOT_FOUND":
      return "No accounting period covers this date. Open the fiscal year first.";
    default:
      return fallback;
  }
}
