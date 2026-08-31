"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Upload, GitMerge } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/features/accounting/shared";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { BankTxnStatusBadge } from "./bank-txn-status-badge";
import { useBankAccount, useBankTransactions } from "@/hooks/api/accounting/banking";
import type { BankTransaction, BankTxnStatus } from "@/hooks/api/accounting/banking";
import { TruncatedText } from "@/components/ui/truncated-text";

type StatusFilter = "ALL" | BankTxnStatus;

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "UNMATCHED", label: "Unmatched" },
  { value: "SUGGESTED", label: "Suggested" },
  { value: "MATCHED", label: "Matched" },
  { value: "RECONCILED", label: "Reconciled" },
  { value: "IGNORED", label: "Ignored" },
];

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function isTxnStatus(value: string): value is StatusFilter {
  return (
    value === "ALL" ||
    value === "UNMATCHED" ||
    value === "SUGGESTED" ||
    value === "MATCHED" ||
    value === "RECONCILED" ||
    value === "IGNORED"
  );
}

const PAGE_SIZE = 25;

const TXN_COLUMNS: DataTableColumn<BankTransaction>[] = [
  {
    key: "txnDate",
    header: "Date",
    cell: (row) => (
      <span className="text-dense tabular-nums text-muted-foreground">
        {formatDate(row.txnDate)}
      </span>
    ),
    sortable: true,
    sortValue: (row) => row.txnDate,
    className: "w-[110px]",
  },
  {
    key: "description",
    header: "Description",
    cell: (row) => (
      <TruncatedText text={row.description} className="text-dense" />
    ),
  },
  {
    key: "reference",
    header: "Reference",
    cell: (row) => (
      <span className="text-dense text-muted-foreground font-mono">
        {row.reference ?? "—"}
      </span>
    ),
    className: "w-[130px]",
  },
  {
    key: "counterparty",
    header: "Counterparty",
    cell: (row) => row.counterparty ? (
      <TruncatedText text={row.counterparty} className="text-dense text-muted-foreground" />
    ) : (
      <span className="text-dense text-muted-foreground">—</span>
    ),
    className: "w-[150px]",
  },
  {
    key: "amount",
    header: "Amount",
    cell: (row) => {
      const val = parseFloat(row.amount);
      return (
        <Money
          value={val}
          className={val >= 0 ? "text-status-success-ink" : "text-status-danger-ink"}
        />
      );
    },
    sortable: true,
    sortValue: (row) => parseFloat(row.amount),
    className: "w-[120px] text-right",
    headerClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <BankTxnStatusBadge status={row.status} />,
    className: "w-[110px]",
  },
];

interface Props {
  bankAccountId: string;
}

export function BankAccountDetailClient({ bankAccountId }: Props) {
  const id = Number(bankAccountId);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  function resetCursor() {
    setCursors([null]);
    setCursorIndex(0);
  }

  const accountQuery = useBankAccount(id);
  const txnQuery = useBankTransactions(id, {
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    from: from || undefined,
    to: to || undefined,
    q: search || undefined,
    cursor: cursors[cursorIndex] ?? undefined,
    limit: PAGE_SIZE,
  });

  const account = accountQuery.data;
  const txns = txnQuery.data?.data ?? [];
  const hasMore = txnQuery.data?.pagination.hasMore ?? false;
  const currentPage = cursorIndex + 1;
  const syntheticTotal = hasMore
    ? currentPage * PAGE_SIZE + 1
    : (currentPage - 1) * PAGE_SIZE + txns.length;

  function handleStatusChange(value: string) {
    if (isTxnStatus(value)) {
      setStatusFilter(value);
      resetCursor();
    }
  }

  function handleFromChange(e: ChangeEvent<HTMLInputElement>) {
    setFrom(e.target.value);
    resetCursor();
  }

  function handleToChange(e: ChangeEvent<HTMLInputElement>) {
    setTo(e.target.value);
    resetCursor();
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetCursor();
  }

  function handlePageChange(newPage: number) {
    if (newPage > currentPage && hasMore) {
      const next = txnQuery.data?.pagination.nextCursor ?? null;
      setCursors((prev) => {
        const copy = prev.slice(0, cursorIndex + 1);
        copy.push(next);
        return copy;
      });
      setCursorIndex(cursorIndex + 1);
    } else if (newPage < currentPage) {
      setCursorIndex(Math.max(0, cursorIndex - 1));
    }
  }

  return (
    <PageWrapper
      title={account?.name ?? "Account"}
      subtitle={account?.bankName ?? undefined}
      backHref="/accounting/banking"
      actions={
        <>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/accounting/banking/import?bankAccountId=${id}`}>
              <Upload className="h-4 w-4 mr-1" />
              Import Statement
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/accounting/banking/reconciliation?bankAccountId=${id}`}>
              <GitMerge className="h-4 w-4 mr-1" />
              Reconcile
            </Link>
          </Button>
        </>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className={`w-[160px] ${FILTER_SELECT_TRIGGER}`}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={handleFromChange}
            className="text-xs w-[140px]"
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={handleToChange}
            className="text-xs w-[140px]"
            aria-label="To date"
          />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {accountQuery.isLoading ? (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <div className="flex gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-32" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={txns}
            columns={TXN_COLUMNS}
            getRowKey={(row) => row.id}
            isLoading={txnQuery.isLoading}
            pagination={{
              mode: "server",
              page: currentPage,
              pageSize: PAGE_SIZE,
              total: syntheticTotal,
              onPageChange: handlePageChange,
            }}
            search={{
              value: search,
              onChange: handleSearchChange,
              placeholder: "Search transactions…",
            }}
            emptyState={
              <EmptyState
                title="No transactions"
                description="Import a bank statement to see transactions here."
                action={{ label: "Import Statement", href: `/accounting/banking/import?bankAccountId=${id}` }}
                compact
              />
            }
          />
        )}
      </div>
    </PageWrapper>
  );
}
