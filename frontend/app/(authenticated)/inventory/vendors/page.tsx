"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { AppSheet } from "@/components/shared/app-sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useVendors, useCreateVendor } from "@/hooks/api/inventory";
import type { InventoryVendor, CreateVendorInput } from "@/types/inventory";

const vendorSchema = z.object({
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
});

type VendorFormValues = z.infer<typeof vendorSchema>;

function VendorFormSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateVendor();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      code: "",
      email: "",
      phone: "",
      address: "",
      gstin: "",
      leadTimeDays: "7",
      paymentTermsDays: "30",
      currency: "INR",
      notes: "",
    },
  });

  function handleClose(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: VendorFormValues): Promise<void> {
    const payload: CreateVendorInput = {
      name: values.name.trim(),
      code: values.code.trim() || undefined,
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
      address: values.address.trim() || undefined,
      gstin: values.gstin.trim().toUpperCase() || undefined,
      leadTimeDays: Number(values.leadTimeDays) || 7,
      paymentTermsDays: Number(values.paymentTermsDays) || 30,
      currency: values.currency.trim().toUpperCase() || "INR",
      notes: values.notes.trim() || undefined,
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success(`Vendor "${payload.name}" created`);
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create vendor");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="New Vendor"
      description="Add a supplier for inventory purchase orders."
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-vendor-form"
            size="sm"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create vendor"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="create-vendor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        </form>
      </Form>
    </AppSheet>
  );
}

export default function VendorsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  const search = searchParams.get("search") ?? "";

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("search", e.target.value);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function handleNewVendor(): void {
    setSheetOpen(true);
  }

  const query = useVendors({ page: 1, limit: 100, search: search || undefined });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  function handleRetry(): void {
    void query.refetch();
  }

  const columns: DataTableColumn<InventoryVendor>[] = [
    {
      key: "name",
      header: "Name",
      cell: (v) => (
        <Link
          href={`/inventory/vendors/${v.id}`}
          className="font-medium text-blue-600 hover:underline transition-colors"
        >
          {v.name}
        </Link>
      ),
      sortable: true,
      sortValue: (v) => v.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (v) => <span className="font-mono text-[11px]">{v.code}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (v) => v.email ?? "—",
    },
    {
      key: "leadTimeDays",
      header: "Lead time",
      cell: (v) => <span className="font-mono tabular-nums">{v.leadTimeDays} days</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "paymentTermsDays",
      header: "Payment terms",
      cell: (v) => <span className="font-mono tabular-nums">Net {v.paymentTermsDays}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => (
        <Badge
          variant="outline"
          className={cn(
            "h-4 text-[9px] px-1.5 py-0",
            v.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-700 border-slate-200",
          )}
        >
          {v.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
      <div className="relative min-w-0 flex-1 lg:max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search vendors…"
          className="h-8 w-full min-w-0 pl-8 text-xs"
        />
      </div>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Vendors"
      subtitle={query.data ? `${total} ${total === 1 ? "vendor" : "vendors"}` : "Suppliers for inventory purchase orders."}
      actions={
        <Button size="sm" onClick={handleNewVendor}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New vendor
        </Button>
      }
      filters={filterBar}
    >
      <DataTable
        data={items}
        columns={columns}
        getRowKey={(v) => v.id}
        isLoading={query.isLoading}
        emptyState={
          query.error ? (
            <ErrorState description={query.error.message} onRetry={handleRetry} compact />
          ) : (
            <EmptyState
              title={search ? "No vendors found" : "No vendors yet"}
              description={search ? "No results match your search." : "Add a supplier to start creating purchase orders."}
              action={search ? { label: "Clear search", onClick: () => { const params = new URLSearchParams(); router.replace(`?${params.toString()}`, { scroll: false }); } } : { label: "New vendor", onClick: handleNewVendor }}
              compact
            />
          )
        }
        minWidth="640px"
        className="min-h-[320px]"
      />

      <VendorFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
