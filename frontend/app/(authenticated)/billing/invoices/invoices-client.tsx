"use client";

import Link from "next/link";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useForm,
  useFieldArray,
  Controller,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useInvoices,
  useInvoiceStats,
  useUpdateInvoice,
  useDeleteInvoice,
  useCreateInvoice,
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
  Loader2,
  MoreHorizontal,
  Trash2,
  IndianRupee,
  AlertCircle,
  RefreshCw,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { InvoiceStatus, Invoice } from "@/types/invoice";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof FileText;
  }
> = {
  DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
  SENT: { label: "Sent", variant: "default", icon: Send },
  PAID: { label: "Paid", variant: "default", icon: Check },
  OVERDUE: { label: "Overdue", variant: "destructive", icon: Clock },
  CANCELLED: { label: "Cancelled", variant: "outline", icon: Ban },
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
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Filter status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="SENT">Sent</SelectItem>
        <SelectItem value="PAID">Paid</SelectItem>
        <SelectItem value="OVERDUE">Overdue</SelectItem>
        <SelectItem value="CANCELLED">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <PageWrapper
      title="Invoices"
      subtitle="Manage and track all invoices"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      }
      filters={filtersBar}
    >
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
                {(stats?.sent ?? 0) + (stats?.overdue ?? 0)} invoices
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
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.overdue ?? 0}
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
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
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
  const handleMarkSent = useCallback(
    () => onUpdateStatus(inv.id, "SENT"),
    [inv.id, onUpdateStatus],
  );
  const handleMarkPaid = useCallback(
    () => onUpdateStatus(inv.id, "PAID"),
    [inv.id, onUpdateStatus],
  );
  const handleMarkCancelled = useCallback(
    () => onUpdateStatus(inv.id, "CANCELLED"),
    [inv.id, onUpdateStatus],
  );
  const handleDelete = useCallback(() => onDelete(inv.id), [inv.id, onDelete]);

  return (
    <TableRow>
      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
      <TableCell>{inv.client?.name ?? "—"}</TableCell>
      <TableCell className="font-semibold">
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
              <DropdownMenuItem onClick={handleMarkSent}>
                <Send className="h-3.5 w-3.5 mr-2" /> Mark as Sent
              </DropdownMenuItem>
            )}
            {(inv.status === "SENT" || inv.status === "OVERDUE") && (
              <DropdownMenuItem onClick={handleMarkPaid}>
                <Check className="h-3.5 w-3.5 mr-2" /> Mark as Paid
              </DropdownMenuItem>
            )}
            {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
              <DropdownMenuItem
                onClick={handleMarkCancelled}
                className="text-destructive"
              >
                <Ban className="h-3.5 w-3.5 mr-2" /> Cancel
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

const dialogLineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive("Qty must be > 0"),
  rate: z.number().nonnegative("Rate must be >= 0"),
});

const createInvoiceDialogSchema = z.object({
  lineItems: z.array(dialogLineItemSchema).min(1, "Add at least one line item"),
  taxRate: z.number().min(0).max(100),
  discount: z.number().min(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type CreateInvoiceDialogValues = z.infer<typeof createInvoiceDialogSchema>;

const DIALOG_DEFAULT_VALUES: CreateInvoiceDialogValues = {
  lineItems: [{ description: "", quantity: 1, rate: 0 }],
  taxRate: 18,
  discount: 0,
  dueDate: "",
  notes: "",
};

interface DialogLineItemErrors {
  description?: string;
  quantity?: string;
  rate?: string;
}

interface DialogLineItemRowProps {
  idx: number;
  amount: number;
  register: UseFormRegister<CreateInvoiceDialogValues>;
  errors: DialogLineItemErrors;
  disabled: boolean;
  onRemove: (idx: number) => void;
}

function DialogLineItemRow({
  idx,
  amount,
  register,
  errors,
  disabled,
  onRemove,
}: DialogLineItemRowProps) {
  function handleRemove() {
    onRemove(idx);
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-5 space-y-1">
        <Input
          className="h-9 text-sm"
          placeholder="Description"
          {...register(`lineItems.${idx}.description`)}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description}</p>
        )}
      </div>
      <div className="col-span-2 space-y-1">
        <Input
          className="h-9 text-sm text-right"
          type="number"
          placeholder="Qty"
          {...register(`lineItems.${idx}.quantity`, { valueAsNumber: true })}
        />
        {errors.quantity && (
          <p className="text-xs text-destructive">{errors.quantity}</p>
        )}
      </div>
      <div className="col-span-2 space-y-1">
        <Input
          className="h-9 text-sm text-right"
          type="number"
          placeholder="Rate"
          {...register(`lineItems.${idx}.rate`, { valueAsNumber: true })}
        />
        {errors.rate && (
          <p className="text-xs text-destructive">{errors.rate}</p>
        )}
      </div>
      <div className="col-span-2 text-sm font-medium text-right pr-1 pt-2">
        {formatCurrencyFull(amount)}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="col-span-1 h-8 w-8"
        onClick={handleRemove}
        disabled={disabled}
        aria-label="Remove line item"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

function CreateInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createInvoice = useCreateInvoice();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateInvoiceDialogValues>({
    resolver: zodResolver(createInvoiceDialogSchema),
    defaultValues: DIALOG_DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });
  const watchedItems = watch("lineItems");
  const watchedTaxRate = watch("taxRate");
  const watchedDiscount = watch("discount");

  const subtotal = (watchedItems ?? []).reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0,
  );
  const taxAmount = subtotal * ((Number(watchedTaxRate) || 0) / 100);
  const total = subtotal + taxAmount - (Number(watchedDiscount) || 0);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) reset(DIALOG_DEFAULT_VALUES);
    onOpenChange(isOpen);
  }

  function handleAddLineItem() {
    append({ description: "", quantity: 1, rate: 0 });
  }

  function handleCancel() {
    onOpenChange(false);
    reset(DIALOG_DEFAULT_VALUES);
  }

  function onSubmit(values: CreateInvoiceDialogValues) {
    const lineItemsPayload = values.lineItems.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Math.round(Number(item.quantity) * Number(item.rate) * 100) / 100,
    }));
    createInvoice.mutate(
      {
        lineItems: lineItemsPayload,
        taxRate: Number(values.taxRate),
        discount: Number(values.discount) || 0,
        dueDate: values.dueDate || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset(DIALOG_DEFAULT_VALUES);
          toast.success("Invoice created");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Line Items
            </Label>
            <div className="space-y-2">
              {fields.map((field, idx) => {
                const lineAmount =
                  (Number(watchedItems?.[idx]?.quantity) || 0) *
                  (Number(watchedItems?.[idx]?.rate) || 0);
                return (
                  <DialogLineItemRow
                    key={field.id}
                    idx={idx}
                    amount={lineAmount}
                    register={register}
                    errors={{
                      description:
                        errors.lineItems?.[idx]?.description?.message,
                      quantity: errors.lineItems?.[idx]?.quantity?.message,
                      rate: errors.lineItems?.[idx]?.rate?.message,
                    }}
                    disabled={fields.length === 1}
                    onRemove={remove}
                  />
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
              {errors.lineItems &&
                typeof errors.lineItems.message === "string" && (
                  <p className="text-xs text-destructive">
                    {errors.lineItems.message}
                  </p>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input
                type="number"
                className="h-9 mt-1"
                {...register("taxRate", { valueAsNumber: true })}
              />
              {errors.taxRate && (
                <p className="text-xs text-destructive mt-0.5">
                  {errors.taxRate.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Discount</Label>
              <Input
                type="number"
                className="h-9 mt-1"
                {...register("discount", { valueAsNumber: true })}
              />
              {errors.discount && (
                <p className="text-xs text-destructive mt-0.5">
                  {errors.discount.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Due Date</Label>
            <Controller
              control={control}
              name="dueDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select due date"
                />
              )}
            />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              placeholder="Payment terms, bank details, etc."
              className="h-9 mt-1"
              {...register("notes")}
            />
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyFull(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax ({Number(watchedTaxRate) || 0}%)
              </span>
              <span>{formatCurrencyFull(taxAmount)}</span>
            </div>
            {(Number(watchedDiscount) || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">
                  -{formatCurrencyFull(Number(watchedDiscount))}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>Total</span>
              <span>{formatCurrencyFull(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <FileText className="h-4 w-4 mr-1" />
              )}
              Create Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
