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
  Clock,
  Ban,
  MoreHorizontal,
  Trash2,
  IndianRupee,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { InvoiceStatus, Invoice } from "@/types/invoice";
import { CreateInvoiceDialog } from "@/features/billing/create-invoice-dialog";

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <IndianRupee className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrencyFull(stats?.totalOutstanding ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(stats?.issued ?? 0) + (stats?.failed ?? 0)} invoices
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <Check className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrencyFull(stats?.totalPaid ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.paid ?? 0} invoices
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.failed ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.draft ?? 0}</div>
              <p className="text-xs text-muted-foreground">Ready to send</p>
            </CardContent>
          </Card>
        </div>

        <div className="border border-border rounded-lg overflow-auto h-[calc(100dvh-20rem)] min-h-[320px]">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Invoice #</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Client</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Created</TableHead>
                  <TableHead className="w-10 px-3 py-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-14" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-7 w-7 rounded ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10">
                      <div className="flex flex-col items-center justify-center text-center gap-3">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        <p className="text-sm font-medium">
                          Failed to load invoices
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRetryLoad}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10">
                      <div className="flex flex-col items-center justify-center text-center">
                        <EmptyDocumentsIllustration className="mb-3 w-28 h-28" />
                        <p className="text-sm font-medium text-foreground">
                          No invoices yet
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">
                          Create your first invoice to get started
                        </p>
                        <Button size="sm" onClick={handleOpenCreate}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> New Invoice
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <InvoiceTableRow
                      key={inv.id}
                      inv={inv}
                      onUpdateStatus={handleUpdateStatus}
                      onDelete={handleDeleteInvoice}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </PageWrapper>
  );
}

interface InvoiceTableRowProps {
  inv: Invoice;
  onUpdateStatus: (id: number, status: InvoiceStatus) => void;
  onDelete: (id: number) => void;
}

function InvoiceTableRow({
  inv,
  onUpdateStatus,
  onDelete,
}: InvoiceTableRowProps) {
  const config = STATUS_CONFIG[inv.status];
  const handleMarkIssued = useCallback(
    () => onUpdateStatus(inv.id, "ISSUED"),
    [inv.id, onUpdateStatus],
  );
  const handleMarkPaid = useCallback(
    () => onUpdateStatus(inv.id, "PAID"),
    [inv.id, onUpdateStatus],
  );
  const handleMarkVoided = useCallback(
    () => onUpdateStatus(inv.id, "VOIDED"),
    [inv.id, onUpdateStatus],
  );
  const handleDelete = useCallback(() => onDelete(inv.id), [inv.id, onDelete]);

  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
      <TableCell>{inv.client?.name ?? "—"}</TableCell>
      <TableCell className="font-mono font-semibold text-sm">
        {formatCurrencyFull(inv.total)}
      </TableCell>
      <TableCell>
        <Badge variant={config.variant} className="gap-1 text-xs">
          <config.icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </TableCell>
      <TableCell>
        {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {inv.createdAt ? format(new Date(inv.createdAt), "MMM d") : ""}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="More options"
            >
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
              <DropdownMenuItem
                onClick={handleMarkVoided}
                className="text-destructive"
              >
                <Ban className="h-3.5 w-3.5 mr-2" /> Void
              </DropdownMenuItem>
            )}
            {inv.status !== "PAID" && (
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
