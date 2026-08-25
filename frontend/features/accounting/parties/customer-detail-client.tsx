"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import { PARTIES_READ, PARTIES_UPDATE, useParty } from "@/hooks/api/accounting/parties";
import { RECEIVABLES_MANAGE, useArAging, useArInvoices } from "@/hooks/api/accounting/ar";
import type { ArDocumentSummary } from "@/types/accounting-ar";
import { ArStatusBadge, PARTY_ROLE_LABEL } from "../sales/ar-labels";
import { useListUrlState } from "../sales/use-list-url-state";
import { PartyFormSheet } from "./party-form-sheet";
import { PartyTaxRegistrationsCard } from "./party-tax-registrations-card";

interface CustomerDetailClientProps {
  partyId: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-label text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm">{value}</span>
    </div>
  );
}

export function CustomerDetailClient({ partyId }: CustomerDetailClientProps) {
  const canRead = useCan(PARTIES_READ);
  const canUpdate = useCan(PARTIES_UPDATE);
  const canBill = useCan(RECEIVABLES_MANAGE);
  const url = useListUrlState(10);
  const [editOpen, setEditOpen] = useState(false);

  const partyQuery = useParty(partyId);
  const agingQuery = useArAging({ partyId });
  const invoicesQuery = useArInvoices({
    partyId,
    openOnly: true,
    page: url.page,
    pageSize: url.pageSize,
  });

  const columns: DataTableColumn<ArDocumentSummary>[] = [
    {
      key: "documentNumber",
      header: "Invoice",
      cell: (row) => (
        <Link
          href={`/accounting/invoices/${row.id}`}
          className="text-sm font-medium text-status-info-ink hover:underline"
        >
          {row.documentNumber ?? "Draft"}
        </Link>
      ),
    },
    {
      key: "issueDate",
      header: "Issued",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{formatShortDate(row.issueDate)}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Due",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {row.dueDate ? formatShortDate(row.dueDate) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ArStatusBadge status={row.status} />,
    },
    {
      key: "grossMinor",
      header: "Invoiced",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMoney(row.grossMinor, row.currency)}
        </span>
      ),
    },
    {
      key: "openMinor",
      header: "Still owed",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense font-medium tabular-nums">
          {formatMoney(row.openMinor, row.currency)}
        </span>
      ),
    },
  ];

  if (!canRead) {
    return (
      <PageWrapper title="Customer" backHref="/accounting/customers">
        <NoPermissionState permission={PARTIES_READ} />
      </PageWrapper>
    );
  }

  if (partyQuery.isError) {
    return (
      <PageWrapper title="Customer" backHref="/accounting/customers">
        <ErrorState
          className="flex-1"
          title="Couldn't load this customer"
          description={getErrorMessage(partyQuery.error)}
          onRetry={() => void partyQuery.refetch()}
        />
      </PageWrapper>
    );
  }

  const party = partyQuery.data;

  if (partyQuery.isPending || !party) {
    return (
      <PageWrapper title="Customer" backHref="/accounting/customers">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="flex-1 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const aging = agingQuery.data;
  const owedLabel = aging
    ? formatMoney(aging.totals.functionalTotalMinor, aging.baseCurrency)
    : "—";
  const overdueLabel = aging ? formatMoney(aging.totals.days91Plus, aging.baseCurrency) : "—";
  const address = [
    party.billingLine1,
    party.billingLine2,
    party.billingCity,
    party.billingPostalCode,
    party.billingCountryCode,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return (
    <PageWrapper
      title={party.displayName}
      subtitle={party.legalName ?? "Customer record and everything they still owe."}
      badge={PARTY_ROLE_LABEL[party.role]}
      backHref="/accounting/customers"
      backLabel="Back to customers"
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {canUpdate ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setEditOpen(true)}
            >
              Edit details
            </Button>
          ) : null}
          {canBill ? (
            <Button asChild size="sm" className="flex-1 sm:flex-none">
              <Link href={`/accounting/invoices/new?partyId=${party.id}`}>New invoice</Link>
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGrid cols={3}>
          <StatCard
            label="Owes us now"
            value={owedLabel}
            tone={aging && aging.totals.functionalTotalMinor > 0 ? "amber" : "emerald"}
            isLoading={agingQuery.isLoading}
          />
          <StatCard
            label="Overdue 91+ days"
            value={overdueLabel}
            tone={aging && aging.totals.days91Plus > 0 ? "red" : "default"}
            isLoading={agingQuery.isLoading}
          />
          <StatCard
            label="Open invoices"
            value={invoicesQuery.data?.total ?? 0}
            tone="blue"
            isLoading={invoicesQuery.isLoading}
          />
        </StatCardGrid>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Billing details</CardTitle>
              <CardDescription>What goes on the invoices we send them.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60">
              <DetailRow label="Email" value={party.email ?? "Not set"} />
              <DetailRow label="Phone" value={party.phone ?? "Not set"} />
              <DetailRow label="Bills in" value={party.defaultCurrency} />
              <DetailRow label="Pays within" value={`${party.paymentTermsDays} days`} />
              <DetailRow label="Address" value={address || "Not set"} />
              <DetailRow label="Notes" value={party.notes ?? "None"} />
              {party.externalRefs.length > 0 ? (
                <div className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-label text-muted-foreground">Linked from</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {party.externalRefs.map((ref) => (
                      <Badge
                        key={`${ref.system}-${ref.id}`}
                        variant="outline"
                        className="h-5 px-2 py-0.5 text-micro"
                      >
                        {ref.system}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <PartyTaxRegistrationsCard
            partyId={party.id}
            countryCode={party.countryCode}
            registrations={party.taxRegistrations}
          />
        </div>

        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardHeader className="shrink-0 px-4 py-3">
            <CardTitle>What they still owe</CardTitle>
            <CardDescription>Invoices with a balance left on them.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            {invoicesQuery.isError ? (
              <ErrorState
                className="flex-1"
                title="Couldn't load their invoices"
                description={getErrorMessage(invoicesQuery.error)}
                onRetry={() => void invoicesQuery.refetch()}
              />
            ) : (
              <DataTable
                data={invoicesQuery.data?.items ?? []}
                columns={columns}
                getRowKey={(row) => row.id}
                isLoading={invoicesQuery.isLoading}
                minWidth="800px"
                className="flex-1 min-h-0"
                emptyState={
                  <EmptyState
                    className="border-0 bg-transparent min-h-[30vh]"
                    compact
                    title="Nothing outstanding"
                    description="Every invoice we sent them has been paid."
                  />
                }
                pagination={{
                  mode: "server",
                  page: url.page,
                  pageSize: url.pageSize,
                  total: invoicesQuery.data?.total ?? 0,
                  onPageChange: url.setPage,
                  onPageSizeChange: url.setPageSize,
                  pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <PartyFormSheet open={editOpen} onOpenChange={setEditOpen} party={party} />
    </PageWrapper>
  );
}
