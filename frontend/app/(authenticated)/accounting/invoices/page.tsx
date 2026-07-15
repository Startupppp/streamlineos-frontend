"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { RecordPaymentDialog } from "@/features/accounting/sales/record-payment-dialog";
import { CollectionsTab } from "@/features/accounting/sales/collections-tab";
import { getErrorMessage } from "@/lib/get-error-message";
import { useInvoices, useInvoiceStats } from "@/hooks/api/invoice";
import { useVoidInvoice } from "@/hooks/api/accounting/ar";
import { useCan } from "@/hooks/api/access";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import type { FinanceStatus } from "@/features/accounting/shared";
import type { PayableInvoice } from "@/features/accounting/sales/record-payment-dialog";

const SERVER_FILTERABLE: ReadonlyArray<string> = ["DRAFT", "ISSUED", "PAID", "FAILED", "VOIDED"];

function isInvoiceStatus(v: string): v is InvoiceStatus {
  return SERVER_FILTERABLE.includes(v);
}

type DisplayStatus = "DRAFT" | "ISSUED" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "FAILED" | "VOIDED";

const ALL_DISPLAY_STATUSES: ReadonlyArray<string> = [
  "DRAFT",
  "ISSUED",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "FAILED",
  "VOIDED",
];

const FINANCE_STATUS_MAP: Record<string, FinanceStatus> = {
  DRAFT: "DRAFT",
  ISSUED: "SENT",
  SENT: "SENT",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  FAILED: "OVERDUE",
  VOIDED: "VOID",
};

function toFinanceStatus(status: string): FinanceStatus {
  return FINANCE_STATUS_MAP[status] ?? "DRAFT";
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

interface InvoiceRowActionsProps {
  invoice: Invoice;
  onRecordPayment: (invoice: Invoice) => void;
}

function InvoiceRowActions({ invoice, onRecordPayment }: InvoiceRowActionsProps) {
  const router = useRouter();
  const voidMutation = useVoidInvoice();
  const canManage = useCan("accounting:receivables:manage");
  const amountPaid = Number(invoice.amountPaid ?? "0");

  function handleViewDetail(): void {
    router.push(`/accounting/invoices/${invoice.id}`);
  }

  function handleRecordPayment(): void {
    onRecordPayment(invoice);
  }

  function handleVoid(): void {
    voidMutation.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: () => toast.success("Invoice voided"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <span className="sr-only">Actions</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={handleViewDetail}>View Detail</DropdownMenuItem>
          <DropdownMenuItem onSelect={handleRecordPayment}>Record Payment</DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  disabled={amountPaid > 0}
                  className="text-destructive focus:text-destructive"
                >
                  Void Invoice
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This will void invoice {invoice.invoiceNumber}. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleVoid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Void
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AccountingInvoicesPage() {
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

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "#",
      cell: (row) => (
        <span className="text-xs font-mono font-medium">{row.invoiceNumber}</span>
      ),
      sortable: true,
      sortValue: (row) => row.invoiceNumber,
    },
    {
      key: "client",
      header: "Customer",
      cell: (row) => (
        <span className="text-xs">{row.client?.name ?? "—"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => <Money value={Number(row.total)} currency={row.currency} compact />,
      sortable: true,
      sortValue: (row) => Number(row.total),
    },
    {
      key: "balanceDue",
      header: "Balance Due",
      cell: (row) => {
        const amountPaid = Number(row.amountPaid ?? "0");
        const balance = Math.max(0, Number(row.total) - amountPaid);
        return <Money value={balance} currency={row.currency} compact />;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <FinanceStatusBadge status={toFinanceStatus(row.status)} />
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <InvoiceRowActions
          invoice={row}
          onRecordPayment={handleSetPaymentInvoice}
        />
      ),
      className: "w-10",
    },
  ];

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

        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="h-8 w-[160px] border-input bg-card text-xs">
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
            className="h-8 w-[130px] text-xs"
          />
          <DatePicker
            value={dateTo}
            onChange={handleDateToChange}
            placeholder="To date"
            className="h-8 w-[130px] text-xs"
          />
        </div>

        <TabsContent value="invoices" className="space-y-4 mt-0">
          <StatCardGrid cols={4}>
            <StatCard
              label="Total Outstanding"
              value={stats ? stats.totalOutstanding.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}
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
              title="No invoices found"
              description="Create your first invoice or adjust your filters."
              action={{ label: "New Invoice", href: "/billing/invoices/new" }}
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
                  title="No invoices found"
                  compact
                />
              }
              className="flex-1 min-h-0"
            />
          )}
        </TabsContent>

        <TabsContent value="collections" className="mt-0">
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
