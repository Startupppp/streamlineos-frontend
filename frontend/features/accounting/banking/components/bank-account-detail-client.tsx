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
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/features/accounting/shared";
import { BankTxnStatusBadge } from "./bank-txn-status-badge";
import { useBankAccount, useBankTransactions } from "@/hooks/api/accounting/banking";
import type { BankTransaction, BankTxnStatus } from "@/hooks/api/accounting/banking";

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
      <span className="text-[11px] tabular-nums text-muted-foreground">
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
      <span className="text-[11px]" title={row.description}>
        {row.description.length > 40
          ? `${row.description.slice(0, 40)}…`
          : row.description}
      </span>
    ),
  },
  {
    key: "reference",
    header: "Reference",
    cell: (row) => (
      <span className="text-[11px] text-muted-foreground font-mono">
        {row.reference ?? "—"}
      </span>
    ),
    className: "w-[130px]",
  },
  {
    key: "counterparty",
    header: "Counterparty",
    cell: (row) => (
      <span className="text-[11px] text-muted-foreground">
        {row.counterparty ?? "—"}
      </span>
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
          className={val >= 0 ? "text-emerald-600" : "text-red-600"}
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
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const accountQuery = useBankAccount(id);
  const txnQuery = useBankTransactions(id, {
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    from: from || undefined,
    to: to || undefined,
    q: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const account = accountQuery.data;
  const txns = txnQuery.data?.items ?? [];
  const total = txnQuery.data?.total ?? 0;

  function handleStatusChange(value: string) {
    if (isTxnStatus(value)) {
      setStatusFilter(value);
      setPage(1);
    }
  }

  function handleFromChange(e: ChangeEvent<HTMLInputElement>) {
    setFrom(e.target.value);
    setPage(1);
  }

  function handleToChange(e: ChangeEvent<HTMLInputElement>) {
    setTo(e.target.value);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  return (
    <PageWrapper
      eyebrow="Banking"
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
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
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
            className="h-8 text-xs w-[140px]"
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={handleToChange}
            className="h-8 text-xs w-[140px]"
            aria-label="To date"
          />
        </div>
      }
    >
      {accountQuery.isLoading ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-32" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <DataTable
          data={txns}
          columns={TXN_COLUMNS}
          getRowKey={(row) => row.id}
          isLoading={txnQuery.isLoading}
          pagination={{
            mode: "server",
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: handlePageChange,
          }}
          search={{
            value: search,
            onChange: handleSearchChange,
            placeholder: "Search transactions…",
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-foreground mb-1">No transactions</p>
              <p className="text-xs text-muted-foreground mb-3">
                Import a bank statement to see transactions here.
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/accounting/banking/import?bankAccountId=${id}`}>
                  <Upload className="h-4 w-4 mr-1" />
                  Import Statement
                </Link>
              </Button>
            </div>
          }
        />
      )}
    </PageWrapper>
  );
}
