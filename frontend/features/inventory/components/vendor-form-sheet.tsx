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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppSheet } from "@/components/shared/app-sheet";
import { useCreateVendor } from "@/hooks/api/inventory";
import type { CreateVendorInput } from "@/types/inventory";
import { getErrorMessage } from "@/lib/get-error-message";

const VENDOR_NAME_RE = /^[A-Za-z][A-Za-z0-9 &.,\-'()]+$/;
const VENDOR_CODE_RE = /^[A-Z0-9_-]+$/i;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const vendorSchema = z.object({
  name: z
    .string()
    .min(2, "Vendor name must be at least 2 characters")
    .max(255, "Vendor name must be at most 255 characters")
    .refine((v) => VENDOR_NAME_RE.test(v.trim()), {
      message: "Name must start with a letter and contain only letters, numbers, spaces, & . , - ' ()",
    }),
  code: z
    .string()
    .max(50, "Code must be at most 50 characters")
    .refine((v) => !v || VENDOR_CODE_RE.test(v.trim()), {
      message: "Code may only contain letters, numbers, hyphens, and underscores",
    })
    .optional()
    .or(z.literal("")),
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
    })
    .refine((v) => !v || v.trim().length === 15, {
      message: "GSTIN must be exactly 15 characters",
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
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface VendorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorFormSheet({ open, onOpenChange }: VendorFormSheetProps) {
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
      code: (typeof values.code === "string" ? values.code.trim() : "") || undefined,
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
      address: values.address.trim() || undefined,
      gstin: values.gstin.trim().toUpperCase() || undefined,
      leadTimeDays: parseInt(values.leadTimeDays, 10) || 7,
      paymentTermsDays: parseInt(values.paymentTermsDays, 10) || 30,
      currency: values.currency.trim().toUpperCase() || "INR",
      notes: values.notes.trim() || undefined,
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success(`Vendor "${payload.name}" created`);
      handleClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
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
          <LoadingButton
            type="submit"
            form="create-vendor-form"
            size="sm"
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            Create vendor
          </LoadingButton>
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
