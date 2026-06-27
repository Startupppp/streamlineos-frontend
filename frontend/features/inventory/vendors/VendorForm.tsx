"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AppSheet } from "@/components/shared/app-sheet";
import { toast } from "sonner";
import { useCreateVendor, useUpdateVendor } from "@/lib/api/hooks/inventory";
import type { InventoryVendor } from "@/types/inventory";

const vendorFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  code: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(1000).optional().or(z.literal("")),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
      message: "Invalid GSTIN format",
    })
    .optional()
    .or(z.literal("")),
  leadTimeDays: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Must be a non-negative number"),
  paymentTermsDays: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Must be a non-negative number"),
  currency: z.string().min(1).max(10),
  notes: z.string().optional().or(z.literal("")),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface VendorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: InventoryVendor;
  onSuccess?: (vendor: InventoryVendor) => void;
}

export function VendorForm({ open, onOpenChange, vendor, onSuccess }: VendorFormProps) {
  const isEdit = !!vendor;
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor(vendor?.id ?? 0);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      code: "",
      email: "",
      phone: "",
      address: "",
      gstin: "",
      leadTimeDays: "0",
      paymentTermsDays: "30",
      currency: "INR",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        vendor
          ? {
              name: vendor.name,
              code: vendor.code ?? "",
              email: vendor.email ?? "",
              phone: vendor.phone ?? "",
              address: vendor.address ?? "",
              gstin: vendor.gstin ?? "",
              leadTimeDays: String(vendor.leadTimeDays),
              paymentTermsDays: String(vendor.paymentTermsDays),
              currency: vendor.currency,
              notes: vendor.notes ?? "",
            }
          : {
              name: "",
              code: "",
              email: "",
              phone: "",
              address: "",
              gstin: "",
              leadTimeDays: "0",
              paymentTermsDays: "30",
              currency: "INR",
              notes: "",
            },
      );
    }
  }, [open, vendor, form]);

  function handleSubmit(values: VendorFormValues) {
    const payload = {
      name: values.name,
      code: values.code || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      gstin: values.gstin || undefined,
      leadTimeDays: values.leadTimeDays === "" ? undefined : Number(values.leadTimeDays),
      paymentTermsDays: values.paymentTermsDays === "" ? undefined : Number(values.paymentTermsDays),
      currency: values.currency,
      notes: values.notes || undefined,
    };

    if (isEdit) {
      updateVendor.mutate(payload, {
        onSuccess: (updated) => {
          toast.success("Vendor updated");
          onOpenChange(false);
          onSuccess?.(updated);
        },
        onError: () => toast.error("Failed to update vendor"),
      });
    } else {
      createVendor.mutate(payload, {
        onSuccess: (created) => {
          toast.success("Vendor created");
          onOpenChange(false);
          onSuccess?.(created);
        },
        onError: () => toast.error("Failed to create vendor"),
      });
    }
  }

  const isPending = createVendor.isPending || updateVendor.isPending;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Vendor" : "New Vendor"}
      description={
        isEdit
          ? "Update vendor details and payment terms."
          : "Add a new supplier or vendor to your organization."
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="vendor-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEdit ? "Save Changes" : "Create Vendor"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="vendor-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Supplies Pvt Ltd" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. VND-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="vendor@example.com" {...field} />
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
                    <Input type="tel" placeholder="+91 98765 43210" {...field} />
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
                  <Textarea
                    placeholder="Full business address"
                    className="min-h-[72px] resize-none"
                    {...field}
                  />
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
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="font-mono uppercase"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="7" {...field} />
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
                  <FormLabel>Payment Terms (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="30" {...field} />
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
                    <Input placeholder="INR" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional notes about this vendor"
                    className="min-h-[64px] resize-none"
                    {...field}
                  />
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
