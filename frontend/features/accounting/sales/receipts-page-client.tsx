"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import { RECEIVABLES_MANAGE, RECEIVABLES_READ, useArReceipts } from "@/hooks/api/accounting/ar";
import type { ArReceiptSummary } from "@/types/accounting-ar";
import { usePartyNames } from "../parties/use-party-names";
import { ReceiptStatusBadge } from "./ar-labels";
import { ReceiptDetailSheet } from "./receipt-detail-sheet";
import { RecordReceiptSheet } from "./record-receipt-sheet";
import { useListUrlState } from "./use-list-url-state";

function isReceiptStatus(value: string): value is ArReceiptSummary["status"] {
  return value === "POSTED" || value === "REVERSED";
}

export function ReceiptsPageClient() {
  const canRead = useCan(RECEIVABLES_READ);
  const canManage = useCan(RECEIVABLES_MANAGE);
  const url = useListUrlState();
  const [recordOpen, setRecordOpen] = useState(false);
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);

  const bookQuery = useAccountingBook();
  const statusParam = url.get("status");
  const unappliedOnly = url.get("unapplied") === "true";

  const receiptsQuery = useArReceipts({
    status: isReceiptStatus(statusParam) ? statusParam : undefined,
    unappliedOnly,
    page: url.page,
    pageSize: url.pageSize,
  });

  const rows = receiptsQuery.data?.items ?? [];
  const partyNames = usePartyNames(rows.map((row) => row.partyId));

  const columns: DataTableColumn<ArReceiptSummary>[] = [
    {
      key: "receiptNumber",
      header: "Receipt",
      cell: (row) => (
        <button
          type="button"
          className="text-sm font-medium text-status-info-ink hover:underline"
          onClick={() => setOpenReceiptId(row.id)}
        >
          {row.receiptNumber ?? "Payment"}
        </button>
      ),
    },
    {
      key: "partyId",
      header: "From",
      cell: (row) => (
        <Link
          href={`/accounting/customers/${row.partyId}`}
          className="truncate text-sm text-status-info-ink hover:underline"
        >
          {partyNames.resolve(row.partyId)}
        </Link>
      ),
    },
    {
      key: "receiptDate",
      header: "Received",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatShortDate(row.receiptDate)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: "How",
      cell: (row) => <span className="text-sm">{row.paymentMethod ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ReceiptStatusBadge status={row.status} />,
    },
    {
      key: "amountMinor",
      header: "Amount",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.amountMinor, row.currency)}
        </span>
      ),
    },
    {
      key: "unappliedMinor",
      header: "Unapplied",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense font-medium tabular-nums">
          {formatMinorMoney(row.unappliedMinor, row.currency)}
        </span>
      ),
    },
  ];

  const hasFilters = statusParam.length > 0 || unappliedOnly;

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select
        value={statusParam || "all"}
        onValueChange={(value) => url.setParams({ status: value === "all" ? undefined : value })}
      >
        <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All payments</SelectItem>
          <SelectItem value="POSTED">Received</SelectItem>
          <SelectItem value="REVERSED">Reversed</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={unappliedOnly ? "true" : "any"}
        onValueChange={(value) => url.setParams({ unapplied: value === "any" ? undefined : value })}
      >
        <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Applied">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="any">Applied or not</SelectItem>
          <SelectItem value="true">Not fully applied</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (!canRead) {
    return (
      <PageWrapper title="Money in">
        <NoPermissionState permission={RECEIVABLES_READ} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Money in"
      subtitle="Payments from customers, and what they settled."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full sm:w-auto"
            disabled={!bookQuery.data}
            onClick={() => setRecordOpen(true)}
          >
            Record money in
          </AnimatedIconButton>
        ) : null
      }
      filters={filters}
    >
      {receiptsQuery.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load your payments"
          description={getErrorMessage(receiptsQuery.error)}
          onRetry={() => void receiptsQuery.refetch()}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={receiptsQuery.isLoading}
          minWidth="1000px"
          className="flex-1 min-h-0"
          emptyState={
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              illustrationPreset="expenses"
              title={hasFilters ? "No payments match your filters" : "No payments yet"}
              description={
                hasFilters
                  ? "Try switching the filters back to all payments."
                  : "Record the first payment a customer sends you."
              }
              action={
                hasFilters
                  ? {
                      label: "Clear filters",
                      onClick: () => url.setParams({ status: undefined, unapplied: undefined }),
                    }
                  : canManage
                    ? { label: "Record money in", onClick: () => setRecordOpen(true) }
                    : undefined
              }
            />
          }
          pagination={{
            mode: "server",
            page: url.page,
            pageSize: url.pageSize,
            total: receiptsQuery.data?.total ?? 0,
            onPageChange: url.setPage,
            onPageSizeChange: url.setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      {bookQuery.data ? (
        <RecordReceiptSheet
          open={recordOpen}
          onOpenChange={setRecordOpen}
          baseCurrency={bookQuery.data.baseCurrency}
        />
      ) : null}

      <ReceiptDetailSheet
        receiptId={openReceiptId}
        onOpenChange={(open) => {
          if (!open) setOpenReceiptId(null);
        }}
      />
    </PageWrapper>
  );
}
