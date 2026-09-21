"use client";

import { useState, useCallback } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import { useApPayments } from "@/hooks/api/accounting/ap";
import type { ApPaymentStatus } from "@/types/accounting-ap";
import type { ApPayment } from "@/types/accounting-ap-payments";
import { AP_PAYMENT_STATUS_LABELS, AP_PAYMENT_STATUS_TONES } from "../lib/ap-labels";
import { useUrlListState } from "../lib/use-url-list-state";
import { VendorPickerField } from "../bills/vendor-picker-field";
import { PaymentDetailSheet } from "./payment-detail-sheet";
import { RecordPaymentSheet } from "./record-payment-sheet";

const PAGE_SIZE = 20;

function isPaymentStatus(value: string): value is ApPaymentStatus {
  return value === "POSTED" || value === "REVERSED";
}

export function VendorPaymentsPage() {
  const canManage = useCan("accounting:payables:manage");

  const { getParam, setParams, page, setPage } = useUrlListState();
  const status = getParam("status");
  const partyId = getParam("vendor");
  const from = getParam("from");
  const to = getParam("to");

  const [isRecording, setIsRecording] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const bookQuery = useAccountingBook();
  const paymentsQuery = useApPayments({
    status: isPaymentStatus(status) ? status : undefined,
    partyId: partyId || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const pageState = usePageState({
    permission: "accounting:payables:read",
    isLoading: paymentsQuery.isLoading,
    isError: paymentsQuery.isError,
    error: paymentsQuery.error,
  });
  const handleRetry = useCallback(() => { void paymentsQuery.refetch(); }, [paymentsQuery]);

  function handleSheetOpenChange(open: boolean): void {
    if (!open) setSelectedPaymentId(null);
  }

  const columns: DataTableColumn<ApPayment>[] = [
    {
      key: "date",
      header: "When",
      className: "tabular-nums",
      cell: (row) => formatShortDate(row.paymentDate),
    },
    {
      key: "vendor",
      header: "Paid to",
      cell: (row) => (
        <button
          type="button"
          className="truncate text-left text-sm font-medium text-status-info-ink hover:underline"
          onClick={() => setSelectedPaymentId(row.id)}
        >
          {row.partyName}
        </button>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      cell: (row) => (
        <span className="truncate text-sm text-muted-foreground">
          {row.reference ?? row.paymentNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "gross",
      header: "They invoiced",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.grossMinor, row.currency),
    },
    {
      key: "withheld",
      header: "Tax withheld",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.withheldMinor, row.currency),
    },
    {
      key: "net",
      header: "Left the account",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.netPaidMinor, row.currency),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge
          tone={AP_PAYMENT_STATUS_TONES[row.status]}
          label={AP_PAYMENT_STATUS_LABELS[row.status]}
        />
      ),
    },
  ];

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Money out">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  const rows = paymentsQuery.data?.items ?? [];
  const filtersActive = !!status || !!partyId || !!from || !!to;

  return (
    <PageWrapper
      title="Money out"
      subtitle="Every payment you have made to a vendor, and what the vendor actually received."
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
            onClick={() => setIsRecording(true)}
          >
            Pay a vendor
          </AnimatedIconButton>
        ) : null
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select
            value={status || "all"}
            onValueChange={(value) => setParams({ status: value === "all" ? undefined : value })}
          >
            <SelectTrigger className={FILTER_SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="all">Every payment</SelectItem>
              <SelectItem value="POSTED">Sent</SelectItem>
              <SelectItem value="REVERSED">Reversed</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-56 shrink-0">
            <VendorPickerField
              value={partyId}
              onChange={(value) => setParams({ vendor: value || undefined })}
            />
          </div>
          <DatePicker
            value={from}
            onChange={(value) => setParams({ from: value || undefined })}
            placeholder="From"
          />
          <DatePicker
            value={to}
            onChange={(value) => setParams({ to: value || undefined })}
            placeholder="To"
          />
        </div>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={paymentsQuery.isPending}
        minWidth="1100px"
        className="flex-1 min-h-0"
        emptyState={
          filtersActive ? (
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              title="No payments match your filters"
              description="Widen the dates or clear the vendor to see more."
              action={{
                label: "Clear filters",
                onClick: () =>
                  setParams({
                    status: undefined,
                    vendor: undefined,
                    from: undefined,
                    to: undefined,
                  }),
              }}
            />
          ) : (
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              title="No money has gone out yet"
              description="Record a payment once you have settled a vendor's bill."
              action={canManage ? { label: "Pay a vendor", onClick: () => setIsRecording(true) } : undefined}
            />
          )
        }
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total: paymentsQuery.data?.total ?? 0,
          onPageChange: setPage,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />

      {canManage ? (
        <RecordPaymentSheet
          open={isRecording}
          onOpenChange={setIsRecording}
          defaultCurrency={bookQuery.data?.baseCurrency ?? "INR"}
        />
      ) : null}

      <PaymentDetailSheet paymentId={selectedPaymentId} onOpenChange={handleSheetOpenChange} />
    </PageWrapper>
  );
}
