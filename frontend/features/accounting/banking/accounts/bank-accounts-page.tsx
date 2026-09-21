"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import { useBankAccounts } from "@/hooks/api/accounting/banking";
import type { BankAccountSummary } from "@/types/accounting-banking";
import { useUrlListState } from "../lib/use-url-list-state";
import { AddBankAccountSheet } from "./add-bank-account-sheet";
import { BankAccountBalanceCell } from "./bank-account-balance-cell";

const PAGE_SIZE = 10;

export function BankAccountsPage() {
  const canManage = useCan("accounting:banking:manage");
  const { page, setPage } = useUrlListState();
  const [isAdding, setIsAdding] = useState(false);
  const [asOf] = useState(() => new Date().toISOString().slice(0, 10));

  const bookQuery = useAccountingBook();
  const accountsQuery = useBankAccounts({ page, pageSize: PAGE_SIZE, includeInactive: true });

  const pageState = usePageState({
    permission: "accounting:banking:read",
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    error: accountsQuery.error,
  });
  const handleRetry = useCallback(() => { void accountsQuery.refetch(); }, [accountsQuery]);

  const columns: DataTableColumn<BankAccountSummary>[] = [
    {
      key: "name",
      header: "Account",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.displayName}</p>
          <p className="truncate text-dense text-muted-foreground">
            {row.bankName ?? "Bank not recorded"}
            {row.identifierValue ? ` · ${row.identifierValue}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "glAccount",
      header: "Tracked in",
      cell: (row) => (
        <span className="truncate text-sm text-muted-foreground">
          {row.accountName} ({row.accountCode})
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => row.currency,
    },
    {
      key: "balance",
      header: "What the books say today",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => <BankAccountBalanceCell bankAccountId={row.id} asOf={asOf} />,
    },
    {
      key: "mapping",
      header: "Statement layout",
      cell: (row) =>
        row.csvMapping?.dateFormat ? (
          <SemanticBadge tone="success" size="xs" label={`Dates as ${row.csvMapping.dateFormat}`} />
        ) : (
          <SemanticBadge tone="warning" size="xs" label="Not set up yet" />
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge tone={row.isActive ? "success" : "neutral"} label={row.isActive ? "In use" : "Closed"} />
      ),
    },
  ];

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Banking">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  const rows = accountsQuery.data?.items ?? [];

  return (
    <PageWrapper
      title="Banking"
      subtitle="Is this money actually there? Start from the accounts, then bring a statement in."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Link href="/accounting/banking/reconciliation">Check the books against the bank</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Link href="/accounting/banking/import">Bring in a statement</Link>
          </Button>
          {canManage ? (
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setIsAdding(true)}
            >
              Add account
            </AnimatedIconButton>
          ) : null}
        </div>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={accountsQuery.isPending}
        minWidth="1000px"
        className="flex-1 min-h-0"
        emptyState={
          <EmptyState
            className="border-0 bg-transparent min-h-[40vh]"
            title="No bank accounts yet"
            description="Point a bank account at the cash account it is already tracked in, and statements can start coming in."
            action={canManage ? { label: "Add account", onClick: () => setIsAdding(true) } : undefined}
          />
        }
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total: accountsQuery.data?.total ?? 0,
          onPageChange: setPage,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />

      {canManage ? (
        <AddBankAccountSheet
          open={isAdding}
          onOpenChange={setIsAdding}
          defaultCurrency={bookQuery.data?.baseCurrency ?? "INR"}
          defaultCountryCode={bookQuery.data?.countryCode ?? "IN"}
        />
      ) : null}
    </PageWrapper>
  );
}
