"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DataTable,
  DataTableSkeleton,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useJournal } from "@/hooks/api/accounting/ledger";
import { formatMinorMoney } from "@/lib/accounting/money";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import type { JournalLine } from "@/types/accounting-kernel";
import { ReverseJournalDialog } from "./reverse-journal-dialog";

interface JournalViewClientProps {
  journalId: string;
}

export function JournalViewClient({ journalId }: JournalViewClientProps) {
  const canRead = useCan("accounting:journal:read");
  const canPost = useCan("accounting:journal:post");
  const [reverseOpen, setReverseOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useJournal(journalId);
  const currency = data?.functionalCurrency ?? "";

  const columns: DataTableColumn<JournalLine>[] = [
    {
      key: "line",
      header: "#",
      className: "w-10 font-mono text-dense tabular-nums",
      cell: (row) => row.lineNo,
    },
    {
      key: "account",
      header: "Account",
      cell: (row) => (
        <Link
          href={`/accounting/general-ledger?accountId=${row.accountId}`}
          className="truncate text-status-info-ink hover:underline"
        >
          <span className="mr-2 font-mono text-dense">{row.accountCode}</span>
          {row.accountName}
        </Link>
      ),
    },
    {
      key: "description",
      header: "Note",
      cell: (row) => (
        <span className="truncate text-muted-foreground">{row.description ?? "—"}</span>
      ),
    },
    {
      key: "debit",
      header: "Debit",
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.debitMinor === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatMinorMoney(row.debitMinor, currency)
        ),
    },
    {
      key: "credit",
      header: "Credit",
      className: "text-right font-mono tabular-nums whitespace-nowrap",
      headerClassName: "text-right",
      cell: (row) =>
        row.creditMinor === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatMinorMoney(row.creditMinor, currency)
        ),
    },
  ];

  const isReversed = !!data?.reversedByJournalId;

  return (
    <PageWrapper
      title={data ? `Journal ${data.journalNumber}` : "Journal"}
      subtitle={data ? `Posted on ${formatShortDate(data.journalDate)}` : undefined}
      backHref="/accounting"
      backLabel="Back to accounting"
      badge={
        data ? (
          <span>{isReversed ? "Reversed" : data.sourceType.replace(/_/g, " ")}</span>
        ) : undefined
      }
      actions={
        data && canPost && !isReversed && !data.reversesJournalId ? (
          <Button variant="outline" size="sm" onClick={() => setReverseOpen(true)}>
            Reverse this entry
          </Button>
        ) : undefined
      }
    >
      {!canRead ? (
        <NoPermissionState permission="accounting:journal:read" />
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load this journal"
          description={getErrorMessage(error)}
          onRetry={refetch}
        />
      ) : isLoading || !data ? (
        <DataTableSkeleton rows={6} columns={5} />
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
          <Card className="py-0">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <Detail label="What it is for" value={data.memo ?? "No note was left"} />
              <Detail
                label="Total"
                value={formatMinorMoney(data.totalDebitMinor, data.functionalCurrency)}
              />
              <Detail label="Currency" value={data.functionalCurrency} />
            </CardContent>
          </Card>

          {data.reversesJournalId ? (
            <LinkedJournalNote
              text="This entry was written to reverse an earlier one."
              href={`/accounting/journal/${data.reversesJournalId}`}
              label="Open the entry it reverses"
            />
          ) : null}
          {data.reversedByJournalId ? (
            <LinkedJournalNote
              text="This entry has been reversed. Both it and its reversal stay on the record."
              href={`/accounting/journal/${data.reversedByJournalId}`}
              label="Open the reversal"
            />
          ) : null}

          <Card className="overflow-hidden py-0">
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                data={data.lines}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="840px"
                pagination={{ pageSize: 50 }}
                footer={
                  <div className="flex items-center justify-end gap-6 font-mono text-label font-semibold tabular-nums text-foreground">
                    <span>Debits {formatMinorMoney(data.totalDebitMinor, data.functionalCurrency)}</span>
                    <span>
                      Credits {formatMinorMoney(data.totalCreditMinor, data.functionalCurrency)}
                    </span>
                  </div>
                }
              />
            </CardContent>
          </Card>

          <ReverseJournalDialog
            journal={data}
            open={reverseOpen}
            onOpenChange={setReverseOpen}
          />
        </div>
      )}
    </PageWrapper>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-dense font-medium text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function LinkedJournalNote({
  text,
  href,
  label,
}: {
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-label text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
