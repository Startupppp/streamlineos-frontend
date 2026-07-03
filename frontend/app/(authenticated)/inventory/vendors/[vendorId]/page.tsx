"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Pencil, Package } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppSheet } from "@/components/shared/app-sheet";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useVendor, useVendorPurchaseOrders, useUpdateVendor } from "@/hooks/api/inventory";
import type { InventoryVendor, PurchaseOrderStatus, UpdateVendorInput } from "@/types/inventory";

interface VendorDetailPageProps {
  params: Promise<{ vendorId: string }>;
}

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const editVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  code: z.string(),
  email: z.string().refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
    { message: "Invalid email address" },
  ),
  phone: z.string(),
  address: z.string(),
  gstin: z.string().max(15, "GSTIN must be at most 15 characters"),
  leadTimeDays: z.string(),
  paymentTermsDays: z.string(),
  currency: z.string().min(1, "Currency is required").max(3),
  notes: z.string(),
  isActive: z.boolean(),
});

type EditVendorFormValues = z.infer<typeof editVendorSchema>;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0", STATUS_BADGE[status])}>
      {status}
    </Badge>
  );
}

function EditVendorSheet({
  vendor,
  open,
  onOpenChange,
}: {
  vendor: InventoryVendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMutation = useUpdateVendor(vendor.id);

  const form = useForm<EditVendorFormValues>({
    resolver: zodResolver(editVendorSchema),
    defaultValues: {
      name: vendor.name,
      code: vendor.code,
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      address: vendor.address ?? "",
      gstin: vendor.gstin ?? "",
      leadTimeDays: String(vendor.leadTimeDays),
      paymentTermsDays: String(vendor.paymentTermsDays),
      currency: vendor.currency,
      notes: vendor.notes ?? "",
      isActive: vendor.isActive,
    },
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.reset({
        name: vendor.name,
        code: vendor.code,
        email: vendor.email ?? "",
        phone: vendor.phone ?? "",
        address: vendor.address ?? "",
        gstin: vendor.gstin ?? "",
        leadTimeDays: String(vendor.leadTimeDays),
        paymentTermsDays: String(vendor.paymentTermsDays),
        currency: vendor.currency,
        notes: vendor.notes ?? "",
        isActive: vendor.isActive,
      });
    }
    onOpenChange(nextOpen);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  async function onSubmit(values: EditVendorFormValues): Promise<void> {
    const payload: UpdateVendorInput = {
      name: values.name.trim(),
      code: values.code.trim() || undefined,
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
      address: values.address.trim() || undefined,
      gstin: values.gstin.trim().toUpperCase() || undefined,
      leadTimeDays: Number(values.leadTimeDays) || vendor.leadTimeDays,
      paymentTermsDays: Number(values.paymentTermsDays) || vendor.paymentTermsDays,
      currency: values.currency.trim().toUpperCase() || vendor.currency,
      notes: values.notes.trim() || undefined,
      isActive: values.isActive,
    };
    try {
      await updateMutation.mutateAsync(payload);
      toast.success("Vendor updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update vendor");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit Vendor"
      description="Update supplier details for inventory purchase orders."
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-vendor-form"
            size="sm"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="edit-vendor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Supplies" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-generated" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="INR" maxLength={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="orders@supplier.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <PhoneInput defaultCountry="IN" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gstin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GSTIN</FormLabel>
                <FormControl>
                  <Input placeholder="15-char GSTIN" maxLength={15} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead time (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentTermsDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment terms (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Street, city, state, PIN" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Any internal notes" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <FormLabel className="mb-0 cursor-pointer">Active</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { vendorId } = use(params);
  const id = parseInt(vendorId, 10);
  const [editOpen, setEditOpen] = useState<boolean>(false);

  const vendorQuery = useVendor(id);
  const posQuery = useVendorPurchaseOrders(id);

  function handleVendorRetry(): void {
    void vendorQuery.refetch();
  }

  function handlePosRetry(): void {
    void posQuery.refetch();
  }

  function handleEditOpen(): void {
    setEditOpen(true);
  }

  if (vendorQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorQuery.error) return <ErrorState description={vendorQuery.error.message} onRetry={handleVendorRetry} />;
  if (!vendorQuery.data) return <ErrorState title="Not found" description={`Vendor #${vendorId}`} />;

  const vendor = vendorQuery.data;
  const poItems = posQuery.data?.items ?? [];

  return (
    <>
      <PageWrapper
        eyebrow="Inventory / Vendors"
        title={vendor.name}
        subtitle={`${vendor.code} · ${vendor.currency}`}
        backHref="/inventory/vendors"
        actions={
          <Button size="sm" variant="outline" onClick={handleEditOpen}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        }
      >
        <div className="space-y-4">
          <Card className="p-4">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={vendor.isActive ? "default" : "secondary"} className="h-4 text-[9px] px-1.5 py-0">
                  {vendor.isActive ? "Active" : "Inactive"}
                </Badge>
              </dd>
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-mono text-xs">{vendor.code}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{vendor.email ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{vendor.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">GSTIN</dt>
              <dd className="font-mono text-xs">{vendor.gstin ?? "—"}</dd>
              <dt className="text-muted-foreground">Currency</dt>
              <dd>{vendor.currency}</dd>
              <dt className="text-muted-foreground">Lead time</dt>
              <dd className="font-mono tabular-nums text-[13px]">{vendor.leadTimeDays} days</dd>
              <dt className="text-muted-foreground">Payment terms</dt>
              <dd className="font-mono tabular-nums text-[13px]">Net {vendor.paymentTermsDays}</dd>
              {vendor.address && (
                <>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="col-span-3 whitespace-pre-line">{vendor.address}</dd>
                </>
              )}
              {vendor.notes && (
                <>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="col-span-3">{vendor.notes}</dd>
                </>
              )}
            </dl>
          </Card>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Purchase Orders</h2>
              <Button size="sm" asChild>
                <Link href={`/inventory/purchase-orders/new?vendorId=${vendor.id}`}>
                  New PO
                </Link>
              </Button>
            </div>

            {posQuery.isLoading && <LoadingState variant="table" rows={4} />}
            {posQuery.error && <ErrorState description={posQuery.error.message} onRetry={handlePosRetry} compact />}

            {!posQuery.isLoading && !posQuery.error && poItems.length === 0 && (
              <EmptyState
                illustration={<Package className="h-8 w-8 text-muted-foreground/40" />}
                title="No purchase orders"
                description="Create a purchase order for this vendor."
                action={{ label: "New PO", href: `/inventory/purchase-orders/new?vendorId=${vendor.id}` }}
                compact
              />
            )}

            {poItems.length > 0 && (
              <Card className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">PO #</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Order date</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Expected delivery</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Total</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((po) => (
                      <TableRow key={po.id} className="h-8 hover:bg-muted/30 transition-colors">
                        <TableCell className="px-2 py-1 font-mono text-[11px]">
                          <Link
                            href={`/inventory/purchase-orders/${po.id}`}
                            className="text-blue-600 hover:underline transition-colors"
                          >
                            {po.poNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="px-2 py-1 font-mono tabular-nums text-[11px]">{formatDate(po.orderDate)}</TableCell>
                        <TableCell className="px-2 py-1 font-mono tabular-nums text-[11px]">{formatDate(po.expectedDeliveryDate)}</TableCell>
                        <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                          {po.currency} {Number(po.total).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <StatusBadge status={po.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </div>
      </PageWrapper>

      <EditVendorSheet vendor={vendor} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
