"use client";

import { useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { Money } from "@/features/accounting/shared";
import { useBankAccounts, useTransfers } from "@/hooks/api/accounting/banking";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
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
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const canManage = useCan("accounting:banking:manage");
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const accountsQuery = useBankAccounts();
  const accounts = accountsQuery.data?.data ?? [];
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const transfersQuery = useTransfers({ cursor: cursors[cursorIndex] ?? undefined, limit: PAGE_SIZE });
  const transfers = transfersQuery.data?.data ?? [];
  const hasMore = transfersQuery.data?.pagination.hasMore ?? false;

  const columns: DataTableColumn<BankTransfer>[] = [
    {
      key: "transferDate",
      header: "Date",
      cell: (row) => (
        <span className="text-dense tabular-nums text-muted-foreground">
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
        <span className="text-dense">
          {accountMap.get(row.fromBankAccountId) ?? String(row.fromBankAccountId)}
        </span>
      ),
    },
    {
      key: "to",
      header: "To",
      cell: (row) => (
        <span className="text-dense">
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
        <span className="text-dense text-muted-foreground font-mono">
          {row.reference ?? "—"}
        </span>
      ),
      className: "w-[140px]",
    },
  ];

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  function handleRetry() {
    void transfersQuery.refetch();
  }

  return (
    <PageWrapper
      title="Transfers"
      subtitle="Inter-account fund movements"
      backHref="/accounting/banking"
      actions={
        canManage ? (
          <Button onClick={handleDialogOpen} {...hoverHandlers}>
            <PlusIcon ref={iconRef} size={14} />
            New Transfer
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {transfersQuery.isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load transfers"
            description={getErrorMessage(transfersQuery.error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <DataTable
              className="flex-1 min-h-0"
              data={transfers}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={transfersQuery.isLoading}
              emptyState={
                <EmptyState
                  illustration={<EmptyTransferIllustration className="w-32 h-32 opacity-80" />}
                  title="No transfers yet"
                  description="Record a fund movement between your bank accounts."
                  action={canManage ? { label: "New Transfer", onClick: handleDialogOpen } : undefined}
                />
              }
            />
            {(cursorIndex > 0 || hasMore) ? (
              <CursorPageControls
                page={cursorIndex + 1}
                hasNext={hasMore}
                onPrevious={() => setCursorIndex(Math.max(0, cursorIndex - 1))}
                onNext={() => {
                  const next = transfersQuery.data?.pagination.nextCursor ?? null;
                  setCursors((prev) => {
                    const copy = prev.slice(0, cursorIndex + 1);
                    copy.push(next);
                    return copy;
                  });
                  setCursorIndex(cursorIndex + 1);
                }}
                className="mt-2"
              />
            ) : null}
          </>
        )}
      </div>

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
