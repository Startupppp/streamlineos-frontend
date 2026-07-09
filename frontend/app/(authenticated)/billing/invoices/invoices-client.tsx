"use client";

import Link from "next/link";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useInvoices,
  useInvoiceStats,
  useUpdateInvoice,
  useDeleteInvoice,
} from "@/hooks/api/invoice";
import { format } from "date-fns";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Plus,
  FileText,
  Send,
  Check,
  Ban,
  MoreHorizontal,
  Trash2,
  IndianRupee,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { InvoiceStatus, Invoice } from "@/types/invoice";
import { CreateInvoiceDialog } from "@/features/billing/create-invoice-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof FileText;
  }
> = {
  DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
  ISSUED: { label: "Issued", variant: "default", icon: Send },
  PAID: { label: "Paid", variant: "default", icon: Check },
  FAILED: { label: "Failed", variant: "destructive", icon: XCircle },
  VOIDED: { label: "Voided", variant: "outline", icon: Ban },
};

interface InvoiceActionsCellProps {
  inv: Invoice;
  onUpdateStatus: (id: number, status: InvoiceStatus) => void;
  onDelete: (id: number) => void;
}

function InvoiceActionsCell({ inv, onUpdateStatus, onDelete }: InvoiceActionsCellProps) {
  const handleMarkIssued = useCallback(() => onUpdateStatus(inv.id, "ISSUED"), [inv.id, onUpdateStatus]);
  const handleMarkPaid = useCallback(() => onUpdateStatus(inv.id, "PAID"), [inv.id, onUpdateStatus]);
  const handleMarkVoided = useCallback(() => onUpdateStatus(inv.id, "VOIDED"), [inv.id, onUpdateStatus]);
  const handleDelete = useCallback(() => onDelete(inv.id), [inv.id, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/billing/invoices/${inv.id}`}>View Detail</Link>
        </DropdownMenuItem>
        {inv.status === "DRAFT" && (
          <DropdownMenuItem onClick={handleMarkIssued}>
            <Send className="h-3.5 w-3.5 mr-2" /> Mark as Issued
          </DropdownMenuItem>
        )}
        {(inv.status === "ISSUED" || inv.status === "FAILED") && (
          <DropdownMenuItem onClick={handleMarkPaid}>
            <Check className="h-3.5 w-3.5 mr-2" /> Mark as Paid
          </DropdownMenuItem>
        )}
        {inv.status !== "PAID" && inv.status !== "VOIDED" && (
          <DropdownMenuItem variant="destructive" onClick={handleMarkVoided}>
            <Ban className="h-3.5 w-3.5 mr-2" /> Void
          </DropdownMenuItem>
        )}
        {inv.status !== "PAID" && (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InvoicesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = searchParams.get("status") || "all";

  const setStatusFilter = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete("status");
      else params.set("status", value);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const {
    data: invoicesData,
    isLoading,
    isError,
    refetch,
  } = useInvoices(
    statusFilter !== "all"
      ? { status: statusFilter as InvoiceStatus }
      : undefined,
  );
  const { data: stats } = useInvoiceStats();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const invoices = invoicesData?.items ?? [];

  const handleUpdateStatus = useCallback(
    (id: number, status: InvoiceStatus) => {
      updateInvoice.mutate(
        { id, status },
        {
          onSuccess: () => toast.success("Invoice status updated"),
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [updateInvoice],
  );

  const handleDeleteInvoice = useCallback(
    (id: number) => {
      deleteInvoice.mutate(id, {
        onSuccess: () => toast.success("Invoice deleted"),
        onError: (err) => toast.error(err.message),
      });
    },
    [deleteInvoice],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetryLoad = useCallback(() => {
    void refetch();
  }, [refetch]);

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      cell: (inv) => <span className="font-mono text-[11px] font-medium">{inv.invoiceNumber}</span>,
      sortable: true,
      sortValue: (inv) => inv.invoiceNumber,
    },
    {
      key: "client",
      header: "Client",
      cell: (inv) => inv.client?.name ?? "—",
    },
    {
      key: "total",
      header: "Amount",
      cell: (inv) => (
        <span className="font-mono font-semibold tabular-nums">{formatCurrencyFull(inv.total)}</span>
      ),
      sortable: true,
      sortValue: (inv) => inv.total,
      className: "font-mono tabular-nums",
    },
    {
      key: "status",
      header: "Status",
      cell: (inv) => {
        const config = STATUS_CONFIG[inv.status];
        return (
          <Badge variant={config.variant} className="gap-1 text-[9px] h-4 px-1.5 py-0">
            <config.icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (inv) =>
        inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (inv) =>
        inv.createdAt ? format(new Date(inv.createdAt), "MMM d") : "",
      className: "text-muted-foreground",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-10",
      cell: (inv) => (
        <InvoiceActionsCell
          inv={inv}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteInvoice}
        />
      ),
    },
  ];

  const filtersBar = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[160px] h-8 text-sm">
        <SelectValue placeholder="Filter status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="ISSUED">Issued</SelectItem>
        <SelectItem value="PAID">Paid</SelectItem>
        <SelectItem value="FAILED">Failed</SelectItem>
        <SelectItem value="VOIDED">Voided</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <PageWrapper
      title="Invoices"
      subtitle="Manage and track all invoices"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      }
      filters={filtersBar}
    >
      <div className="space-y-4">
        <StatCardGrid cols={4}>
          <StatCard
            label="Outstanding"
            value={formatCurrencyFull(stats?.totalOutstanding ?? 0)}
            icon={IndianRupee}
            tone="amber"
            hint={`${(stats?.issued ?? 0) + (stats?.failed ?? 0)} invoices`}
          />
          <StatCard
            label="Paid"
            value={formatCurrencyFull(stats?.totalPaid ?? 0)}
            icon={Check}
            tone="emerald"
            hint={`${stats?.paid ?? 0} invoices`}
          />
          <StatCard
            label="Failed"
            value={stats?.failed ?? 0}
            icon={AlertCircle}
            tone="red"
            hint="Need attention"
          />
          <StatCard
            label="Drafts"
            value={stats?.draft ?? 0}
            icon={FileText}
            tone="default"
            hint="Ready to send"
          />
        </StatCardGrid>

        <DataTable
          data={invoices}
          columns={columns}
          getRowKey={(inv) => inv.id}
          isLoading={isLoading}
          emptyState={
            isError ? (
              <ErrorState
                compact
                title="Failed to load invoices"
                description="Something went wrong while fetching your invoices."
                onRetry={handleRetryLoad}
              />
            ) : (
              <EmptyState
                illustration={<EmptyDocumentsIllustration className="w-28 h-28" />}
                title="No invoices yet"
                description="Create your first invoice to get started"
                action={{ label: "New Invoice", onClick: handleOpenCreate }}
                compact
              />
            )
          }
          minWidth="700px"
          className="min-h-[320px]"
        />

        <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </PageWrapper>
  );
}
