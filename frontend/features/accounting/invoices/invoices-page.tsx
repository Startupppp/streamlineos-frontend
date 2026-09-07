"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { RecordPaymentDialog } from "@/features/accounting/sales/record-payment-dialog";
import { CollectionsTab } from "@/features/accounting/sales/collections-tab";
import { getErrorMessage } from "@/lib/get-error-message";
import { useInvoices, useInvoiceStats } from "@/hooks/api/invoice";
import type { Invoice } from "@/types/invoice";
import type { PayableInvoice } from "@/features/accounting/sales/record-payment-dialog";
import {
  ALL_DISPLAY_STATUSES,
  isInvoiceStatus,
  type DisplayStatus,
} from "./invoice-status-map";
import { buildInvoiceColumns } from "./invoice-columns";

export function AccountingInvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [paymentInvoice, setPaymentInvoice] = useState<PayableInvoice | null>(null);

  const serverStatus =
    statusFilter !== "ALL" && isInvoiceStatus(statusFilter)
      ? statusFilter
      : undefined;

  const invoicesQuery = useInvoices({
    status: serverStatus,
    page,
    limit: 20,
  });

  const statsQuery = useInvoiceStats();

  const stats = statsQuery.data;

  const allItems = invoicesQuery.data?.items ?? [];

  const filtersActive =
    statusFilter !== "ALL" ||
    search.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const filteredItems = allItems.filter((inv) => {
    if (statusFilter !== "ALL" && !isInvoiceStatus(statusFilter)) {
      const displayFilter: string = statusFilter;
      if (inv.status !== displayFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matches =
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.client?.name ?? "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (dateFrom) {
      const invDate = new Date(inv.createdAt);
      if (invDate < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const invDate = new Date(inv.createdAt);
      if (invDate > new Date(dateTo)) return false;
    }
    return true;
  });

  const columns = buildInvoiceColumns(handleSetPaymentInvoice);

  function handleStatusFilterChange(value: string): void {
    const isDisplayStatusOrAll = (v: string): v is DisplayStatus | "ALL" =>
      v === "ALL" || ALL_DISPLAY_STATUSES.includes(v);
    if (isDisplayStatusOrAll(value)) {
      setStatusFilter(value);
      setPage(1);
    }
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handlePageChange(p: number): void {
    setPage(p);
  }

  function handleSetPaymentInvoice(invoice: Invoice): void {
    setPaymentInvoice({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      amountPaid: invoice.amountPaid ?? "0",
      currency: invoice.currency,
    });
  }

  function handleClosePaymentDialog(): void {
    setPaymentInvoice(null);
  }

  function handleDateFromChange(value: string): void {
    setDateFrom(value);
  }

  function handleDateToChange(value: string): void {
    setDateTo(value);
  }

  function handleRetry(): void {
    void invoicesQuery.refetch();
  }

  function handleClearFilters(): void {
    setStatusFilter("ALL");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <PageWrapper
      title="Invoices & Receivables"
      subtitle="Track outstanding invoices, collections, and payments"
      actions={
        <Button size="sm" asChild>
          <Link href="/billing/invoices/new">
            <Plus className="size-4 mr-1" />
            New Invoice
          </Link>
        </Button>
      }
    >
      <Tabs defaultValue="invoices" className="flex flex-1 min-h-0 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="invoices">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="collections">
            Collections
          </TabsTrigger>
        </TabsList>

        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className={`w-[160px] ${FILTER_SELECT_TRIGGER}`}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {ALL_DISPLAY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker
            value={dateFrom}
            onChange={handleDateFromChange}
            placeholder="From date"
            className="w-[130px] text-xs"
          />
          <DatePicker
            value={dateTo}
            onChange={handleDateToChange}
            placeholder="To date"
            className="w-[130px] text-xs"
          />
        </div>

        <TabsContent value="invoices" className="flex flex-1 min-h-0 flex-col gap-4 mt-0">
          {invoicesQuery.isError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load invoices"
              description={getErrorMessage(invoicesQuery.error)}
              onRetry={handleRetry}
            />
          ) : (
            <>
            <StatCardGrid cols={4}>
              <StatCard
                label="Total Outstanding"
                value={stats ? stats.totalOutstanding.toLocaleString(undefined, { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}
                tone="blue"
                isLoading={statsQuery.isLoading}
              />
              <StatCard
                label="Outstanding Invoices"
                value={stats ? stats.issued : "—"}
                tone="red"
                isLoading={statsQuery.isLoading}
                hint="Issued & unpaid"
              />
              <StatCard
                label="Paid This Month"
                value={stats ? `$${stats.totalPaid.toLocaleString()}` : "—"}
                tone="emerald"
                isLoading={statsQuery.isLoading}
              />
              <StatCard
                label="Drafts"
                value={stats?.draft ?? "—"}
                tone="default"
                isLoading={statsQuery.isLoading}
              />
            </StatCardGrid>

            {filteredItems.length === 0 && !invoicesQuery.isLoading ? (
              <EmptyState
                illustrationPreset="documents"
                title="No invoices yet"
                description={
                  filtersActive ? undefined : "Create your first invoice to start tracking receivables."
                }
                filtersActive={filtersActive}
                onClearFilters={handleClearFilters}
                action={
                  filtersActive
                    ? undefined
                    : { label: "New Invoice", href: "/billing/invoices/new" }
                }
              />
            ) : (
              <DataTable
                data={filteredItems}
                columns={columns}
                getRowKey={(row) => row.id}
                isLoading={invoicesQuery.isLoading}
                search={{
                  value: search,
                  onChange: handleSearchChange,
                  placeholder: "Search by #, customer…",
                }}
                pagination={{
                  mode: "server",
                  page,
                  pageSize: 20,
                  total: invoicesQuery.data?.total ?? 0,
                  onPageChange: handlePageChange,
                }}
                emptyState={
                  <EmptyState
                    illustrationPreset="documents"
                    title="No invoices yet"
                    filtersActive={filtersActive}
                    onClearFilters={handleClearFilters}
                    compact
                  />
                }
                className="flex-1 min-h-0"
              />
            )}
            </>
          )}
        </TabsContent>

        <TabsContent value="collections" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <CollectionsTab />
        </TabsContent>
      </Tabs>

      {paymentInvoice && (
        <RecordPaymentDialog
          invoice={paymentInvoice}
          open
          onOpenChange={handleClosePaymentDialog}
        />
      )}
    </PageWrapper>
  );
}
