"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { Money } from "@/features/accounting/shared";
import { useBankAccounts, useTransfers } from "@/hooks/api/accounting/banking";
import type { BankTransfer } from "@/hooks/api/accounting/banking";
import { useCan } from "@/hooks/api/access";
import { NewTransferDialog } from "./new-transfer-dialog";

const PAGE_SIZE = 25;

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function TransfersClient() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const canManage = useCan("accounting:banking:manage");

  const accountsQuery = useBankAccounts();
  const accounts = accountsQuery.data?.items ?? [];
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const transfersQuery = useTransfers({ page, pageSize: PAGE_SIZE });
  const transfers = transfersQuery.data?.items ?? [];
  const total = transfersQuery.data?.total ?? 0;

  const columns: DataTableColumn<BankTransfer>[] = [
    {
      key: "transferDate",
      header: "Date",
      cell: (row) => (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatDate(row.transferDate)}
        </span>
      ),
      sortable: true,
      sortValue: (row) => row.transferDate,
      className: "w-[110px]",
    },
    {
      key: "from",
      header: "From",
      cell: (row) => (
        <span className="text-[11px]">
          {accountMap.get(row.fromBankAccountId) ?? String(row.fromBankAccountId)}
        </span>
      ),
    },
    {
      key: "to",
      header: "To",
      cell: (row) => (
        <span className="text-[11px]">
          {accountMap.get(row.toBankAccountId) ?? String(row.toBankAccountId)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => <Money value={parseFloat(row.amount)} />,
      sortable: true,
      sortValue: (row) => parseFloat(row.amount),
      className: "w-[120px] text-right",
      headerClassName: "text-right",
    },
    {
      key: "reference",
      header: "Reference",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground font-mono">
          {row.reference ?? "—"}
        </span>
      ),
      className: "w-[140px]",
    },
  ];

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  return (
    <PageWrapper
      eyebrow="Banking"
      title="Transfers"
      subtitle="Inter-account fund movements"
      backHref="/accounting/banking"
      actions={
        canManage ? (
          <Button size="sm" onClick={handleDialogOpen}>
            <Plus className="h-4 w-4 mr-1" />
            New Transfer
          </Button>
        ) : undefined
      }
    >
      <DataTable
        data={transfers}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={transfersQuery.isLoading}
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: handlePageChange,
        }}
        emptyState={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <EmptyTransferIllustration className="w-32 h-32 mb-3 opacity-80" />
            <p className="text-sm font-medium text-foreground mb-1">No transfers yet</p>
            <p className="text-xs text-muted-foreground mb-3">
              Record a fund movement between your bank accounts.
            </p>
            {canManage && (
              <Button size="sm" onClick={handleDialogOpen}>
                <Plus className="h-4 w-4 mr-1" />
                New Transfer
              </Button>
            )}
          </div>
        }
      />

      {canManage && (
        <NewTransferDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          accounts={accounts}
        />
      )}
    </PageWrapper>
  );
}
