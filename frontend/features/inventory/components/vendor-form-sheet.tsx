"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppSheet } from "@/components/shared/app-sheet";
import { useCreateVendor } from "@/hooks/api/inventory";
import type { CreateVendorInput } from "@/types/inventory";
import { getErrorMessage } from "@/lib/get-error-message";

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
