"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import { useAccountingBook, usePostableAccounts } from "@/hooks/api/accounting/ledger";
import { useApDocuments, useVendor } from "@/hooks/api/accounting/ap";
import type { ApDocumentSummary } from "@/types/accounting-ap";
import { AP_STATUS_LABELS, AP_STATUS_TONES } from "../lib/ap-labels";
import { VendorFormSheet } from "./vendor-form-sheet";

const BILLS_PAGE_SIZE = 10;

interface VendorDetailPageProps {
  vendorId: string;
}

function DefinitionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-label font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm">{value}</span>
    </div>
  );
}

export function VendorDetailPage({ vendorId }: VendorDetailPageProps) {
  const canRead = useCan("accounting:read");
  const canUpdate = useCan("accounting:update");
  const canReadBills = useCan("accounting:payables:read");
  const [isEditing, setIsEditing] = useState(false);
  const [billsPage, setBillsPage] = useState(1);

  const bookQuery = useAccountingBook();
  const vendorQuery = useVendor(vendorId);
  const accountsQuery = usePostableAccounts();
  const billsQuery = useApDocuments(
    { partyId: vendorId, openOnly: true, page: billsPage, pageSize: BILLS_PAGE_SIZE },
    { enabled: canReadBills },
  );

  const expenseAccountName = useMemo(() => {
    const accountId = vendorQuery.data?.defaultExpenseAccountId;
    if (!accountId) return "Not set — bill lines start blank";
    const account = (accountsQuery.data ?? []).find((entry) => entry.id === accountId);
    return account ? `${account.name} (${account.code})` : "Not set — bill lines start blank";
  }, [vendorQuery.data?.defaultExpenseAccountId, accountsQuery.data]);

  const billColumns: DataTableColumn<ApDocumentSummary>[] = [
    {
      key: "number",
      header: "Their number",
      cell: (row) => (
        <Link
          href={`/accounting/purchase-bills/${row.id}`}
          className="truncate text-sm text-status-info-ink hover:underline"
        >
          {row.vendorDocumentNumber ?? row.documentNumber ?? "Draft"}
        </Link>
      ),
    },
    {
      key: "issueDate",
      header: "Dated",
      className: "tabular-nums",
      cell: (row) => formatShortDate(row.issueDate),
    },
    {
      key: "dueDate",
      header: "Due",
      className: "tabular-nums",
      cell: (row) => (row.dueDate ? formatShortDate(row.dueDate) : "—"),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge tone={AP_STATUS_TONES[row.status]} label={AP_STATUS_LABELS[row.status]} />
      ),
    },
    {
      key: "open",
      header: "Still owed",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMinorMoney(row.openMinor, row.currency),
    },
  ];

  if (!canRead) {
    return (
      <PageWrapper title="Vendor" backHref="/accounting/vendors" backLabel="Back to vendors">
        <NoPermissionState permission="accounting:read" />
      </PageWrapper>
    );
  }

  if (vendorQuery.isPending) {
    return (
      <PageWrapper title="Vendor" backHref="/accounting/vendors" backLabel="Back to vendors">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (vendorQuery.isError || !vendorQuery.data) {
    return (
      <PageWrapper title="Vendor" backHref="/accounting/vendors" backLabel="Back to vendors">
        <ErrorState
          className="flex-1"
          title="Couldn't load this vendor"
          description={getErrorMessage(vendorQuery.error)}
          onRetry={() => void vendorQuery.refetch()}
        />
      </PageWrapper>
    );
  }

  const vendor = vendorQuery.data;
  const bills = billsQuery.data?.items ?? [];

  return (
    <PageWrapper
      title={vendor.displayName}
      subtitle={vendor.legalName ?? "What we owe them, and how their bills behave."}
      backHref="/accounting/vendors"
      backLabel="Back to vendors"
      badge={vendor.isActive ? undefined : "Dormant"}
      actions={
        canUpdate ? (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Edit vendor
          </Button>
        ) : null
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-semibold">How their bills behave</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <DefinitionRow label="Where their spending goes" value={expenseAccountName} />
              <DefinitionRow label="Days to pay" value={`${vendor.paymentTermsDays} days`} />
              <DefinitionRow
                label="Tax withheld from payments"
                value={
                  vendor.withholdingCode
                    ? `Code ${vendor.withholdingCode}`
                    : "Nothing is held back"
                }
              />
              <DefinitionRow label="Bills arrive in" value={vendor.defaultCurrency} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-semibold">Who they are</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <DefinitionRow label="Email" value={vendor.email ?? "—"} />
              <DefinitionRow label="Phone" value={vendor.phone ?? "—"} />
              <DefinitionRow
                label="Where"
                value={
                  [vendor.billingCity, vendor.billingRegion, vendor.countryCode]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <DefinitionRow
                label="Tax registration"
                value={
                  vendor.taxRegistrations.length > 0
                    ? vendor.taxRegistrations.map((entry) => entry.number).join(", ")
                    : "None on file"
                }
              />
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardHeader className="shrink-0 px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              What we still owe {vendor.displayName}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            {!canReadBills ? (
              <NoPermissionState permission="accounting:payables:read" />
            ) : billsQuery.isError ? (
              <ErrorState
                className="flex-1"
                title="Couldn't load their bills"
                description={getErrorMessage(billsQuery.error)}
                onRetry={() => void billsQuery.refetch()}
              />
            ) : (
              <DataTable
                data={bills}
                columns={billColumns}
                getRowKey={(row) => row.id}
                isLoading={billsQuery.isPending}
                className="flex-1 min-h-0"
                minWidth="700px"
                emptyState={
                  <EmptyState
                    className="border-0 bg-transparent min-h-[30vh]"
                    title="Nothing outstanding"
                    description="Every bill from this vendor has been paid."
                  />
                }
                pagination={{
                  mode: "server",
                  page: billsPage,
                  pageSize: BILLS_PAGE_SIZE,
                  total: billsQuery.data?.total ?? 0,
                  onPageChange: setBillsPage,
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {canUpdate ? (
        <VendorFormSheet
          open={isEditing}
          onOpenChange={setIsEditing}
          vendor={vendor}
          defaultCurrency={bookQuery.data?.baseCurrency ?? vendor.defaultCurrency}
          defaultCountryCode={bookQuery.data?.countryCode ?? vendor.countryCode}
        />
      ) : null}
    </PageWrapper>
  );
}
