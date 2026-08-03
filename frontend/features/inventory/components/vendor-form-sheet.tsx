"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppSheet } from "@/components/shared/app-sheet";
import { useCreateVendor } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import { VendorFormFields } from "@/features/inventory/components/vendor-form-fields";
import { vendorEditSchema, type VendorEditFormValues } from "@/features/inventory/lib/vendor-schema";

import type { CreateVendorInput } from "@/types/inventory";

const FORM_ID = "create-vendor-form";

interface VendorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorFormSheet({ open, onOpenChange }: VendorFormSheetProps) {
  const createMutation = useCreateVendor();

  const form = useForm<VendorEditFormValues>({
    resolver: zodResolver(vendorEditSchema),
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
      isActive: true,
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

  async function onSubmit(values: VendorEditFormValues): Promise<void> {
    const payload: CreateVendorInput = {
      name: values.name.trim(),
      code: values.code.trim() || undefined,
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
            form={FORM_ID}
            size="sm"
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            Create vendor
          </LoadingButton>
        </div>
      }
    >
      <VendorFormFields
        form={form}
        formId={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit)}
      />
    </AppSheet>
  );
}
