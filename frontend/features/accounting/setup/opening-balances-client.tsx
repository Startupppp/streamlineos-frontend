"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMinorMoney, parseMoneyInput } from "@/lib/accounting/money";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountingBook, usePostableAccounts } from "@/hooks/api/accounting/ledger";
import {
  usePostOpeningBalances,
  usePreviewOpeningBalances,
} from "@/hooks/api/accounting/ledger-mutations";
import type { OpeningBalanceLineInput } from "@/types/accounting-kernel-ext";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OpeningBalancesClient() {
  const canPost = useCan("accounting:journal:post");
  const bookQuery = useAccountingBook();
  const accountsQuery = usePostableAccounts();

  const pageState = usePageState({
    permission: "accounting:settings:read",
    isLoading: bookQuery.isLoading,
    isError: bookQuery.isError,
    error: bookQuery.error,
  });
  const preview = usePreviewOpeningBalances();
  const postBalances = usePostOpeningBalances();

  const [asOfDate, setAsOfDate] = useState(todayIso);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const currency = bookQuery.data?.baseCurrency ?? "INR";
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  const lines: OpeningBalanceLineInput[] = useMemo(() => {
    const result: OpeningBalanceLineInput[] = [];
    for (const [accountId, raw] of Object.entries(amounts)) {
      if (!raw.trim()) continue;
      const minor = parseMoneyInput(raw, currency);
      if (minor === null || minor === 0) continue;
      result.push({ accountId, amountMinor: minor });
    }
    return result;
  }, [amounts, currency]);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      if (line.amountMinor > 0) debit += line.amountMinor;
      else credit += -line.amountMinor;
    }
    return { debit, credit, difference: debit - credit };
  }, [lines]);

  function handleAmountChange(accountId: string, value: string): void {
    setAmounts((current) => ({ ...current, [accountId]: value }));
  }

  function handlePreview(): void {
    preview.mutate(
      { asOfDate, lines },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }

  function handlePost(): void {
    postBalances.mutate(
      { asOfDate, lines },
      {
        onSuccess: (journal) => {
          toast.success(`Opening balances recorded as ${journal.journalNumber}`);
          setAmounts({});
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Opening balances">
        <PageState resolution={pageState} loading={null} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (bookQuery.isPending || accountsQuery.isPending) {
    return (
      <PageWrapper title="Opening balances" subtitle="Where the business stood when the books opened">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Opening balances"
      subtitle="What the business had and owed on the day the books opened"
      backHref="/accounting/setup"
      actions={
        <Button asChild variant="outline">
          <Link href="/accounting/setup">Back to setup</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Start date</CardTitle>
            </div>
            <CardDescription>
              Enter a positive figure for something you own, and a negative one for something you
              owe. Anything left over becomes your accumulated earnings, so you do not have to work
              that out yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="as-of">Books open on</Label>
            <Input
              id="as-of"
              type="date"
              value={asOfDate}
              onChange={(event) => setAsOfDate(event.target.value)}
              className="max-w-xs"
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Balances</CardTitle>
            <CardDescription>Leave an account blank if it had nothing on it.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {accounts.length === 0 ? (
              <EmptyState
                compact
                className="min-h-[24vh] border-0 bg-transparent"
                title="No accounts to open balances on"
                description="Your chart of accounts has no postable accounts yet, so there is nothing to enter here."
                action={{ label: "Set up accounting", href: "/accounting/setup" }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">Account</th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Balance ({currency})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-2">
                          <span className="font-mono text-muted-foreground">{account.code}</span>
                          <span className="ml-2">{account.name}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={amounts[account.id] ?? ""}
                            onChange={(event) => handleAmountChange(account.id, event.target.value)}
                            className="ml-auto max-w-40 text-right font-mono tabular-nums"
                            aria-label={`Opening balance for ${account.name}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex flex-wrap gap-6 font-mono tabular-nums">
              <div>
                <p className="text-dense text-muted-foreground">Owned</p>
                <p className="text-lg font-semibold">{formatMinorMoney(totals.debit, currency)}</p>
              </div>
              <div>
                <p className="text-dense text-muted-foreground">Owed</p>
                <p className="text-lg font-semibold">{formatMinorMoney(totals.credit, currency)}</p>
              </div>
              <div>
                <p className="text-dense text-muted-foreground">Goes to earnings</p>
                <p className="text-lg font-semibold">
                  {formatMinorMoney(Math.abs(totals.difference), currency)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <LoadingButton
                variant="outline"
                isPending={preview.isPending}
                onClick={handlePreview}
                disabled={lines.length === 0}
              >
                Check it
              </LoadingButton>
              {canPost ? (
                <LoadingButton
                  isPending={postBalances.isPending}
                  onClick={handlePost}
                  disabled={lines.length === 0}
                >
                  Record opening balances
                </LoadingButton>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {preview.data ? (
          <Card>
            <CardHeader>
              <CardTitle>What will be recorded</CardTitle>
              <CardDescription>
                Dated {preview.data.journalDate}, the day before your books open, so it never shows
                up as activity in your first month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                {preview.data.differenceMinor === 0
                  ? "Your figures already balance, so nothing goes to earnings."
                  : `${formatMinorMoney(Math.abs(preview.data.differenceMinor), preview.data.currency)} goes to account ${preview.data.balancingAccountCode} as accumulated earnings.`}
              </p>
              {preview.data.alreadyPosted ? (
                <p className="font-medium text-status-warning-ink">
                  Opening balances have already been recorded for this book. Recording them again
                  will return the original entry rather than adding to it.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageWrapper>
  );
}
