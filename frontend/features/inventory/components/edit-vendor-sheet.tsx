"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppSheet } from "@/components/shared/app-sheet";
import { useUpdateVendor } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import { VendorFormFields } from "@/features/inventory/components/vendor-form-fields";
import { vendorEditSchema, type VendorEditFormValues } from "@/features/inventory/lib/vendor-schema";
import type { InventoryVendor, UpdateVendorInput } from "@/types/inventory";

const FORM_ID = "edit-vendor-form";

interface EditVendorSheetProps {
  vendor: InventoryVendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVendorSheet({ vendor, open, onOpenChange }: EditVendorSheetProps) {
  const updateMutation = useUpdateVendor(vendor.id);

  const vendorDefaults: VendorEditFormValues = {
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

  const form = useForm<VendorEditFormValues>({
    resolver: zodResolver(vendorEditSchema),
    defaultValues: vendorDefaults,
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset(vendorDefaults);
    onOpenChange(nextOpen);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  async function onSubmit(values: VendorEditFormValues): Promise<void> {
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
            form={FORM_ID}
            size="sm"
            isPending={updateMutation.isPending}
            loadingText="Saving…"
          >
            Save
          </LoadingButton>
        </div>
      }
    >
      <VendorFormFields
        form={form}
        formId={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit)}
        showIsActive
      />
    </AppSheet>
  );
}
