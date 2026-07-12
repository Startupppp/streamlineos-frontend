"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppSheet } from "@/components/shared/app-sheet";
import { useUpdateVendor } from "@/hooks/api/inventory";
import type { InventoryVendor, UpdateVendorInput } from "@/types/inventory";
import { getErrorMessage } from "@/lib/get-error-message";

const VENDOR_NAME_RE = /^[A-Za-z][A-Za-z0-9 &.,\-'()]+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const editVendorSchema = z.object({
  name: z
    .string()
    .min(2, "Vendor name must be at least 2 characters")
    .max(255, "Vendor name must be at most 255 characters")
    .refine((v) => VENDOR_NAME_RE.test(v.trim()), {
      message: "Name must start with a letter and contain only letters, numbers, spaces, & . , - ' ()",
    }),
  code: z.string().max(50, "Code must be at most 50 characters"),
  email: z.string().refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
    { message: "Invalid email address" },
  ),
  phone: z.string().max(30, "Phone must be at most 30 characters"),
  address: z.string().max(500, "Address must be at most 500 characters"),
  gstin: z
    .string()
    .refine((v) => !v || GSTIN_RE.test(v.trim().toUpperCase()), {
      message: "Invalid GSTIN format (must be 15 characters, e.g. 22AAAAA0000A1Z5)",
    }),
  leadTimeDays: z
    .string()
    .refine((v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n >= 0 && n <= 365; }, {
      message: "Lead time must be between 0 and 365 days",
    }),
  paymentTermsDays: z
    .string()
    .refine((v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n >= 0 && n <= 365; }, {
      message: "Payment terms must be between 0 and 365 days",
    }),
  currency: z.string().min(1, "Currency is required").max(3, "Currency must be 3 characters"),
  notes: z.string().max(2000, "Notes must be at most 2000 characters"),
  isActive: z.boolean(),
});

type EditVendorFormValues = z.infer<typeof editVendorSchema>;

interface EditVendorSheetProps {
  vendor: InventoryVendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVendorSheet({ vendor, open, onOpenChange }: EditVendorSheetProps) {
  const updateMutation = useUpdateVendor(vendor.id);

  const vendorDefaults: EditVendorFormValues = {
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
  };

  const form = useForm<EditVendorFormValues>({
    resolver: zodResolver(editVendorSchema),
    defaultValues: vendorDefaults,
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset(vendorDefaults);
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
      leadTimeDays: parseInt(values.leadTimeDays, 10) || vendor.leadTimeDays,
      paymentTermsDays: parseInt(values.paymentTermsDays, 10) || vendor.paymentTermsDays,
      currency: values.currency.trim().toUpperCase() || vendor.currency,
      notes: values.notes.trim() || undefined,
      isActive: values.isActive,
    };
    try {
      await updateMutation.mutateAsync(payload);
      toast.success("Vendor updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
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
          <LoadingButton
            type="submit"
            form="edit-vendor-form"
            size="sm"
            isPending={updateMutation.isPending}
            loadingText="Saving…"
          >
            Save
          </LoadingButton>
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
                  <Input
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className="uppercase"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
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
                    <Input type="number" min="0" max="365" {...field} />
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
                    <Input type="number" min="0" max="365" {...field} />
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
